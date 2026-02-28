import { useState, useEffect, useCallback } from 'react';
import { fetchApi, submitFormDataApi } from '../lib/api';

export type Workspace = {
    id: string;
    name: string;
    description: string;
    created_at: string;
};

export function useWorkspaces() {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchWorkspaces = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const json = await fetchApi('/workspaces/');
            setWorkspaces(json.data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const createWorkspace = async (name: string, description: string) => {
        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('description', description);

            const json = await submitFormDataApi('/workspaces/', formData);

            if (json.data) {
                setWorkspaces(prev => [json.data, ...prev]);
                return json.data;
            }
        } catch (err: any) {
            throw new Error(err.message);
        }
    };

    useEffect(() => {
        fetchWorkspaces();
    }, [fetchWorkspaces]);

    return {
        workspaces,
        loading,
        error,
        createWorkspace,
        refresh: fetchWorkspaces
    };
}
