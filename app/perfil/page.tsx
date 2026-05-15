'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { auth } from '@/lib/firebase'
import { signOut } from 'firebase/auth'
import { getReviewsByUser, getTipsByUser, getRoteirosByUser, deleteRoteiro, updateRoteiroDate, type SavedRoteiro } from '@/lib/firestore'
import { useAuth } from '@/lib/auth-context'
import type { Review, Tip, WeatherData } from '@/types'
import RouteModal from '@/components/RouteModal'
import PlaceDetailModal from '@/components/PlaceDetailModal'

// ── Calendário helpers ────────────────────────────────────────

const ROTEIRO_COLORS = ['#FF6B35', '#3b82f6', '#16a34a', '#9333ea', '#ec4899', '#f59e0b']

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatDateStr(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function getCalendarCells(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay()
  const total = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= total; d++) cells.push(d)
  return cells
}

const TODAY = new Date().toISOString().slice(0, 10)
const DAY_HEADERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export default function PerfilPage() {
  const { user, loading } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [tips, setTips] = useState<Tip[]>([])
  const [roteiros, setRoteiros] = useState<SavedRoteiro[]>([])
  const [tab, setTab] = useState<'reviews' | 'tips' | 'roteiros'>('reviews')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewId, setViewId] = useState<string | null>(null)
  const [calMonth, setCalMonth] = useState(() => new Date())
  const [modalWeather, setModalWeather] = useState<WeatherData | null>(null)
  const [modalRoute, setModalRoute] = useState<false | true | { lat: number; lng: number; name: string }>(false)
  const [modalPlaceId, setModalPlaceId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { setReviews([]); setTips([]); return }
    Promise.all([
      getReviewsByUser(user.uid),
      getTipsByUser(user.uid),
      getRoteirosByUser(user.uid),
    ]).then(([revs, tps, rots]) => {
      setReviews(revs)
      setTips(tps)
      setRoteiros(rots)
    })
  }, [user])

  useEffect(() => {
    const r = viewId ? roteiros.find((x) => x.id === viewId) ?? null : null
    if (!r) { setModalWeather(null); setModalRoute(false); setModalPlaceId(null); return }
    fetch(`/api/weather?lat=${r.destination.lat}&lng=${r.destination.lng}`)
      .then((res) => res.json()).then(setModalWeather).catch(() => {})
  }, [viewId])

  async function handleLogout() {
    await signOut(auth)
    setReviews([])
    setTips([])
  }

  async function handleDayTap(dateStr: string) {
    if (!selectedId) return
    const roteiro = roteiros.find((r) => r.id === selectedId)
    if (!roteiro) return
    if (roteiro.scheduledDate === dateStr) {
      await updateRoteiroDate(selectedId, null)
      setRoteiros((prev) => prev.map((r) => r.id === selectedId ? { ...r, scheduledDate: undefined } : r))
    } else {
      await updateRoteiroDate(selectedId, dateStr)
      setRoteiros((prev) => prev.map((r) => r.id === selectedId ? { ...r, scheduledDate: dateStr } : r))
    }
    setSelectedId(null)
  }

  async function handleDeleteRoteiro(id: string) {
    await deleteRoteiro(id)
    setRoteiros((prev) => prev.filter((r) => r.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  if (loading || !user) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="skeleton h-20 w-20 rounded-full mx-auto mb-4" />
        <div className="skeleton h-6 w-40 mx-auto mb-2" />
        <div className="skeleton h-4 w-32 mx-auto" />
      </div>
    )
  }

  const verifiedCount = reviews.filter((r) => r.verified).length
  const isExplorer = verifiedCount >= 5
  const viewRoteiro = viewId ? roteiros.find((r) => r.id === viewId) ?? null : null

  return (
    <div className="max-w-md mx-auto px-4 py-6">

      {/* ── PlaceDetailModal de item do roteiro ── */}
      {modalPlaceId && (
        <PlaceDetailModal placeId={modalPlaceId} onClose={() => setModalPlaceId(null)} />
      )}

      {/* ── RouteModal (destino ou item) ── */}
      {modalRoute && viewRoteiro && (() => {
        const target = modalRoute === true
          ? { lat: viewRoteiro.destination.lat, lng: viewRoteiro.destination.lng, name: viewRoteiro.destination.name }
          : modalRoute
        return (
          <RouteModal
            destLat={target.lat}
            destLng={target.lng}
            destName={target.name}
            mapsUrl={`https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}&travelmode=driving`}
            onClose={() => setModalRoute(false)}
          />
        )
      })()}

      {/* ── Modal de detalhe do roteiro ── */}
      {viewRoteiro && (
        <div className="fixed inset-0 z-[130] flex flex-col justify-end bg-black/60" onClick={() => setViewId(null)}>
          <div
            className="bg-white rounded-t-3xl overflow-hidden flex flex-col"
            style={{ maxHeight: '88vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 truncate max-w-[260px]">{viewRoteiro.name}</h3>
                <p className="text-xs text-gray-400">{viewRoteiro.destination.city}, {viewRoteiro.destination.state}</p>
              </div>
              <button onClick={() => setViewId(null)} className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">✕</button>
            </div>

            {/* Conteúdo scrollável */}
            <div className="overflow-y-auto flex-1">

              {/* Hero foto destino */}
              <div className="relative w-full" style={{ aspectRatio: '16/7' }}>
                {viewRoteiro.destination.photoUrl ? (
                  <img
                    src={viewRoteiro.destination.photoUrl}
                    alt={viewRoteiro.destination.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-5xl">🗺️</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                  <div>
                    <p className="text-white font-extrabold text-lg leading-tight">{viewRoteiro.destination.name}</p>
                    <p className="text-white/70 text-xs">{viewRoteiro.destination.city}, {viewRoteiro.destination.state}</p>
                  </div>
                  {modalWeather && (
                    <div className="bg-black/40 backdrop-blur-sm rounded-xl px-2.5 py-1.5 text-right">
                      <p className="text-white text-sm font-bold">{modalWeather.icon} {modalWeather.temp}°C</p>
                      <p className="text-white/70 text-[10px]">{modalWeather.description}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 flex flex-col gap-4">

                {/* Data agendada + Como chegar destino */}
                <div className="flex gap-2">
                  {viewRoteiro.scheduledDate && (
                    <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
                      <span>📅</span>
                      <p className="text-sm font-bold text-orange-600">{formatDateStr(viewRoteiro.scheduledDate)}</p>
                    </div>
                  )}
                  <button
                    onClick={() => setModalRoute(true)}
                    className="flex-1 py-2 rounded-xl font-bold text-white text-sm"
                    style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #f97316 100%)' }}
                  >
                    📍 Como chegar
                  </button>
                </div>

                {/* Onde comer */}
                {viewRoteiro.eats.length > 0 && (
                  <section>
                    <h4 className="text-sm font-bold text-gray-800 mb-2">🍽️ Onde comer <span className="text-xs font-normal text-gray-400">({viewRoteiro.eats.length})</span></h4>
                    <div className="flex flex-col gap-2">
                      {viewRoteiro.eats.map((e, i) => (
                        <div key={i} className="rounded-xl border border-gray-100 overflow-hidden">
                          {/* Foto */}
                          {e.photoUrl && (
                            <div className="relative w-full" style={{ aspectRatio: '16/6' }}>
                              <img src={e.photoUrl} alt={e.name} className="absolute inset-0 w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{e.name}</p>
                                <p className="text-xs text-gray-400">{e.category} · {e.priceRange}</p>
                                {e.address && <p className="text-xs text-gray-400 truncate">📍 {e.address}</p>}
                              </div>
                              {e.lat && e.lng && (
                                <button
                                  onClick={() => setModalRoute({ lat: e.lat!, lng: e.lng!, name: e.name })}
                                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-orange-500 text-white text-base"
                                >🗺️</button>
                              )}
                            </div>
                            {e.googlePlaceId && (
                              <button onClick={() => setModalPlaceId(e.googlePlaceId!)} className="mt-1.5 text-xs text-orange-500 font-semibold">Ver detalhes →</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Onde dormir */}
                {viewRoteiro.stays.length > 0 && (
                  <section>
                    <h4 className="text-sm font-bold text-gray-800 mb-2">🏡 Onde dormir <span className="text-xs font-normal text-gray-400">({viewRoteiro.stays.length})</span></h4>
                    <div className="flex flex-col gap-2">
                      {viewRoteiro.stays.map((s, i) => (
                        <div key={i} className="rounded-xl border border-gray-100 overflow-hidden">
                          {/* Foto */}
                          {s.photoUrl && (
                            <div className="relative w-full" style={{ aspectRatio: '16/6' }}>
                              <img src={s.photoUrl} alt={s.name} className="absolute inset-0 w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                                <p className="text-xs text-gray-400">{s.category}{s.priceFrom ? ` · a partir de R$${s.priceFrom}/noite` : ''}</p>
                                {s.address && <p className="text-xs text-gray-400 truncate">📍 {s.address}</p>}
                              </div>
                              {s.lat && s.lng && (
                                <button
                                  onClick={() => setModalRoute({ lat: s.lat!, lng: s.lng!, name: s.name })}
                                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-orange-500 text-white text-base"
                                >🗺️</button>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5">
                              {s.googlePlaceId && (
                                <button onClick={() => setModalPlaceId(s.googlePlaceId!)} className="text-xs text-orange-500 font-semibold">Ver detalhes →</button>
                              )}
                              {s.bookingUrl && (
                                <a href={s.bookingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 font-semibold">🔗 Reservar</a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {viewRoteiro.eats.length === 0 && viewRoteiro.stays.length === 0 && (
                  <div className="text-center py-6 text-gray-400 text-sm">
                    <p>Só o destino foi salvo.</p>
                    <a href="/roteiro" className="text-orange-500 font-semibold text-xs mt-2 inline-block">Completar roteiro →</a>
                  </div>
                )}

                <div className="h-4" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cabeçalho do perfil */}
      <div className="card p-5 flex items-center gap-4 mb-5">
        {user.photoURL ? (
          <Image src={user.photoURL} alt={user.displayName || ''} width={60} height={60} className="rounded-full" />
        ) : (
          <div className="w-15 h-15 rounded-full bg-orange-100 flex items-center justify-center text-2xl">👤</div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-gray-900 truncate">{user.displayName}</h2>
          <p className="text-sm text-gray-500 truncate">{user.email}</p>
          {isExplorer && (
            <span className="inline-flex items-center gap-1 mt-1 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-semibold">
              🏅 Explorador verificado
            </span>
          )}
        </div>
        <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-red-500">Sair</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Rolês', value: reviews.length },
          { label: 'Verificadas', value: verifiedCount },
          { label: 'Dicas', value: tips.length },
        ].map((s) => (
          <div key={s.label} className="card p-3 text-center">
            <div className="text-2xl font-bold" style={{ color: '#FF6B35' }}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {reviews.length > 0 && (
        <p className="text-center text-sm text-gray-500 mb-4 font-medium">
          Você já deu <span style={{ color: '#FF6B35' }} className="font-bold">{reviews.length} rolê{reviews.length !== 1 ? 's' : ''}</span>! 🗺️
        </p>
      )}

      {/* Tabs */}
      <div className="flex gap-0 mb-4 border border-gray-200 rounded-xl overflow-hidden">
        {([
          { id: 'roteiros', icon: '🗓️', label: 'Roteiros', count: roteiros.length },
          { id: 'reviews', icon: '⭐', label: 'Reviews', count: reviews.length },
          { id: 'tips', icon: '💡', label: 'Dicas', count: tips.length },
        ] as const).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === t.id ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            {t.icon} {t.label} ({t.count})
          </button>
        ))}
      </div>

      {tab === 'roteiros' && (
        roteiros.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-5xl mb-3">🗓️</div>
            <p className="font-semibold text-gray-700">Nenhum roteiro salvo ainda</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">Escolha um destino e monte seu primeiro rolê completo!</p>
            <a href="/" className="text-sm font-semibold text-orange-500 border border-orange-300 px-4 py-2 rounded-xl">
              Descobrir destinos →
            </a>
          </div>
        ) : (
          <div>
            {/* Instrução quando roteiro selecionado */}
            <div className={`mb-3 text-center text-xs font-semibold rounded-xl py-2 px-3 transition-all ${
              selectedId ? 'bg-orange-50 text-orange-500' : 'bg-gray-50 text-gray-400'
            }`}>
              {selectedId
                ? '📅 Toque uma data no calendário para agendar'
                : 'Selecione um roteiro para agendar no calendário'}
            </div>

            <div className="flex gap-3">

              {/* ── Lista de roteiros ── */}
              <div className="w-[130px] flex-shrink-0 flex flex-col gap-2">
                {roteiros.map((r, i) => {
                  const color = ROTEIRO_COLORS[i % ROTEIRO_COLORS.length]
                  const isSelected = selectedId === r.id
                  return (
                    <div key={r.id} className={`relative rounded-xl border-2 transition-all ${
                      isSelected ? 'border-orange-500 bg-orange-50 shadow-sm' : 'border-gray-100 bg-white'
                    }`}>
                      {/* Tap principal: abre modal */}
                      <button
                        onClick={() => setViewId(r.id)}
                        className="w-full text-left p-2.5 pb-1"
                      >
                        <div className="flex items-start gap-1.5 mb-1">
                          <span className="mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                          <p className="text-xs font-bold text-gray-900 leading-tight line-clamp-2 pr-4">{r.name}</p>
                        </div>
                        <p className="text-xs text-gray-400 truncate pl-4">{r.destination.city}</p>
                        {r.scheduledDate && (
                          <p className="text-xs font-semibold mt-1 pl-4" style={{ color }}>
                            📅 {formatDateStr(r.scheduledDate)}
                          </p>
                        )}
                      </button>
                      {/* Ações */}
                      <div className="flex items-center gap-1 px-2.5 pb-2 pl-4">
                        <button
                          onClick={() => setSelectedId(isSelected ? null : r.id)}
                          className={`flex-1 text-center py-1 rounded-lg text-[10px] font-semibold transition-all ${
                            isSelected ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-orange-100'
                          }`}
                        >
                          📅 Agendar
                        </button>
                        <button
                          onClick={() => handleDeleteRoteiro(r.id)}
                          className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-400 text-xs transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                      {/* Indicator de detalhes */}
                      <div className="absolute top-1.5 right-1.5">
                        <span className="text-[10px] text-gray-300">›</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* ── Calendário ── */}
              <div className="flex-1 min-w-0">
                {/* Navegação do mês */}
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-bold text-base"
                  >
                    ‹
                  </button>
                  <p className="text-xs font-bold text-gray-700 capitalize">
                    {calMonth.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                  </p>
                  <button
                    onClick={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-bold text-base"
                  >
                    ›
                  </button>
                </div>

                {/* Cabeçalho dias */}
                <div className="grid grid-cols-7 mb-0.5">
                  {DAY_HEADERS.map((d, i) => (
                    <div key={i} className="text-center text-[10px] text-gray-400 font-semibold py-0.5">{d}</div>
                  ))}
                </div>

                {/* Células */}
                <div className="grid grid-cols-7 gap-0.5">
                  {getCalendarCells(calMonth.getFullYear(), calMonth.getMonth()).map((day, i) => {
                    if (!day) return <div key={i} />
                    const dateStr = toDateStr(calMonth.getFullYear(), calMonth.getMonth(), day)
                    const assignedIdx = roteiros.findIndex((r) => r.scheduledDate === dateStr)
                    const color = assignedIdx >= 0 ? ROTEIRO_COLORS[assignedIdx % ROTEIRO_COLORS.length] : null
                    const isToday = dateStr === TODAY
                    const isClickable = !!selectedId

                    return (
                      <button
                        key={i}
                        onClick={() => handleDayTap(dateStr)}
                        disabled={!isClickable && !color}
                        className={`aspect-square flex items-center justify-center rounded-lg text-[11px] font-medium transition-all ${
                          isToday && !color ? 'ring-1 ring-orange-400 text-orange-500 font-bold' : ''
                        } ${
                          color ? 'text-white' : isClickable ? 'text-gray-700 hover:bg-orange-100 cursor-pointer' : 'text-gray-500'
                        }`}
                        style={color ? { background: color } : {}}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>

                {/* Legenda */}
                {roteiros.some((r) => r.scheduledDate) && (
                  <div className="mt-3 flex flex-col gap-1">
                    {roteiros.filter((r) => r.scheduledDate).map((r, i) => (
                      <div key={r.id} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ROTEIRO_COLORS[roteiros.indexOf(r) % ROTEIRO_COLORS.length] }} />
                        <span className="text-[10px] text-gray-500 truncate">{r.name} — {formatDateStr(r.scheduledDate!)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )
      )}

      {tab === 'reviews' && (
        <div className="flex flex-col gap-3">
          {reviews.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">Nenhum rolê avaliado ainda. Que tal explorar? 🗺️</p>
          ) : reviews.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((i) => (
                    <span key={i} className={`text-sm ${i <= r.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                  ))}
                </div>
                {r.verified && <span className="text-xs text-green-600 font-semibold">✅ Verificado</span>}
              </div>
              {r.text && <p className="text-sm text-gray-700 mt-1">{r.text}</p>}
            </div>
          ))}
        </div>
      )}

      {tab === 'tips' && (
        <div className="flex flex-col gap-3">
          {tips.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">Nenhuma dica ainda. A galera tá esperando a sua! 💡</p>
          ) : tips.map((t) => (
            <div key={t.id} className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-sm text-gray-800">💡 {t.text}</p>
              <p className="text-xs text-gray-400 mt-1">❤️ {t.likes} curtidas</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
