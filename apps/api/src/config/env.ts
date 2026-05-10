import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().min(10).max(15).default(12),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  APPOINTMENT_CHANGE_MIN_HOURS: z.coerce.number().min(0).default(24),
  DEFAULT_APPOINTMENT_DURATION_MINUTES: z.coerce.number().min(15).max(480).default(60),
  /** IANA zone for interpreting stored availability (day + minutes since local midnight). */
  SCHEDULING_TIMEZONE: z
    .string()
    .min(1)
    .default('UTC')
    .superRefine((tz, ctx) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: tz });
      } catch {
        ctx.addIssue({
          code: 'custom',
          message: `Invalid SCHEDULING_TIMEZONE (not a valid IANA time zone): ${tz}`,
        });
      }
    }),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z.coerce.boolean().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export const env = parseEnv();
