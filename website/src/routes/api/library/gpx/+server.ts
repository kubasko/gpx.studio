import { json } from '@sveltejs/kit';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PUBLIC_WRITE_PASSWORD } from '$env/static/public';
import { dev } from '$app/environment';
import { LIBRARY_DIR } from '$lib/server/config';

// In production, files are in build/client/gpx, in dev they're in static/gpx
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

interface Point {
    lat: number;
    lon: number;
    ele: number | null;
    dist: number; // accumulated distance in km
    index: number;
}

function parseGpxStats(gpxContent: string) {
    let totalDistance = 0;
    let totalElevation = 0;

    const trkptRegex = /<trkpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>[\s\S]*?<\/trkpt>/g;
    const eleRegex = /<ele>([^<]+)<\/ele>/;

    const rawPoints: { lat: number; lon: number; ele: number | null }[] = [];
    let match;

    while ((match = trkptRegex.exec(gpxContent)) !== null) {
        const lat = parseFloat(match[1]);
        const lon = parseFloat(match[2]);
        const eleMatch = match[0].match(eleRegex);
        const ele = eleMatch ? parseFloat(eleMatch[1]) : null;
        rawPoints.push({ lat, lon, ele });
    }

    if (rawPoints.length === 0) {
        const trkptRegex2 = /<trkpt[^>]*lon="([^"]+)"[^>]*lat="([^"]+)"[^>]*>[\s\S]*?<\/trkpt>/g;
        while ((match = trkptRegex2.exec(gpxContent)) !== null) {
            const lon = parseFloat(match[1]);
            const lat = parseFloat(match[2]);
            const eleMatch = match[0].match(eleRegex);
            const ele = eleMatch ? parseFloat(eleMatch[1]) : null;
            rawPoints.push({ lat, lon, ele });
        }
    }

    if (rawPoints.length === 0) {
        return { distance: 0, elevation: 0, firstPoint: null };
    }

    // 1. Prepare points with accumulated distance
    const points: Point[] = [];
    let currentDist = 0;

    // Filter raw points:
    // 1. Must have valid latitude/longitude
    // 2. Must have valid elevation (otherwise we get drops to 0)
    // 3. Remove duplicates (0 distance)

    let validPoints = rawPoints.filter((p) => p.ele !== null && !isNaN(p.lat) && !isNaN(p.lon));

    if (validPoints.length === 0) {
        return { distance: 0, elevation: 0, firstPoint: null };
    }

    points.push({ ...validPoints[0], dist: 0, index: 0 });

    for (let i = 1; i < validPoints.length; i++) {
        const d = haversineDistance(
            validPoints[i - 1].lat,
            validPoints[i - 1].lon,
            validPoints[i].lat,
            validPoints[i].lon
        );

        // Ignore tiny movements (< 1cm) to avoid accumulation of float noise or duplicates
        if (d > 0.00001) {
            currentDist += d;
            points.push({ ...validPoints[i], dist: currentDist, index: points.length });
        }
    }
    totalDistance = currentDist;

    // 2. Simplification using Ramer-Douglas-Peucker on Elevation Profile
    // Epsilon = 20m (matches gpx.studio default)
    // Distance metric = perpendicular distance in (dist, ele) plane

    function getPerpendicularDist(p: Point, p1: Point, p2: Point) {
        if (p.ele === null || p1.ele === null || p2.ele === null) return 0;

        let x = p.dist * 1000;
        let y = p.ele;
        let x1 = p1.dist * 1000;
        let y1 = p1.ele;
        let x2 = p2.dist * 1000;
        let y2 = p2.ele;

        let A = x - x1;
        let B = y - y1;
        let C = x2 - x1;
        let D = y2 - y1;

        let dot = A * C + B * D;
        let len_sq = C * C + D * D;
        let param = -1;
        if (len_sq != 0) param = dot / len_sq;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        let dx = x - xx;
        let dy = y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function rdp(pts: Point[], epsilon: number): Point[] {
        if (pts.length < 3) return pts;

        let first = pts[0];
        let last = pts[pts.length - 1];
        let index = -1;
        let dist = 0;

        for (let i = 1; i < pts.length - 1; i++) {
            let cDist = getPerpendicularDist(pts[i], first, last);
            if (cDist > dist) {
                dist = cDist;
                index = i;
            }
        }

        if (dist > epsilon) {
            let l1 = rdp(pts.slice(0, index + 1), epsilon);
            let l2 = rdp(pts.slice(index), epsilon);
            return l1.slice(0, l1.length - 1).concat(l2);
        } else {
            return [first, last];
        }
    }

    // Only run RDP if we have valid elevation data
    const hasElevation = points.some((p) => p.ele !== null);
    let simplified: Point[] = [];

    // We only RDP on segments that actually have elevation
    // But for simplicity in this script, we'll filter nulls out and assume continuous or just use original logic which handles nulls by returning 0 dist
    // gpx.studio handles nulls gracefully.

    // Note: Recursive RDP on large arrays can blow stack. Iterative or just less recursion?
    // Given standard tracks < 20k points, recursion is usually fine.
    // We'll use the simplified recursive logic but be careful.
    try {
        if (hasElevation) {
            simplified = rdp(points, 20);
        } else {
            simplified = [points[0], points[points.length - 1]];
        }
    } catch (e) {
        // Fallback if RDP fails (stack overflow)
        simplified = [points[0], points[points.length - 1]];
    }

    // 3. Anchored Smoothing
    // For each segment between simplified points, we apply window smoothing
    // BUT we anchor the start and end of the segment to the simplified points (original elevation)

    const smoothedElevations = new Array(points.length).fill(0);
    // Initialize with original values
    for (let i = 0; i < points.length; i++) smoothedElevations[i] = points[i].ele || 0;

    const SMOOTHING_WINDOW_KM = 0.1; // 100m

    // This computes average elevation in window [start, end]
    function computeAverageInWindow(startIdx: number, endIdx: number) {
        let sum = 0;
        let count = 0;
        for (let k = startIdx; k <= endIdx; k++) {
            if (points[k].ele !== null) {
                sum += points[k].ele!;
                count++;
            }
        }
        return count > 0 ? sum / count : 0;
    }

    for (let i = 0; i < simplified.length - 1; i++) {
        const startIdx = simplified[i].index;
        const endIdx = simplified[i + 1].index;

        // Perform smoothing for points between startIdx and endIdx
        // The window smoothing logic:
        // For each point j in [startIdx, endIdx], we find a window [wStart, wEnd] such that dist <= SMOOTHING_WINDOW
        // And we ensure wStart >= startIdx and wEnd <= endIdx ?
        // Actually gpx.studio doesn't constrain window to the segment, it constrains the *points being updated* to the segment.
        // It uses the full track for the window data source.

        // However, gpx.studio implementation of distanceWindowSmoothing takes (left, right) limits.
        // In _elevationComputation: smoothedEle = distanceWindowSmoothing(start, end + 1, ...)
        // And inside distanceWindowSmoothing, it iterates i from left to right.
        // And it finds window within left/right bounds?
        // "let end = Math.min(i + 2, right)" -> Yes, it constrains window to these bounds!
        // So smoothing does NOT cross the simplification "anchors". This is KEY.

        for (let j = startIdx; j <= endIdx; j++) {
            // Find window [wStart, wEnd] WITHIN [startIdx, endIdx+1] (exclusive end?)
            // indices are inclusive for calculation

            // Backward
            let wStart = j;
            while (
                wStart > startIdx &&
                points[j].dist - points[wStart - 1].dist <= SMOOTHING_WINDOW_KM
            ) {
                wStart--;
            }

            // Forward
            let wEnd = j;
            while (wEnd < endIdx && points[wEnd + 1].dist - points[j].dist <= SMOOTHING_WINDOW_KM) {
                wEnd++;
            }

            smoothedElevations[j] = computeAverageInWindow(wStart, wEnd);
        }

        // Anchor the ends exactly to original to prevent drift at key points
        smoothedElevations[startIdx] = points[startIdx].ele || 0;
        smoothedElevations[endIdx] = points[endIdx].ele || 0;
    }

    // 4. Calculate stats from smoothed
    // Note: gpx.studio sums gains only within the segments
    for (let i = 0; i < simplified.length - 1; i++) {
        const startIdx = simplified[i].index;
        const endIdx = simplified[i + 1].index;

        for (let j = startIdx; j < endIdx; j++) {
            const diff = smoothedElevations[j + 1] - smoothedElevations[j];
            if (diff > 0) {
                totalElevation += diff;
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
