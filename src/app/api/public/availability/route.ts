import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { formatInTimeZone } from 'date-fns-tz'

const TZ = 'Asia/Bishkek'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-api-key')
  if (!secret || secret !== process.env.YCLOUD_INBOUND_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  if (!dateFrom || !dateTo) {
    return NextResponse.json({ error: 'dateFrom and dateTo required' }, { status: 400 })
  }

  const requests = await prisma.consultationRequest.findMany({
    where: {
      preferredDateTime: {
        gte: new Date(dateFrom),
        lte: new Date(dateTo + 'T23:59:59Z'),
      },
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    select: {
      preferredDateTime: true,
      patient: { select: { fullName: true } },
    },
  })

  // Deduplicate by date+time (multiple bookings at same slot count as 1)
  const seen = new Set<string>()
  const bookedSlots: { date: string; time: string }[] = []
  for (const r of requests) {
    if (!r.preferredDateTime) continue
    const date = formatInTimeZone(r.preferredDateTime, TZ, 'yyyy-MM-dd')
    const time = formatInTimeZone(r.preferredDateTime, TZ, 'HH:mm')
    const key = `${date}|${time}`
    if (!seen.has(key)) {
      seen.add(key)
      bookedSlots.push({ date, time })
    }
  }

  return NextResponse.json({ bookedSlots })
}
