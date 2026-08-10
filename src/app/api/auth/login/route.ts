import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { auditLog } from '@/lib/audit'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = rateLimit(`login:${ip}`, 10, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ success: false, code: 'RATE_LIMITED' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const parsed = LoginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, code: 'VALIDATION_ERROR' }, { status: 422 })
  }

  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({ where: { email, isActive: true } })
  if (!user) {
    // Timing-safe: still verify a dummy hash to prevent timing attacks
    await bcrypt.compare('dummy', '$2a$12$fakehashforatimingattackprevention00000000000000000000').catch(() => {})
    return NextResponse.json({ success: false, code: 'INVALID_CREDENTIALS' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, user.passwordHash).catch(() => false)
  if (!valid) {
    logger.warn('Failed login attempt', { email, ip })
    return NextResponse.json({ success: false, code: 'INVALID_CREDENTIALS' }, { status: 401 })
  }

  const session = await getSession()
  session.userId = user.id
  session.email = user.email
  session.role = user.role
  session.name = user.name
  await session.save()

  await auditLog({
    userId: user.id,
    action: 'LOGIN',
    ipAddress: ip,
    userAgent: req.headers.get('user-agent') ?? undefined,
  })

  logger.info('User logged in', { userId: user.id, role: user.role })
  return NextResponse.json({
    success: true,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  })
}
