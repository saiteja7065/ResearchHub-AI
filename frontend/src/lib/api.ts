import { supabase } from './supabase';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

let warmupPromise: Promise<void> | null = null;

/** Fire-and-forget ping that wakes a sleeping Render instance before the user needs it. */
export function warmBackend(): Promise<void> {
    if (!warmupPromise) {
        warmupPromise = fetch(`${API_BASE_URL}/health`, { cache: 'no-store' })
            .then(() => undefined)
            .catch(() => { warmupPromise = null; });
    }
    return warmupPromise;
}

async function authHeaders(init?: HeadersInit): Promise<Headers> {
    // getSession reads the locally cached session (and refreshes it only when expired)
    const { data: { session } } = await supabase.auth.getSession();
    const headers = new Headers(init);
    if (session?.access_token) {
        headers.set('Authorization', `Bearer ${session.access_token}`);
    }
    return headers;
}

async function request(endpoint: string, init: RequestInit, fallbackError: string): Promise<any> {
    let res: Response;
    try {
        res = await fetch(`${API_BASE_URL}${endpoint}`, init);
    } catch {
        // Network failure usually means the free-tier backend is still waking up
        throw new Error('Cannot reach the server right now. It may be waking up, please retry in a few seconds.');
    }

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || fallbackError);
    }

    return res.json();
}

export async function fetchApi(endpoint: string, options: RequestInit = {}): Promise<any> {
    const headers = await authHeaders(options.headers);
    if (options.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    return request(endpoint, { ...options, headers }, 'An error occurred with the API request');
}

export async function submitFormDataApi(endpoint: string, formData: FormData): Promise<any> {
    // Do NOT set Content-Type header when sending FormData, the browser will set it automatically with the correct boundary
    const headers = await authHeaders();
    return request(endpoint, { method: 'POST', body: formData, headers }, 'An error occurred during form submission');
}
