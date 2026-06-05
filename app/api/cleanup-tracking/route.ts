import { NextRequest, NextResponse } from 'next/server'
import { deleteExpiredEvents } from '@/lib/firestore'

const DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL?.replace(/\/$/, '')

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, unknown> = {}

  // 1. Deleta sessoes de rastreamento expiradas (Realtime Database)
  if (!DB_URL) {
    results.tracking = { error: 'DATABASE_URL not set' }
  } else {
    try {
      const res = await fetch(`${DB_URL}/tracking_sessions.json`)
      const sessions = await res.json()

      if (!sessions || typeof sessions !== 'object') {
        results.tracking = { deleted: 0 }
      } else {
        const now = Date.now()
        const expired = Object.entries(sessions as Record<string, { expiresAt: number }>)
          .filter(([, s]) => s.expiresAt < now)
          .map(([code]) => code)

        await Promise.all(
          expired.map((code) =>
            fetch(`${DB_URL}/tracking_sessions/${code}.json`, { method: 'DELETE' })
          )
        )
        results.tracking = { deleted: expired.length }
      }
    } catch (e) {
      results.tracking = { error: String(e) }
    }
  }

  // 2. Deleta eventos expirados (Firestore)
  try {
    const count = await deleteExpiredEvents()
    results.events = { deleted: count }
  } catch (e) {
    results.events = { error: String(e) }
  }

  return NextResponse.json(results)
}
