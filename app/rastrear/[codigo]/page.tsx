'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import {
  subscribeToSession, joinSession, updatePosition,
  setMemberInactive, getMemberColor, getTrackingUserId,
} from '@/lib/realtimeDb'
import type { TrackingSession } from '@/lib/realtimeDb'
import { haversineDistance } from '@/lib/geolocation'

const TrackingMap = dynamic(() => import('./TrackingMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
      <span className="text-gray-400 text-sm">Carregando mapa...</span>
    </div>
  ),
})

function timeSince(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'agora'
  if (s < 3600) return `há ${Math.floor(s / 60)}min`
  return `há ${Math.floor(s / 3600)}h`
}

export default function TrackingSessionPage() {
  const params = useParams()
  const { user } = useAuth()
  const code = (params.codigo as string).toUpperCase()

  const [session, setSession] = useState<TrackingSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [tracking, setTracking] = useState(false)
  const [satellite, setSatellite] = useState(false)
  const [gpsError, setGpsError] = useState('')
  const [copied, setCopied] = useState(false)
  const [joining, setJoining] = useState(false)
  const [guestName, setGuestName] = useState('')

  const watchIdRef = useRef<number | null>(null)
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const userId = getTrackingUserId(user?.uid)
  const userName = user?.displayName ?? guestName.trim()
  const photoUrl = user?.photoURL ?? undefined

  // Atualiza labels "há Xmin" a cada 30s
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeToSession(code, (data) => {
      setSession(data)
      setLoading(false)
    })
    return unsubscribe
  }, [code])

  useEffect(() => {
    return () => {
      stopTracking()
      setMemberInactive(code, userId).catch(() => {})
    }
  }, [code, userId])

  async function handleJoin() {
    if (!userName) return
    setJoining(true)
    const ok = await joinSession(code, userId, userName, photoUrl)
    if (ok) setJoining(false)
  }

  async function startTracking() {
    if (!navigator.geolocation) { setGpsError('GPS não disponível neste dispositivo.'); return }
    setGpsError('')
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
      }
    } catch {}
    watchIdRef.current = navigator.geolocation.watchPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        const last = lastPosRef.current
        if (last && haversineDistance(lat, lng, last.lat, last.lng) < 0.02) return
        lastPosRef.current = { lat, lng }
        await updatePosition(code, userId, lat, lng)
      },
      () => setGpsError('Permita o acesso ao GPS nas configurações do navegador.'),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5_000 },
    )
    setTracking(true)
  }

  function stopTracking() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
    setTracking(false)
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/rastrear/${code}`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="text-4xl">📡</div>
        <p className="text-gray-500 text-sm">Conectando ao grupo...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Sessão não encontrada</h2>
        <p className="text-gray-500 text-sm mb-6">O código "{code}" não existe ou expirou.</p>
        <Link href="/rastrear" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold text-sm">Criar nova sessão</Link>
      </div>
    )
  }

  const members = session.members ?? {}
  const memberEntries = Object.entries(members)
  const isInSession = Boolean(members[userId])

  if (!isInSession) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📡</div>
          <h1 className="text-2xl font-bold text-gray-900">{session.name}</h1>
          <p className="text-gray-500 mt-1 text-sm">{memberEntries.length} membro{memberEntries.length !== 1 ? 's' : ''} no grupo</p>
        </div>
        {!user && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Seu nome no mapa</label>
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Como você quer aparecer?"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
            />
          </div>
        )}
        <button
          onClick={handleJoin}
          disabled={joining || !userName}
          className="w-full py-4 rounded-xl font-bold text-white text-sm bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {joining ? 'Entrando...' : '📍 Entrar no grupo'}
        </button>
      </div>
    )
  }

  const myData = members[userId]
  const withPos = memberEntries.filter(([, m]) => m.lat !== 0 && m.lng !== 0)
  let center: [number, number] = [-15.8, -47.9]
  let zoom = 4
  if (myData?.lat && myData.lat !== 0) { center = [myData.lat, myData.lng]; zoom = 15 }
  else if (withPos.length > 0) { center = [withPos[0][1].lat, withPos[0][1].lng]; zoom = 13 }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-2.5 z-10">
        <div className="flex items-center gap-2">
          <Link href="/rastrear" className="text-gray-400 text-lg flex-shrink-0 w-7">←</Link>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm truncate">{session.name}</p>
            <p className="text-xs text-gray-400">{memberEntries.length} membro{memberEntries.length !== 1 ? 's' : ''}</p>
          </div>
          {/* Toggle satélite */}
          <button
            onClick={() => setSatellite((v) => !v)}
            title={satellite ? 'Ver mapa de ruas' : 'Ver satélite'}
            className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-base transition-colors ${
              satellite ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {satellite ? '🗺️' : '🛰️'}
          </button>
          {/* Código para compartilhar */}
          <div className="flex-shrink-0 flex flex-col items-end">
            <button
              onClick={copyLink}
              className="bg-gray-100 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-200 transition-colors"
            >
              {copied ? '✓ Copiado!' : `📋 ${code}`}
            </button>
            <span className="text-[10px] text-gray-400 mt-0.5 pr-0.5">
              {copied ? 'link copiado' : 'toque p/ compartilhar'}
            </span>
          </div>
        </div>
      </div>

      {/* Mapa */}
      <div className="flex-1 relative min-h-0">
        <TrackingMap
          members={members}
          myId={userId}
          center={center}
          zoom={zoom}
          satellite={satellite}
        />

        {/* Botão flutuante */}
        <div className="absolute bottom-3 left-0 right-0 flex flex-col items-center gap-1.5 z-[1000] px-4 pointer-events-none">
          {gpsError && (
            <p className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-4 py-2 text-center pointer-events-auto">
              {gpsError}
            </p>
          )}
          <button
            onClick={tracking ? stopTracking : startTracking}
            className={`px-6 py-2.5 rounded-full font-bold text-sm shadow-lg pointer-events-auto transition-all ${
              tracking ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
            }`}
          >
            {tracking ? '⏸ Pausar rastreamento' : '📍 Ativar rastreamento'}
          </button>
          {tracking && (
            <p className="text-[11px] text-white bg-black/40 rounded-full px-3 py-1 pointer-events-none">
              Tela acesa · GPS ativo
            </p>
          )}
        </div>
      </div>

      {/* Lista de membros */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100">
        <div className="flex gap-3 overflow-x-auto px-4 py-2">
          {memberEntries.map(([uid, member], i) => (
            <div key={uid} className="flex-shrink-0 flex flex-col items-center gap-0.5 w-12">
              {member.photoUrl ? (
                <img
                  src={member.photoUrl}
                  alt={member.name}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover border-2 border-white shadow"
                  style={{ borderColor: getMemberColor(i) }}
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white border-2 border-white shadow"
                  style={{ background: getMemberColor(i) }}
                >
                  {member.name.charAt(0).toUpperCase()}
                </div>
              )}
              <p className="text-[11px] font-semibold text-gray-700 text-center truncate w-full">
                {uid === userId ? 'Você' : member.name.split(' ')[0]}
              </p>
              <p className="text-[10px] text-gray-400 text-center leading-tight">
                {member.lat !== 0 ? timeSince(member.updatedAt) : 'sem GPS'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
