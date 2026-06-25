import { Router, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { generateOpaqueToken, hashToken } from '../lib/cryptoToken.js';
import { signAccessToken } from '../lib/jwt.js';
import { parseTtlToMs } from '../lib/time.js';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
  clearAccessCookieOptions,
  clearRefreshCookieOptions,
} from '../lib/cookies.js';
import { env } from '../config/env.js';
import { validateBody } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { AppError } from '../middleware/AppError.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../schemas/auth.schemas.js';
import { sendPasswordResetEmail } from '../lib/mail.js';

const router = Router();

const isDev = process.env.NODE_ENV === 'development';
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: isDev ? 10_000 : 60, standardHeaders: true });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: isDev ? 10_000 : 40, standardHeaders: true });

function userPublic(u: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  createdAt: Date;
}) {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  };
}

function setAuthCookies(res: Response, userId: string, role: UserRole) {
  const accessMs = parseTtlToMs(env.ACCESS_TOKEN_TTL);
  const refreshMs = parseTtlToMs(env.REFRESH_TOKEN_TTL);
  const access = signAccessToken(userId, role);
  res.cookie(ACCESS_COOKIE, access, accessCookieOptions(accessMs));
  return { accessMs, refreshMs };
}

router.post('/register', authLimiter, validateBody(registerSchema), async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        phone,
        role: UserRole.CUSTOMER,
      },
    });

    const refreshPlain = generateOpaqueToken();
    const refreshHash = hashToken(refreshPlain);
    const refreshExpires = new Date(Date.now() + parseTtlToMs(env.REFRESH_TOKEN_TTL));
    await prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: refreshHash, expiresAt: refreshExpires },
    });

    const { refreshMs } = setAuthCookies(res, user.id, user.role);
    res.cookie(REFRESH_COOKIE, refreshPlain, refreshCookieOptions(refreshMs));

    res.status(201).json({ user: userPublic(user) });
  } catch (e) {
    next(e);
  }
});

router.post('/login', loginLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password');
    }

    const refreshPlain = generateOpaqueToken();
    const refreshHash = hashToken(refreshPlain);
    const refreshExpires = new Date(Date.now() + parseTtlToMs(env.REFRESH_TOKEN_TTL));
    await prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: refreshHash, expiresAt: refreshExpires },
    });

    const { refreshMs } = setAuthCookies(res, user.id, user.role);
    res.cookie(REFRESH_COOKIE, refreshPlain, refreshCookieOptions(refreshMs));

    res.json({ user: userPublic(user) });
  } catch (e) {
    next(e);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const refreshPlain = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!refreshPlain) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing refresh token');
    }
    const refreshHash = hashToken(refreshPlain);
    const existing = await prisma.refreshToken.findFirst({
      where: { tokenHash: refreshHash, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!existing) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid refresh token');
    }

    await prisma.refreshToken.delete({ where: { id: existing.id } });

    const newPlain = generateOpaqueToken();
    const newHash = hashToken(newPlain);
    const refreshExpires = new Date(Date.now() + parseTtlToMs(env.REFRESH_TOKEN_TTL));
    await prisma.refreshToken.create({
      data: { userId: existing.userId, tokenHash: newHash, expiresAt: refreshExpires },
    });

    const { refreshMs } = setAuthCookies(res, existing.user.id, existing.user.role);
    res.cookie(REFRESH_COOKIE, newPlain, refreshCookieOptions(refreshMs));

    res.json({ user: userPublic(existing.user) });
  } catch (e) {
    next(e);
  }
});

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const refreshPlain = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (refreshPlain) {
      const refreshHash = hashToken(refreshPlain);
      await prisma.refreshToken.deleteMany({ where: { tokenHash: refreshHash } });
    }
    res.clearCookie(ACCESS_COOKIE, clearAccessCookieOptions());
    res.clearCookie(REFRESH_COOKIE, clearRefreshCookieOptions());
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });
    res.json({ user: userPublic(user) });
  } catch (e) {
    next(e);
  }
});

router.post(
  '/forgot-password',
  authLimiter,
  validateBody(forgotPasswordSchema),
  async (req, res, next) => {
    try {
      const { email } = req.body;
      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (user) {
        const plain = generateOpaqueToken();
        const tokenHash = hashToken(plain);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await prisma.passwordResetToken.create({
          data: { userId: user.id, tokenHash, expiresAt },
        });
        const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(plain)}`;
        await sendPasswordResetEmail(user.email, resetUrl);
      }
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/reset-password',
  authLimiter,
  validateBody(resetPasswordSchema),
  async (req, res, next) => {
    try {
      const { token, password } = req.body;
      const tokenHash = hashToken(token);
      const row = await prisma.passwordResetToken.findFirst({
        where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      });
      if (!row) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid or expired reset token');
      }
      const passwordHash = await hashPassword(password);
      await prisma.$transaction([
        prisma.user.update({
          where: { id: row.userId },
          data: { passwordHash },
        }),
        prisma.passwordResetToken.update({
          where: { id: row.id },
          data: { usedAt: new Date() },
        }),
        prisma.refreshToken.deleteMany({ where: { userId: row.userId } }),
      ]);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
