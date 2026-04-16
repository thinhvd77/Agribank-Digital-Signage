export function useApi(token: string) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...options,
      headers: { ...headers, ...options?.headers },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  return { fetchApi, headers };
}
