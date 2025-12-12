import { PUBLIC_READ_PASSWORD, PUBLIC_WRITE_PASSWORD } from '$env/static/public';

const AUTH_KEY = 'gpx_studio_auth';
const ACCESS_LEVEL_KEY = 'gpx_studio_access_level';

export type AccessLevel = 'none' | 'read' | 'write';

/**
 * Get the stored access level from sessionStorage
 */
export function getAccessLevel(): AccessLevel {
    if (typeof window === 'undefined') return 'none';
    return (sessionStorage.getItem(ACCESS_LEVEL_KEY) as AccessLevel) || 'none';
}

/**
 * Store the access level in sessionStorage
 */
export function setAccessLevel(level: AccessLevel): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(ACCESS_LEVEL_KEY, level);
    sessionStorage.setItem(AUTH_KEY, level !== 'none' ? 'true' : 'false');
}

/**
 * Check if a password is valid and return the access level it grants
 */
export function validatePassword(password: string): AccessLevel {
    // If no passwords are configured, allow full access
    if (!PUBLIC_READ_PASSWORD && !PUBLIC_WRITE_PASSWORD) {
        return 'write';
    }

    // Check write password first (higher privilege)
    if (PUBLIC_WRITE_PASSWORD && password === PUBLIC_WRITE_PASSWORD) {
        return 'write';
    }

    // Check read password
    if (PUBLIC_READ_PASSWORD && password === PUBLIC_READ_PASSWORD) {
        return 'read';
    }

    return 'none';
}

/**
 * Check if password protection is enabled
 */
export function isPasswordProtectionEnabled(): boolean {
    return Boolean(PUBLIC_READ_PASSWORD || PUBLIC_WRITE_PASSWORD);
}

/**
 * Check if user has at least read access
 */
export function hasReadAccess(): boolean {
    const level = getAccessLevel();
    return level === 'read' || level === 'write';
}

/**
 * Check if user has write access
 */
export function hasWriteAccess(): boolean {
    return getAccessLevel() === 'write';
}

/**
 * Get headers with authentication for API calls
 */
export function getAuthHeaders(): HeadersInit {
    // Send the write password if we have write access, otherwise empty
    const level = getAccessLevel();
    if (level === 'write' && PUBLIC_WRITE_PASSWORD) {
        return { 'X-Access-Password': PUBLIC_WRITE_PASSWORD };
    }
    if (level === 'read' && PUBLIC_READ_PASSWORD) {
        return { 'X-Access-Password': PUBLIC_READ_PASSWORD };
    }
    return {};
}

/**
 * Check if user is authenticated in sessionStorage (legacy support)
 */
export function isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(AUTH_KEY) === 'true';
}
