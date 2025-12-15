import { promises as fs } from 'node:fs';
import path from 'node:path';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

const LIBRARY_DIR = env.LIBRARY_PATH || (dev ? 'static/gpx' : 'build/client/gpx');
const DB_FILE = path.join(LIBRARY_DIR, 'library.json');

export async function runMigrations() {
    console.log('Checking for migrations...');
    try {
        // Ensure directory exists
        try {
            await fs.access(LIBRARY_DIR);
        } catch {
            await fs.mkdir(LIBRARY_DIR, { recursive: true });
        }

        let db = [];
        try {
            const data = await fs.readFile(DB_FILE, 'utf-8');
            db = JSON.parse(data);
        } catch (e) {
            // File likely doesn't exist yet, or is empty
            return;
        }

        let changed = false;

        // Migration: Ensure all items have 'tags' and 'date'
        db = db.map((item: any) => {
            let itemChanged = false;

            if (!item.tags) {
                item.tags = [];
                itemChanged = true;
            }

            if (!item.date) {
                item.date = new Date().toISOString();
                itemChanged = true;
            }

            // Example of adding a new field 'version'
            if (!item.version) {
                item.version = 1;
                itemChanged = true;
            }

            if (itemChanged) {
                changed = true;
            }
            return item;
        });

        if (changed) {
            console.log('Migrating data structure...');
            await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
            console.log('Migration complete.');
        } else {
            console.log('Data is up to date.');
        }
    } catch (error) {
        console.error('Migration failed:', error);
    }
}
