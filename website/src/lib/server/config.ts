import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

export const LIBRARY_DIR = env.LIBRARY_PATH || (dev ? 'static/gpx' : 'build/client/gpx');
