import { z } from 'zod'

const schema = z.object({
  NODE_ENV:             z.enum(['development', 'test', 'production']).default('development'),
  PORT:                 z.coerce.number().default(3000),
  DATABASE_URL:         z.string().url(),
  JWT_SECRET:           z.string().min(32),
  JWT_REFRESH_SECRET:   z.string().min(32),
  JWT_ACCESS_EXPIRES:   z.string().default('15m'),
  JWT_REFRESH_EXPIRES:  z.string().default('7d'),
  LOG_LEVEL:            z.string().default('info'),
  FRONTEND_URL:         z.string().url().optional(),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
