import { json } from '@sveltejs/kit';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PUBLIC_WRITE_PASSWORD } from '$env/static/public';
import { dev } from '$app/environment';

// In production, files are in build/client/gpx, in dev they're in static/gpx
const LIBRARY_DIR = dev ? 'static/gpx' : 'build/client/gpx';
const DB_FILE = path.join(LIBRARY_DIR, 'library.json');

type LibraryItem = {
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
    customName?: string;
    category?: 'cycling' | 'running';
    isRace?: boolean;
    raceStartDate?: string;
    raceEndDate?: string;
    raceWebpage?: string;
    raceTips?: string;
    raceResultsUrl?: string;
    raceTrackerUrl?: string;
    image?: string;
    imageSize?: 'small' | 'medium' | 'large';
    mediaLinks?: {
        id: string;
        type: 'story' | 'movie';
        url: string;
        title?: string;
    }[];
    distance?: number;
    elevation?: number;
    country?: string;
};

async function readDb(): Promise<LibraryItem[]> {
    try {
        const data = await fs.readFile(DB_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

async function writeDb(data: LibraryItem[]) {
    await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
}

function checkWriteAuth(request: Request): boolean {
    if (!PUBLIC_WRITE_PASSWORD) return true;
    const authHeader = request.headers.get('X-Access-Password');
    return authHeader === PUBLIC_WRITE_PASSWORD;
}

// Haversine formula to calculate distance between two points
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
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

function parseGpxStats(gpxContent: string) {
    let totalDistance = 0;
    let totalElevation = 0;

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

    for (let i = 1; i < points.length; i++) {
        totalDistance += haversineDistance(
            points[i - 1].lat,
            points[i - 1].lon,
            points[i].lat,
            points[i].lon
        );

        if (points[i].ele !== null && points[i - 1].ele !== null) {
            const elevDiff = points[i].ele! - points[i - 1].ele!;
            if (elevDiff > 0) {
                totalElevation += elevDiff;
            }
        }
    }

    return {
        distance: Math.round(totalDistance * 10) / 10,
        elevation: Math.round(totalElevation),
        firstPoint: points.length > 0 ? { lat: points[0].lat, lon: points[0].lon } : null,
    };
}

// Get country from coordinates using Nominatim reverse geocoding
async function getCountryFromCoordinates(lat: number, lon: number): Promise<string | undefined> {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=3`,
            {
                headers: {
                    'User-Agent': 'GPX-Studio-Library/1.0',
                },
            }
        );

        if (!response.ok) return undefined;

        const data = await response.json();
        return data.address?.country;
    } catch {
        return undefined;
    }
}

export async function POST({ request }) {
    if (!checkWriteAuth(request)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const itemId = formData.get('itemId') as string;

    if (!file || file.size === 0) {
        return json({ error: 'No file provided' }, { status: 400 });
    }

    if (!itemId) {
        return json({ error: 'No item ID provided' }, { status: 400 });
    }

    const db = await readDb();
    const index = db.findIndex((item) => item.id === itemId);

    if (index === -1) {
        return json({ error: 'Item not found' }, { status: 404 });
    }

    // Delete old file if exists
    if (db[index].filename) {
        try {
            await fs.unlink(path.join(LIBRARY_DIR, db[index].filename));
        } catch {
            // File might not exist, that's ok
        }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const gpxContent = buffer.toString('utf-8');

    // Sanitize filename
    const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const uniqueName = `${Date.now()}_${safeName}`;
    const filePath = path.join(LIBRARY_DIR, uniqueName);

    await fs.writeFile(filePath, buffer);

    // Parse GPX stats
    const stats = parseGpxStats(gpxContent);

    // Update item
    db[index].filename = uniqueName;
    db[index].distance = stats.distance;
    db[index].elevation = stats.elevation;

    // Get country from first point
    if (stats.firstPoint) {
        db[index].country = await getCountryFromCoordinates(
            stats.firstPoint.lat,
            stats.firstPoint.lon
        );
    }

    await writeDb(db);

    return json({ item: db[index] });
}
