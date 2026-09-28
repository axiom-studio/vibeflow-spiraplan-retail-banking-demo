import { useEffect, useState } from 'react';

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'Unable to load your information. Please try again.');
  return body as T;
}

export function useResource<T>(path: string, revision = 0) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    request<T>(path, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setState({ data, loading: false });
    }).catch((error: Error) => {
      if (!controller.signal.aborted) setState({ error: error.message, loading: false });
    });
    return () => controller.abort();
  }, [path, revision, retry]);
  return { ...state, retry: () => setRetry(value => value + 1) };
}
