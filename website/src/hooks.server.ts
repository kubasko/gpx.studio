import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    // Increase body size limit to 50MB for file uploads
    if (event.request.method === 'POST' || event.request.method === 'PUT') {
        // The body size limit is configured via BODY_SIZE_LIMIT env var
        // This hook is just for any additional processing
    }

    return resolve(event);
};
