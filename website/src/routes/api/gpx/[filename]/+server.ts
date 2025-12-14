import { error } from '@sveltejs/kit';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { dev } from '$app/environment';

const LIBRARY_DIR = dev ? 'static/gpx' : 'build/client/gpx';

export async function GET({ params }: { params: { filename: string } }) {
    const { filename } = params;

    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
        throw error(400, 'Invalid filename');
    }

    const filePath = path.join(LIBRARY_DIR, filename);

    try {
        const content = await fs.readFile(filePath);
        const ext = path.extname(filename).toLowerCase();

        // Determine content type
        let contentType = 'application/octet-stream';
        if (ext === '.gpx') contentType = 'application/gpx+xml';
        else if (ext === '.json') contentType = 'application/json';

        return new Response(new Uint8Array(content), {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch {
        throw error(404, 'File not found');
    }
}
