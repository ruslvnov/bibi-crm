import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { testConnection } from '@/lib/ycloud'

export async function POST() {
  await requireRole('OWNER')
  const result = await testConnection()
  return NextResponse.json({ success: result.ok, error: result.error })
}
