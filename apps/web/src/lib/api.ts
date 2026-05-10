import axios from 'axios';
import type { ApiErrorBody } from '../types';

const base = import.meta.env.VITE_API_BASE_URL ?? '';

export const api = axios.create({
  baseURL: `${base}/api/v1`,
  withCredentials: true,
});

let refreshPromise: Promise<void> | null = null;

async function refreshSession(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = api.post('/auth/refresh').then(() => undefined).finally(() => {
      refreshPromise = null;
    });
  }
  await refreshPromise;
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const cfg = error.config;
    const status = error.response?.status;
    const url = cfg?.url as string | undefined;
    if (
      status === 401 &&
      cfg &&
      !cfg._retry &&
      url &&
      !url.includes('/auth/login') &&
      !url.includes('/auth/register') &&
      !url.includes('/auth/refresh')
    ) {
      cfg._retry = true;
      try {
        await refreshSession();
        return api(cfg);
      } catch {
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorBody | undefined;
    if (data?.error?.message) return data.error.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
