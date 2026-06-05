import { ref, set, get, update, onValue, off } from 'firebase/database'
import { rtdb } from './firebase'

export interface TrackingMember {
  name: string
  lat: number
  lng: number
  updatedAt: number
  active: boolean
}

export interface TrackingSession {
  name: string
  createdAt: number
  expiresAt: number
  members: Record<string, TrackingMember>
}

const MEMBER_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
]

export function getMemberColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length]
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function guestId(): string {
  let id = localStorage.getItem('role_tracking_guest_id')
  if (!id) { id = `g_${Math.random().toString(36).slice(2, 10)}`; localStorage.setItem('role_tracking_guest_id', id) }
  return id
}

export function getTrackingUserId(uid?: string): string {
  if (uid) return uid
  return typeof window !== 'undefined' ? guestId() : 'guest'
}

export async function createSession(sessionName: string, userId: string, userName: string): Promise<string> {
  const code = generateCode()
  const now = Date.now()
  await set(ref(rtdb, `tracking_sessions/${code}`), {
    name: sessionName.trim() || 'Grupo',
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000,
    members: {
      [userId]: { name: userName, lat: 0, lng: 0, updatedAt: now, active: true },
    },
  })
  return code
}

export async function joinSession(code: string, userId: string, userName: string): Promise<boolean> {
  const snap = await get(ref(rtdb, `tracking_sessions/${code}`))
  if (!snap.exists()) return false
  const session = snap.val() as TrackingSession
  if (session.expiresAt < Date.now()) return false
  await update(ref(rtdb, `tracking_sessions/${code}/members/${userId}`), {
    name: userName, lat: 0, lng: 0, updatedAt: Date.now(), active: true,
  })
  return true
}

export function subscribeToSession(
  code: string,
  callback: (data: TrackingSession | null) => void,
): () => void {
  const r = ref(rtdb, `tracking_sessions/${code}`)
  onValue(r, (snap) => callback(snap.exists() ? (snap.val() as TrackingSession) : null))
  return () => off(r)
}

export async function updatePosition(code: string, userId: string, lat: number, lng: number): Promise<void> {
  await update(ref(rtdb, `tracking_sessions/${code}/members/${userId}`), {
    lat, lng, updatedAt: Date.now(),
  })
}

export async function setMemberInactive(code: string, userId: string): Promise<void> {
  await update(ref(rtdb, `tracking_sessions/${code}/members/${userId}`), { active: false })
}
