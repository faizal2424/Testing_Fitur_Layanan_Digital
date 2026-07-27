/**
 * API Client Helper untuk Frontend Svelte
 *
 * Wrapper fetch yang:
 * - Otomatis mengirim cookie (credentials: 'include')
 * - Di dev mode: hit /api/* → Vite proxy → backend:3001
 * - Di prod mode: hit URL backend langsung (dari env VITE_API_URL)
 */

// URL base backend — di dev proxy handle ini, di prod set VITE_API_URL
const API_BASE =
  typeof window !== 'undefined'
    ? (import.meta.env.VITE_API_URL || '') // kosong = relative (lewat Vite proxy)
    : ''; // SSR: tidak digunakan saat frontend sudah fully client-side

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  [key: string]: any;
}

interface FetchOptions extends RequestInit {
  json?: Record<string, any>;
}

async function apiRequest<T = any>(
  path: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const { json, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>)
  };

  let body = fetchOptions.body;

  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      headers,
      body,
      credentials: 'include' // WAJIB untuk mengirim/menerima cookie cross-origin
    });

    const data = await response.json();
    return data as ApiResponse<T>;
  } catch (err) {
    console.error(`[API] Request failed: ${path}`, err);
    return { success: false, error: 'Tidak dapat terhubung ke server.' };
  }
}

// ── Auth API ──────────────────────────────────────────────────

export const authApi = {
  /**
   * Login user
   */
  login: (username: string, password: string, remember = false) =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      json: { username, password, remember }
    }),

  /**
   * Logout user
   */
  logout: () =>
    apiRequest('/api/auth/logout', { method: 'POST' }),

  /**
   * Cek session aktif (untuk init state di frontend)
   */
  me: () => apiRequest('/api/auth/me')
};

// ── Tracking API ──────────────────────────────────────────────

export const trackingApi = {
  /**
   * Cek status pengajuan by tracking code
   */
  check: (code: string) => apiRequest(`/api/tracking/${encodeURIComponent(code)}`)
};

// ── Generic helper ────────────────────────────────────────────
export { apiRequest };
