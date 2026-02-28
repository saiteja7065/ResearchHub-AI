import { supabase } from './supabase';

const API_BASE_URL = 'http://127.0.0.1:8090';

export async function fetchApi(endpoint: string, options: RequestInit = {}): Promise<any> {
    // Get the latest Supabase session
    const { data: { session } } = await supabase.auth.getSession();

    const headers = new Headers(options.headers);
    if (session?.access_token) {
        headers.set('Authorization', `Bearer ${session.access_token}`);
    }

    if (options.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'An error occurred with the API request');
    }

    return res.json();
}

export async function submitFormDataApi(endpoint: string, formData: FormData): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession();

    const headers = new Headers();
    if (session?.access_token) {
        headers.set('Authorization', `Bearer ${session.access_token}`);
    }

    // Do NOT set Content-Type header when sending FormData, the browser will set it automatically with the correct boundary
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
        headers,
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'An error occurred during form submission');
    }

    return res.json();
}
