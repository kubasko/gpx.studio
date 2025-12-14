import { json } from '@sveltejs/kit';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PUBLIC_READ_PASSWORD, PUBLIC_WRITE_PASSWORD } from '$env/static/public';
import { building, dev } from '$app/environment';

// In production, files are in build/client/gpx, in dev they're in static/gpx
const LIBRARY_DIR = dev ? 'static/gpx' : 'build/client/gpx';
const DB_FILE = path.join(LIBRARY_DIR, 'library.json');

export type MediaLink = {
    id: string;
    type: 'story' | 'movie';
    url: string;
    title?: string;
};

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
    raceResultsUrl?: string;
    raceTrackerUrl?: string;
    // Image filename (stored in /static/gpx/images/)
    image?: string;
    // Image display size on cards
    imageSize?: 'small' | 'medium' | 'large';
    // Media links (stories, movies)
    mediaLinks?: MediaLink[];
    // GPX stats
    distance?: number; // Distance in km
    elevation?: number; // Total elevation gain in m
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

// Haversine formula to calculate distance between two points
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Parse GPX content and extract distance and elevation
function parseGpxStats(gpxContent: string): { distance: number; elevation: number } {
    let totalDistance = 0;
    let totalElevation = 0;

    // Simple regex-based parsing for track points
    const trkptRegex = /<trkpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>[\s\S]*?<\/trkpt>/g;
    const eleRegex = /<ele>([^<]+)<\/ele>/;

    const points: { lat: number; lon: number; ele: number | null }[] = [];
    let match;

    while ((match = trkptRegex.exec(gpxContent)) !== null) {
        const lat = parseFloat(match[1]);
        const lon = parseFloat(match[2]);
        const eleMatch = match[0].match(eleRegex);
        const ele = eleMatch ? parseFloat(eleMatch[1]) : null;
        points.push({ lat, lon, ele });
    }

    // Also try lon/lat order (some GPX files use this)
    if (points.length === 0) {
        const trkptRegex2 = /<trkpt[^>]*lon="([^"]+)"[^>]*lat="([^"]+)"[^>]*>[\s\S]*?<\/trkpt>/g;
        while ((match = trkptRegex2.exec(gpxContent)) !== null) {
            const lon = parseFloat(match[1]);
            const lat = parseFloat(match[2]);
            const eleMatch = match[0].match(eleRegex);
            const ele = eleMatch ? parseFloat(eleMatch[1]) : null;
            points.push({ lat, lon, ele });
        }
    }

    // Calculate distance and elevation
    for (let i = 1; i < points.length; i++) {
        // Distance
        totalDistance += haversineDistance(
            points[i - 1].lat,
            points[i - 1].lon,
            points[i].lat,
            points[i].lon
        );

        // Elevation gain (only positive)
        if (points[i].ele !== null && points[i - 1].ele !== null) {
            const elevDiff = points[i].ele! - points[i - 1].ele!;
            if (elevDiff > 0) {
                totalElevation += elevDiff;
            }
        }
    }

    return {
        distance: Math.round(totalDistance * 10) / 10, // Round to 1 decimal
        elevation: Math.round(totalElevation),
    };
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
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string;
    const tags = JSON.parse((formData.get('tags') as string) || '[]');

    if (!name || !name.trim()) {
        return json({ error: 'Name is required' }, { status: 400 });
    }

    await ensureDir();

    let filename: string | undefined;
    let distance: number | undefined;
    let elevation: number | undefined;

    // Handle GPX file if provided
    if (file && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const gpxContent = buffer.toString('utf-8');

        // Sanitize filename
        const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const uniqueName = `${Date.now()}_${safeName}`;
        const filePath = path.join(LIBRARY_DIR, uniqueName);

        await fs.writeFile(filePath, buffer);

        // Parse GPX stats
        const stats = parseGpxStats(gpxContent);
        filename = uniqueName;
        distance = stats.distance;
        elevation = stats.elevation;
    }

    const newItem: LibraryItem = {
        id: crypto.randomUUID(),
        name: name.trim(),
        filename: filename || '',
        tags,
        date: new Date().toISOString(),
        customName: name.trim(),
        distance,
        elevation,
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
        raceResultsUrl,
        raceTrackerUrl,
        imageSize,
        mediaLinks,
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
    if (raceResultsUrl !== undefined) {
        if (raceResultsUrl && raceResultsUrl.trim()) {
            try {
                new URL(raceResultsUrl);
                db[index].raceResultsUrl = raceResultsUrl;
            } catch {
                db[index].raceResultsUrl = undefined;
            }
        } else {
            db[index].raceResultsUrl = undefined;
        }
    }
    if (raceTrackerUrl !== undefined) {
        if (raceTrackerUrl && raceTrackerUrl.trim()) {
            try {
                new URL(raceTrackerUrl);
                db[index].raceTrackerUrl = raceTrackerUrl;
            } catch {
                db[index].raceTrackerUrl = undefined;
            }
        } else {
            db[index].raceTrackerUrl = undefined;
        }
    }
    if (imageSize !== undefined) db[index].imageSize = imageSize;
    if (mediaLinks !== undefined) db[index].mediaLinks = mediaLinks;

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
