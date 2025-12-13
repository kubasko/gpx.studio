import { json } from '@sveltejs/kit';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PUBLIC_READ_PASSWORD, PUBLIC_WRITE_PASSWORD } from '$env/static/public';
import { dev } from '$app/environment';

const LIBRARY_DIR = dev ? 'static/gpx' : 'build/client/gpx';
const DB_FILE = path.join(LIBRARY_DIR, 'library.json');

// Check if request has write access
function checkWriteAuth(request: Request): boolean {
    if (!PUBLIC_READ_PASSWORD && !PUBLIC_WRITE_PASSWORD) return true;
    const authHeader = request.headers.get('X-Access-Password');
    return authHeader === PUBLIC_WRITE_PASSWORD;
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

// Ensure directory exists
async function ensureDir() {
    try {
        await fs.access(LIBRARY_DIR);
    } catch {
        await fs.mkdir(LIBRARY_DIR, { recursive: true });
    }
}

// POST: Save GPX file to library (new or overwrite)
export async function POST({ request }) {
    if (!checkWriteAuth(request)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const gpxContent = formData.get('content') as string;
        const filename = formData.get('filename') as string;
        const itemId = formData.get('itemId') as string | null; // Optional: for overwriting existing
        const mode = formData.get('mode') as string; // 'overwrite' or 'new'

        if (!gpxContent || !filename) {
            return json({ error: 'Missing content or filename' }, { status: 400 });
        }

        await ensureDir();
        const db = await readDb();

        if (mode === 'overwrite' && itemId) {
            // Find existing item and overwrite the file
            const index = db.findIndex((item: any) => item.id === itemId);
            if (index === -1) {
                return json({ error: 'Library item not found' }, { status: 404 });
            }

            const existingFilename = db[index].filename;
            const filePath = path.join(LIBRARY_DIR, existingFilename);

            // Write the new content to the existing file
            await fs.writeFile(filePath, gpxContent, 'utf-8');

            // Update the date
            db[index].date = new Date().toISOString();
            await writeDb(db);

            return json({
                success: true,
                mode: 'overwrite',
                item: db[index],
            });
        } else {
            // Create new file
            const safeName = filename.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
            const uniqueName = `${Date.now()}_${safeName}`;
            const filePath = path.join(LIBRARY_DIR, uniqueName);

            await fs.writeFile(filePath, gpxContent, 'utf-8');

            const newItem = {
                id: crypto.randomUUID(),
                name: filename,
                filename: uniqueName,
                tags: [],
                date: new Date().toISOString(),
            };

            db.push(newItem);
            await writeDb(db);

            return json({
                success: true,
                mode: 'new',
                item: newItem,
            });
        }
    } catch (error) {
        console.error('Save to library error:', error);
        return json({ error: 'Failed to save file' }, { status: 500 });
    }
}
