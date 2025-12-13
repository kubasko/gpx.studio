import { json } from '@sveltejs/kit';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PUBLIC_READ_PASSWORD, PUBLIC_WRITE_PASSWORD } from '$env/static/public';
import { building, dev } from '$app/environment';

// In production, files are in build/client/gpx, in dev they're in static/gpx
const LIBRARY_DIR = dev ? 'static/gpx' : 'build/client/gpx';
const DB_FILE = path.join(LIBRARY_DIR, 'library.json');

export type LibraryItem = {
    id: string;
    name: string;
    filename: string;
    tags: string[];
    description?: string;
    style?: {
        color?: string;
        opacity?: number;
        width?: number;
    };
    date: string;
    // Custom display name (available for all files)
    customName?: string;
    // Activity category
    category?: 'cycling' | 'running';
    // Race-specific attributes
    isRace?: boolean;
    raceStartDate?: string;
    raceEndDate?: string;
    raceWebpage?: string;
    raceTips?: string;
    // Image filename (stored in /static/gpx/images/)
    image?: string;
    // Image display size on cards
    imageSize?: 'small' | 'medium' | 'large';
};

// Ensure directory exists
async function ensureDir() {
    try {
        await fs.access(LIBRARY_DIR);
    } catch {
        await fs.mkdir(LIBRARY_DIR, { recursive: true });
    }
}

// Read database
async function readDb(): Promise<LibraryItem[]> {
    await ensureDir();
    try {
        const data = await fs.readFile(DB_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

// Write database
async function writeDb(data: LibraryItem[]) {
    await ensureDir();
    await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
}

export async function GET() {
    const items = await readDb();
    return json(items);
}

// Check if request has write access (for POST/PUT/DELETE)
function checkWriteAuth(request: Request): boolean {
    // No passwords configured = allow all
    if (!PUBLIC_READ_PASSWORD && !PUBLIC_WRITE_PASSWORD) return true;

    const authHeader = request.headers.get('X-Access-Password');
    return authHeader === PUBLIC_WRITE_PASSWORD;
}

export async function POST({ request }) {
    if (!checkWriteAuth(request)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const tags = JSON.parse((formData.get('tags') as string) || '[]');

    if (!file) {
        return json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Sanitize filename
    const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const uniqueName = `${Date.now()}_${safeName}`;
    const filePath = path.join(LIBRARY_DIR, uniqueName);

    await ensureDir();
    await fs.writeFile(filePath, buffer);

    const newItem: LibraryItem = {
        id: crypto.randomUUID(),
        name: file.name,
        filename: uniqueName,
        tags,
        date: new Date().toISOString(),
    };

    const db = await readDb();
    db.push(newItem);
    await writeDb(db);

    return json(newItem);
}

export async function PUT({ request }) {
    if (!checkWriteAuth(request)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
        id,
        tags,
        description,
        style,
        customName,
        category,
        isRace,
        raceStartDate,
        raceEndDate,
        raceWebpage,
        raceTips,
        imageSize,
    } = await request.json();

    if (!id) {
        return json({ error: 'Invalid data' }, { status: 400 });
    }

    const db = await readDb();
    const index = db.findIndex((item) => item.id === id);

    if (index === -1) {
        return json({ error: 'Item not found' }, { status: 404 });
    }

    if (tags !== undefined) db[index].tags = tags;
    if (description !== undefined) db[index].description = description;
    if (style !== undefined) db[index].style = { ...db[index].style, ...style };
    if (customName !== undefined) db[index].customName = customName;
    if (category !== undefined) db[index].category = category;
    if (isRace !== undefined) db[index].isRace = isRace;
    if (raceStartDate !== undefined) db[index].raceStartDate = raceStartDate;
    if (raceEndDate !== undefined) db[index].raceEndDate = raceEndDate;
    if (raceWebpage !== undefined) {
        // Validate URL if provided
        if (raceWebpage && raceWebpage.trim()) {
            try {
                new URL(raceWebpage);
                db[index].raceWebpage = raceWebpage;
            } catch {
                // Invalid URL, skip or clear
                db[index].raceWebpage = undefined;
            }
        } else {
            db[index].raceWebpage = undefined;
        }
    }
    if (raceTips !== undefined) db[index].raceTips = raceTips;
    if (imageSize !== undefined) db[index].imageSize = imageSize;

    await writeDb(db);

    return json(db[index]);
}

export async function DELETE({ request }) {
    if (!checkWriteAuth(request)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await request.json();

    if (!id) {
        return json({ error: 'Invalid data' }, { status: 400 });
    }

    const db = await readDb();
    const index = db.findIndex((item) => item.id === id);

    if (index === -1) {
        return json({ error: 'Item not found' }, { status: 404 });
    }

    const item = db[index];

    // Delete the file
    try {
        await fs.unlink(path.join(LIBRARY_DIR, item.filename));
    } catch {
        // File may not exist, continue anyway
    }

    // Remove from database
    db.splice(index, 1);
    await writeDb(db);

    return json({ success: true });
}
