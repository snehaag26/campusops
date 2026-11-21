const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api').replace(/\/$/, '');
import { demoApi, demoDownload } from './demo-api.js';

export async function api(path, token, options = {}) {
  if (String(token || '').startsWith('demo:')) return demoApi(path, token, options);
  const headers = { Accept: 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
  } catch {
    throw new Error(`Can’t reach the CampusOps API at ${API_BASE}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok) throw new Error(payload?.error || `Request failed (${response.status})`);
  return payload;
}

export async function download(path, token, fileName) {
  if (String(token || '').startsWith('demo:')) return demoDownload(path, fileName);
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch {
    throw new Error(`Can’t reach the CampusOps API at ${API_BASE}`);
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || `Download failed (${response.status})`);
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
