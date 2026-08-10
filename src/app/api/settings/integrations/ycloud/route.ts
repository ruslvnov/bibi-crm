import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { encrypt, hashSecret } from '@/lib/encryption'

const UpdateSchema = z.object({
  ycloudApiKey: z.string().optional(),
  ycloudBusinessPhone: z.string().optional(),
  inboundSecret: z.string().optional(),
  isActive: z.boolean().optional(),
})

export async function GET() {
  await requireRole('OWNER')

  const config = await prisma.integrationConfig.findUnique({ where: { provider: 'ycloud' } })
  if (!config) return NextResponse.json({ success: true, data: null })

  // Never return secrets — only metadata
  return NextResponse.json({
    success: true,
    data: {
      id: config.id,
      provider: config.provider,
      ycloudBusinessPhone: config.ycloudBusinessPhone,
      isActive: config.isActive,
      hasApiKey: !!config.ycloudApiKeyEncrypted,
      hasInboundSecret: !!config.inboundSecretHash,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    },
  })
}

export async function PATCH(req: NextRequest) {
  await requireRole('OWNER')

  const body = await req.json().catch(() => ({}))
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ success: false, code: 'VALIDATION_ERROR' }, { status: 422 })

  const data: Record<string, unknown> = {}
  if (parsed.data.ycloudApiKey) data.ycloudApiKeyEncrypted = encrypt(parsed.data.ycloudApiKey)
  if (parsed.data.ycloudBusinessPhone) data.ycloudBusinessPhone = parsed.data.ycloudBusinessPhone
  if (parsed.data.inboundSecret) data.inboundSecretHash = hashSecret(parsed.data.inboundSecret)
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive

  const config = await prisma.integrationConfig.upsert({
    where: { provider: 'ycloud' },
    update: data,
    create: { provider: 'ycloud', ...data },
  })

  return NextResponse.json({ success: true, data: { id: config.id, updatedAt: config.updatedAt } })
}
