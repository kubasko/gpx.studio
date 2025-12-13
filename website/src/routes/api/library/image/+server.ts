import { json } from '@sveltejs/kit';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PUBLIC_READ_PASSWORD, PUBLIC_WRITE_PASSWORD } from '$env/static/public';
import { dev } from '$app/environment';

const LIBRARY_DIR = dev ? 'static/gpx' : 'build/client/gpx';
const IMAGES_DIR = path.join(LIBRARY_DIR, 'images');
const DB_FILE = path.join(LIBRARY_DIR, 'library.json');

// Check if request has write access
function checkWriteAuth(request: Request): boolean {
    if (!PUBLIC_READ_PASSWORD && !PUBLIC_WRITE_PASSWORD) return true;
    const authHeader = request.headers.get('X-Access-Password');
    return authHeader === PUBLIC_WRITE_PASSWORD;
}

// Ensure images directory exists
async function ensureImagesDir() {
    try {
        await fs.access(IMAGES_DIR);
    } catch {
        await fs.mkdir(IMAGES_DIR, { recursive: true });
    }
}

// Read library database
async function readDb(): Promise<any[]> {
    try {
        const data = await fs.readFile(DB_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

// Write library database
async function writeDb(data: any[]) {
    await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
}

export async function POST({ request }) {
    if (!checkWriteAuth(request)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('image') as File;
        const itemId = formData.get('itemId') as string;

        if (!file || !itemId) {
            return json({ error: 'Missing image or itemId' }, { status: 400 });
        }

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            return json(
                { error: 'Invalid file type. Use JPEG, PNG, GIF, or WebP.' },
                { status: 400 }
            );
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return json({ error: 'File too large. Maximum 5MB.' }, { status: 400 });
        }

        await ensureImagesDir();

        // Generate unique filename with sanitized extension
        const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase();
        const timestamp = Date.now();
        const imageFilename = `${itemId}-${timestamp}.${ext}`;
        const imagePath = path.join(IMAGES_DIR, imageFilename);

        // Save the file
        const arrayBuffer = await file.arrayBuffer();
        await fs.writeFile(imagePath, Buffer.from(arrayBuffer));

        // Update the library database
        const db = await readDb();
        const index = db.findIndex((item: any) => item.id === itemId);

        if (index === -1) {
            // Delete the uploaded file if item not found
            await fs.unlink(imagePath);
            return json({ error: 'Library item not found' }, { status: 404 });
        }

        // Delete old image if exists
        if (db[index].image) {
            const oldImagePath = path.join(IMAGES_DIR, db[index].image);
            try {
                await fs.unlink(oldImagePath);
            } catch {
                // Ignore if old image doesn't exist
            }
        }

        // Update the item with new image
        db[index].image = imageFilename;
        await writeDb(db);

        return json({
            success: true,
            image: imageFilename,
            item: db[index],
        });
    } catch (error) {
        console.error('Image upload error:', error);
        return json({ error: 'Failed to upload image' }, { status: 500 });
    }
}

export async function DELETE({ request }) {
    if (!checkWriteAuth(request)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { itemId } = await request.json();

        if (!itemId) {
            return json({ error: 'Missing itemId' }, { status: 400 });
        }

        const db = await readDb();
        const index = db.findIndex((item: any) => item.id === itemId);

        if (index === -1) {
            return json({ error: 'Library item not found' }, { status: 404 });
        }

        // Delete the image file if exists
        if (db[index].image) {
            const imagePath = path.join(IMAGES_DIR, db[index].image);
            try {
                await fs.unlink(imagePath);
            } catch {
                // Ignore if image doesn't exist
            }
        }

        // Remove image from database
        db[index].image = undefined;
        await writeDb(db);

        return json({ success: true, item: db[index] });
    } catch (error) {
        console.error('Image delete error:', error);
        return json({ error: 'Failed to delete image' }, { status: 500 });
    }
}
