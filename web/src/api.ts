export interface CreatedLink {
  code: string;
  shortUrl: string;
  url: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface LinkStats extends CreatedLink {
  clicks: number;
  lastClickedAt: string | null;
  custom: boolean;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const details = Array.isArray(data.details)
      ? data.details.map((d: { message: string }) => d.message).join('; ')
      : '';
    throw new ApiError(res.status, details || data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export function createLink(input: { url: string; alias?: string; ttlDays?: number }) {
  return request<CreatedLink>('/api/links', { method: 'POST', body: JSON.stringify(input) });
}

export function getStats(code: string) {
  return request<LinkStats>(`/api/links/${encodeURIComponent(code)}`);
}
