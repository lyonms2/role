import { NextRequest, NextResponse } from 'next/server'

const DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL?.replace(/\/$/, '')

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!DB_URL) return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 })

  try {
    const res = await fetch(`${DB_URL}/tracking_sessions.json`)
    const sessions = await res.json()

    if (!sessions || typeof sessions !== 'object') {
      return NextResponse.json({ deleted: 0 })
    }

    const now = Date.now()
    const expired = Object.entries(sessions as Record<string, { expiresAt: number }>)
      .filter(([, s]) => s.expiresAt < now)
      .map(([code]) => code)

    await Promise.all(
      expired.map((code) =>
        fetch(`${DB_URL}/tracking_sessions/${code}.json`, { method: 'DELETE' })
      )
    )

    return NextResponse.json({ deleted: expired.length, codes: expired })
  } catch {
    return NextResponse.json({ error: 'Failed to clean up' }, { status: 500 })
  }
}
