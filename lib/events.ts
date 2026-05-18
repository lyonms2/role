import type { RoleEvent } from '@/types'

function toDate(ts: any): Date {
  if (!ts) return new Date(0)
  if (ts.toDate) return ts.toDate()
  if (ts.seconds) return new Date(ts.seconds * 1000)
  return new Date(ts)
}

export function isEventExpired(event: RoleEvent): boolean {
  const now = new Date()
  try {
    const ref = event.endDate ?? event.date
    const d = toDate(ref)
    d.setHours(23, 59, 59, 999)
    return now > d
  } catch {
    return false
  }
}

export function filterActiveEvents(events: RoleEvent[]): RoleEvent[] {
  return events.filter((e) => !isEventExpired(e))
}
