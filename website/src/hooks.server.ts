import type { Handle } from '@sveltejs/kit';
import { runMigrations } from '$lib/server/migration';

let migrated = false;

export const handle: Handle = async ({ event, resolve }) => {
    // Run migrations once on startup (lazily on first request if strict startup hooks aren't available,
    // but in SvelteKit handle runs per request. We use a global flag to run it once per instance)
    if (!migrated) {
        await runMigrations();
        migrated = true;
    }

    // Increase body size limit to 50MB for file uploads
    if (event.request.method === 'POST' || event.request.method === 'PUT') {
        // The body size limit is configured via BODY_SIZE_LIMIT env var
        // This hook is just for any additional processing
    }

    return resolve(event);
};
