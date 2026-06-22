import type { CookieOptions } from 'express';
import { env } from '../config/env.js';

const isProd = env.NODE_ENV === 'production';

export const ACCESS_COOKIE = 'ac_access';
export const REFRESH_COOKIE = 'ac_refresh';

export function accessCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };
}

export function refreshCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };
}

export function clearAccessCookieOptions(): CookieOptions {
  return { ...accessCookieOptions(0), maxAge: 0 };
}

export function clearRefreshCookieOptions(): CookieOptions {
  return { ...refreshCookieOptions(0), maxAge: 0 };
}
