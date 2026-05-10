import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { UserRole } from '@prisma/client';

export type AccessPayload = {
  sub: string;
  role: UserRole;
  typ: 'access';
};

export function signAccessToken(userId: string, role: UserRole): string {
  const payload: AccessPayload = { sub: userId, role, typ: 'access' };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
  if (decoded.typ !== 'access') {
    throw new Error('Invalid token type');
  }
  return decoded;
}
