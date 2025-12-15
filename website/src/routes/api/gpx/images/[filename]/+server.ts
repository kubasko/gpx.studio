import { error } from '@sveltejs/kit';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { dev } from '$app/environment';
import { LIBRARY_DIR } from '$lib/server/config';
const IMAGES_DIR = path.join(LIBRARY_DIR, 'images');

export async function GET({ params }: { params: { filename: string } }) {
    const { filename } = params;

    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
        throw error(400, 'Invalid filename');
    }

    const filePath = path.join(IMAGES_DIR, filename);

    try {
        const content = await fs.readFile(filePath);
        const ext = path.extname(filename).toLowerCase();

        // Determine content type
        let contentType = 'application/octet-stream';
        if (ext === '.png') contentType = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.gif') contentType = 'image/gif';
        else if (ext === '.webp') contentType = 'image/webp';

        return new Response(new Uint8Array(content), {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400',
            },
        });
    } catch {
        throw error(404, 'Image not found');
    }
}
