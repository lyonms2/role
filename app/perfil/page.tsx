'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { signOut } from 'firebase/auth'
import { getReviewsByUser, getRoteirosByUser, getSuggestionsByUser, getMyAdvertiserRequests, deleteReview, deleteRoteiro, updateRoteiroDate, type SavedRoteiro, type AdvertiserRequest } from '@/lib/firestore'
import { useAuth } from '@/lib/auth-context'
import { useRoteiro } from '@/lib/roteiro-context'
import type { Review, Suggestion, WeatherData } from '@/types'
import RouteModal from '@/components/RouteModal'
import PlaceDetailModal from '@/components/PlaceDetailModal'
import Pagination from '@/components/Pagination'
import { getOptimizedUrl } from '@/lib/cloudinary'

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
  const router = useRouter()
  const { user, loading } = useAuth()
  const { setDestination } = useRoteiro()
  const [reviews, setReviews] = useState<Review[]>([])
  const [roteiros, setRoteiros] = useState<SavedRoteiro[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [tab, setTab] = useState<'reviews' | 'sugestoes' | 'roteiros' | 'anuncios'>('roteiros')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewId, setViewId] = useState<string | null>(null)
  const [calMonth, setCalMonth] = useState(() => new Date())
  const [modalWeather, setModalWeather] = useState<WeatherData | null>(null)
  const [modalRoute, setModalRoute] = useState<false | true | { lat: number; lng: number; name: string }>(false)
  const [modalPlaceId, setModalPlaceId] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<{ urls: string[]; idx: number } | null>(null)
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null)
  const [reviewsPage, setReviewsPage] = useState(0)
  const [suggestionsPage, setSuggestionsPage] = useState(0)
  const [roteirosPage, setRoteirosPage] = useState(0)
  const [myAdRequests, setMyAdRequests] = useState<AdvertiserRequest[]>([])

  useEffect(() => {
    if (!user) { setReviews([]); setSuggestions([]); return }
    getReviewsByUser(user.uid).then(setReviews).catch((e) => console.error('reviews:', e))
    getRoteirosByUser(user.uid).then(setRoteiros).catch((e) => console.error('roteiros:', e))
    getSuggestionsByUser(user.uid).then(setSuggestions).catch((e) => console.error('sugestões:', e))
    getMyAdvertiserRequests(user.uid).then(setMyAdRequests).catch(() => {})
  }, [user])

  useEffect(() => {
    const r = viewId ? roteiros.find((x) => x.id === viewId) ?? null : null
    if (!r) { setModalWeather(null); setModalRoute(false); setModalPlaceId(null); return }
    fetch(`/api/weather?lat=${r.destination.lat}&lng=${r.destination.lng}`)
      .then((res) => res.json()).then(setModalWeather).catch(() => {})
  }, [viewId])

  async function handleDeleteReview(r: Review) {
    await deleteReview(r.id, r.placeId, r.rating, r.photos)
    setReviews((prev) => prev.filter((x) => x.id !== r.id))
    setDeletingReviewId(null)
  }

  async function handleLogout() {
    await signOut(auth)
    setReviews([])
    setSuggestions([])
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

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/20 text-white text-lg" onClick={() => setLightbox(null)}>✕</button>
          <img src={lightbox.urls[lightbox.idx]} alt="" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
          {lightbox.idx > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox({ ...lightbox, idx: lightbox.idx - 1 }) }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 text-white text-xl font-bold"
            >‹</button>
          )}
          {lightbox.idx < lightbox.urls.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox({ ...lightbox, idx: lightbox.idx + 1 }) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 text-white text-xl font-bold"
            >›</button>
          )}
          {lightbox.urls.length > 1 && (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs">{lightbox.idx + 1} / {lightbox.urls.length}</p>
          )}
        </div>
      )}

      {/* ── PlaceDetailModal de item do roteiro ── */}
      {modalPlaceId && (
        <PlaceDetailModal placeId={modalPlaceId} onClose={() => setModalPlaceId(null)} zIndex={150} />
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
            zIndex={150}
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
              <h3 className="font-bold text-gray-900 truncate max-w-[280px]">{viewRoteiro.name}</h3>
              <button onClick={() => setViewId(null)} className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">✕</button>
            </div>

            {/* Conteúdo scrollável */}
            <div className="overflow-y-auto flex-1">

              <div className="p-4 flex flex-col gap-4">

                {/* Card destino */}
                <section>
                  <h4 className="text-sm font-bold text-gray-800 mb-2">📍 Destino</h4>
                  <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                    <div className="flex">
                      {viewRoteiro.destination.photoUrl ? (
                        <div className="relative w-20 h-20 flex-shrink-0">
                          <img src={getOptimizedUrl(viewRoteiro.destination.photoUrl, 160)} alt={viewRoteiro.destination.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                          <button onClick={() => setLightbox({ urls: [viewRoteiro.destination.photoUrl!], idx: 0 })} className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-black/40 text-white text-[9px]">⛶</button>
                        </div>
                      ) : (
                        <div className="w-20 h-20 flex-shrink-0 bg-orange-50 flex items-center justify-center text-2xl">🗺️</div>
                      )}
                      <div className="flex-1 p-3 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-800 truncate">{viewRoteiro.destination.name}</p>
                            {modalWeather && (
                              <span className="text-xs bg-blue-50 text-blue-600 rounded-md px-1.5 py-0.5 flex-shrink-0">{modalWeather.icon} {modalWeather.temp}°C</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">{viewRoteiro.destination.city}, {viewRoteiro.destination.state}</p>
                          {viewRoteiro.scheduledDate && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-xs">📅</span>
                              <p className="text-xs font-bold text-orange-600">{formatDateStr(viewRoteiro.scheduledDate)}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <button onClick={() => setModalRoute(true)} className="text-xs font-bold text-white bg-orange-500 rounded-lg px-2.5 py-1">🗺️ Como chegar</button>
                          {viewRoteiro.destination.googlePlaceId && (
                            <button onClick={() => setModalPlaceId(viewRoteiro.destination.googlePlaceId!)} className="text-xs text-orange-500 font-semibold">Ver detalhes →</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Eventos */}
                {viewRoteiro.events.length > 0 && (
                  <section>
                    <h4 className="text-sm font-bold text-gray-800 mb-2">🎭 Eventos <span className="text-xs font-normal text-gray-400">({viewRoteiro.events.length})</span></h4>
                    <div className="flex flex-col gap-2">
                      {viewRoteiro.events.map((ev, i) => {
                        let dateStr = ''
                        try {
                          const d = (ev.date as any)?.toDate ? (ev.date as any).toDate() : new Date(((ev.date as any)?.seconds ?? 0) * 1000)
                          dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                        } catch {}
                        return (
                          <div key={i} className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                            <div className="flex">
                              {(ev as any).photoUrl ? (
                                <div className="relative w-20 h-20 flex-shrink-0">
                                  <img src={getOptimizedUrl((ev as any).photoUrl, 160)} alt={ev.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                                </div>
                              ) : (
                                <div className="w-20 h-20 flex-shrink-0 bg-purple-50 flex items-center justify-center text-2xl">🎭</div>
                              )}
                              <div className="flex-1 p-3 min-w-0 flex flex-col justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-gray-800 truncate">{ev.name}</p>
                                  <p className="text-xs text-gray-400">{ev.category}</p>
                                  {ev.venue && <p className="text-xs text-gray-400 truncate">📍 {ev.venue}</p>}
                                  {dateStr && <p className="text-xs font-semibold text-purple-600 mt-0.5">📅 {dateStr}</p>}
                                </div>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  {(ev as any).mapsLink && (
                                    <a href={(ev as any).mapsLink} target="_blank" rel="noopener noreferrer"
                                      className="text-xs font-bold text-white bg-orange-500 rounded-lg px-2.5 py-1">
                                      🗺️ Como chegar
                                    </a>
                                  )}
                                  <a href={`/evento/${ev.id}`}
                                    className="text-xs text-purple-500 font-semibold">
                                    Ver evento →
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )}

                {/* Onde comer */}
                {viewRoteiro.eats.length > 0 && (
                  <section>
                    <h4 className="text-sm font-bold text-gray-800 mb-2">🍽️ Onde comer <span className="text-xs font-normal text-gray-400">({viewRoteiro.eats.length})</span></h4>
                    <div className="flex flex-col gap-2">
                      {viewRoteiro.eats.map((e, i) => {
                        const mapsUrl = e.lat && e.lng
                          ? null
                          : e.googlePlaceId
                          ? `https://www.google.com/maps/place/?q=place_id:${e.googlePlaceId}`
                          : null
                        return (
                          <div key={i} className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                            <div className="flex">
                              {e.photoUrl && (
                                <div className="relative w-20 h-20 flex-shrink-0">
                                  <img src={getOptimizedUrl(e.photoUrl!, 160)} alt={e.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                                  <button
                                    onClick={() => setLightbox({ urls: [e.photoUrl!], idx: 0 })}
                                    className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-black/40 text-white text-[9px]"
                                  >⛶</button>
                                </div>
                              )}
                              <div className="flex-1 p-3 min-w-0 flex flex-col justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-gray-800 truncate">{e.name}</p>
                                  <p className="text-xs text-gray-400">{e.category} · {e.priceRange}</p>
                                  {e.address && <p className="text-xs text-gray-400 truncate">📍 {e.address}</p>}
                                </div>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  {e.lat && e.lng ? (
                                    <button
                                      onClick={() => setModalRoute({ lat: e.lat!, lng: e.lng!, name: e.name })}
                                      className="text-xs font-bold text-white bg-orange-500 rounded-lg px-2.5 py-1"
                                    >🗺️ Como chegar</button>
                                  ) : mapsUrl ? (
                                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                                      className="text-xs font-bold text-white bg-orange-500 rounded-lg px-2.5 py-1">
                                      🗺️ Como chegar
                                    </a>
                                  ) : null}
                                  {e.googlePlaceId && (
                                    <button onClick={() => setModalPlaceId(e.googlePlaceId!)} className="text-xs text-orange-500 font-semibold">Ver detalhes →</button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )}

                {/* Onde dormir */}
                {viewRoteiro.stays.length > 0 && (
                  <section>
                    <h4 className="text-sm font-bold text-gray-800 mb-2">🏡 Onde dormir <span className="text-xs font-normal text-gray-400">({viewRoteiro.stays.length})</span></h4>
                    <div className="flex flex-col gap-2">
                      {viewRoteiro.stays.map((s, i) => {
                        const mapsUrl = s.lat && s.lng
                          ? null
                          : s.googlePlaceId
                          ? `https://www.google.com/maps/place/?q=place_id:${s.googlePlaceId}`
                          : null
                        return (
                          <div key={i} className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                            <div className="flex">
                              {s.photoUrl && (
                                <div className="relative w-20 h-20 flex-shrink-0">
                                  <img src={getOptimizedUrl(s.photoUrl!, 160)} alt={s.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                                  <button
                                    onClick={() => setLightbox({ urls: [s.photoUrl!], idx: 0 })}
                                    className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-black/40 text-white text-[9px]"
                                  >⛶</button>
                                </div>
                              )}
                              <div className="flex-1 p-3 min-w-0 flex flex-col justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                                  <p className="text-xs text-gray-400">{s.category}{s.priceFrom ? ` · R$${s.priceFrom}/noite` : ''}</p>
                                  {s.address && <p className="text-xs text-gray-400 truncate">📍 {s.address}</p>}
                                </div>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  {s.lat && s.lng ? (
                                    <button
                                      onClick={() => setModalRoute({ lat: s.lat!, lng: s.lng!, name: s.name })}
                                      className="text-xs font-bold text-white bg-orange-500 rounded-lg px-2.5 py-1"
                                    >🗺️ Como chegar</button>
                                  ) : mapsUrl ? (
                                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                                      className="text-xs font-bold text-white bg-orange-500 rounded-lg px-2.5 py-1">
                                      🗺️ Como chegar
                                    </a>
                                  ) : null}
                                  {s.googlePlaceId && (
                                    <button onClick={() => setModalPlaceId(s.googlePlaceId!)} className="text-xs text-orange-500 font-semibold">Ver detalhes →</button>
                                  )}
                                  {s.bookingUrl && (
                                    <a href={s.bookingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 font-semibold">🔗 Reservar</a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )}

                {viewRoteiro.events.length === 0 && viewRoteiro.eats.length === 0 && viewRoteiro.stays.length === 0 && (
                  <div className="text-center py-6 text-gray-400 text-sm">
                    <p>Só o destino foi salvo.</p>
                    <button
                      onClick={() => {
                        setDestination({ ...viewRoteiro.destination })
                        router.push(`/roteiro?update=${viewRoteiro.id}`)
                      }}
                      className="text-orange-500 font-semibold text-xs mt-2 inline-block"
                    >
                      Completar roteiro →
                    </button>
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
          { label: 'Roteiros', value: roteiros.length },
          { label: 'Sugestões', value: suggestions.length },
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
      <div className="grid grid-cols-2 gap-1.5 mb-4">
        {([
          { id: 'roteiros',  icon: '🗓️', label: 'Roteiros',  count: roteiros.length },
          { id: 'reviews',   icon: '⭐', label: 'Reviews',   count: reviews.length },
          { id: 'sugestoes', icon: '📝', label: 'Sugestões', count: suggestions.length },
          { id: 'anuncios',  icon: '📣', label: 'Anúncios',  count: myAdRequests.length },
        ] as const).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`py-2.5 text-sm font-semibold rounded-xl border transition-colors ${
              tab === t.id ? 'bg-orange-500 text-white border-orange-500' : 'text-gray-500 border-gray-200 hover:bg-gray-50'
            }`}>
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
                {roteiros.slice(roteirosPage * 5, (roteirosPage + 1) * 5).map((r, i) => {
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
                {roteiros.length > 5 && (
                  <div className="flex justify-between pt-1">
                    <button disabled={roteirosPage === 0} onClick={() => setRoteirosPage((p) => p - 1)}
                      className="text-[10px] font-semibold text-gray-400 disabled:opacity-30 hover:text-orange-500 transition-colors">‹ ant</button>
                    <span className="text-[10px] text-gray-400">{roteirosPage + 1}/{Math.ceil(roteiros.length / 5)}</span>
                    <button disabled={roteirosPage >= Math.ceil(roteiros.length / 5) - 1} onClick={() => setRoteirosPage((p) => p + 1)}
                      className="text-[10px] font-semibold text-gray-400 disabled:opacity-30 hover:text-orange-500 transition-colors">próx ›</button>
                  </div>
                )}
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
        <div className="flex flex-col gap-3 stagger">
          {reviews.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">Nenhum rolê avaliado ainda. Que tal explorar? 🗺️</p>
          ) : reviews.slice(reviewsPage * 5, (reviewsPage + 1) * 5).map((r) => (
            <div key={r.id} className="card p-4 flex flex-col gap-2">
              {/* Cabeçalho: lugar + botão excluir */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {r.placeName && (
                    r.googlePlaceId ? (
                      <a href={`/destino/google/${r.googlePlaceId}`} className="flex items-center gap-1.5 group">
                        <span className="text-orange-500 text-sm">📍</span>
                        <span className="text-sm font-bold text-gray-900 group-hover:text-orange-500 transition-colors">{r.placeName}</span>
                        <span className="text-xs text-gray-400 group-hover:text-orange-400 transition-colors">→</span>
                      </a>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-orange-500 text-sm">📍</span>
                        <span className="text-sm font-bold text-gray-900">{r.placeName}</span>
                      </div>
                    )
                  )}
                </div>
                {deletingReviewId === r.id ? (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => setDeletingReviewId(null)} className="text-xs text-gray-400 px-2 py-1 rounded-lg bg-gray-100">Cancelar</button>
                    <button onClick={() => handleDeleteReview(r)} className="text-xs text-white px-2 py-1 rounded-lg bg-red-500 font-semibold">Confirmar</button>
                  </div>
                ) : (
                  <button onClick={() => setDeletingReviewId(r.id)} className="text-gray-300 hover:text-red-400 transition-colors text-base flex-shrink-0">🗑️</button>
                )}
              </div>
              {/* Nota e verificado */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map((i) => (
                    <span key={i} className={`text-sm ${i <= r.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                  ))}
                </div>
                {r.verified && <span className="text-xs text-green-600 font-semibold">✅ Verificado</span>}
              </div>
              {r.text && <p className="text-sm text-gray-700">{r.text}</p>}
              {r.photos && r.photos.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto">
                  {r.photos.map((url, pi) => (
                    <button key={pi} onClick={() => setLightbox({ urls: r.photos!, idx: pi })} className="flex-shrink-0">
                      <img src={getOptimizedUrl(url, 128)} alt="" className="h-16 w-16 object-cover rounded-lg hover:opacity-80 transition-opacity cursor-zoom-in" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {reviews.length > 5 && (
            <Pagination page={reviewsPage} totalPages={Math.ceil(reviews.length / 5)} onPrev={() => setReviewsPage((p) => p - 1)} onNext={() => setReviewsPage((p) => p + 1)} />
          )}
        </div>
      )}

      {tab === 'sugestoes' && (
        <div className="flex flex-col gap-3 stagger">
          {suggestions.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-5xl mb-3">📝</div>
              <p className="font-semibold text-gray-700">Nenhuma sugestão enviada</p>
              <p className="text-sm text-gray-400 mt-1 mb-4">Encontrou um lugar incrível? Sugira para a comunidade!</p>
              <a href="/sugerir" className="text-sm font-semibold text-orange-500 border border-orange-300 px-4 py-2 rounded-xl">
                Sugerir um lugar →
              </a>
            </div>
          ) : suggestions.slice(suggestionsPage * 5, (suggestionsPage + 1) * 5).map((s) => {
            const statusMap = {
              pending: { label: '⏳ Aguardando aprovação', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
              approved: { label: '✅ Aprovado', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
              rejected: { label: '❌ Não aprovado', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600' },
            }
            const status = statusMap[s.status] ?? statusMap.pending
            return (
              <div key={s.id} className={`rounded-xl border p-4 flex flex-col gap-2 ${status.bg} ${status.border}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.city}, {s.state} · {s.category}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${status.text}`}>
                    {status.label}
                  </span>
                </div>
                {s.description && (
                  <p className="text-xs text-gray-600 line-clamp-2">{s.description}</p>
                )}
              </div>
            )
          })}
          {suggestions.length > 5 && (
            <Pagination page={suggestionsPage} totalPages={Math.ceil(suggestions.length / 5)} onPrev={() => setSuggestionsPage((p) => p - 1)} onNext={() => setSuggestionsPage((p) => p + 1)} />
          )}
        </div>
      )}

      {tab === 'anuncios' && (
        <div className="flex flex-col gap-3 stagger">
          {myAdRequests.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-5xl mb-3">📣</div>
              <p className="font-semibold text-gray-700">Nenhum anúncio enviado ainda</p>
              <p className="text-sm text-gray-400 mt-1 mb-6">Divulgue seu evento, restaurante ou hospedagem para quem já escolheu o destino.</p>
              <div className="flex flex-col gap-2">
                {[
                  { emoji: '🎭', label: 'Anunciar evento',      href: '/anunciar?tipo=evento',   color: 'text-purple-600 bg-purple-50 border-purple-100' },
                  { emoji: '🍽️', label: 'Anunciar restaurante', href: '/anunciar?tipo=comer',    color: 'text-orange-600 bg-orange-50 border-orange-100' },
                  { emoji: '🏡', label: 'Anunciar hospedagem',  href: '/anunciar?tipo=hospedar', color: 'text-green-700 bg-green-50 border-green-100'  },
                ].map((item) => (
                  <a key={item.href} href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors hover:opacity-80 ${item.color}`}>
                    <span className="text-lg">{item.emoji}</span>
                    {item.label}
                    <span className="ml-auto text-xs font-normal opacity-60">→</span>
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <>
              {myAdRequests.map((req) => {
                const typeEmoji = req.type === 'evento' ? '🎭' : req.type === 'comer' ? '🍽️' : '🏡'
                const typeLabel = req.type === 'evento' ? 'Evento' : req.type === 'comer' ? 'Restaurante' : 'Hospedagem'
                const date = (req as any).createdAt?.toDate?.()
                const dateStr = date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
                const statusCfg = req.status === 'approved'
                  ? { label: 'Publicado', cls: 'bg-green-100 text-green-700' }
                  : req.status === 'rejected'
                  ? { label: 'Não aprovado', cls: 'bg-red-100 text-red-600' }
                  : { label: 'Em análise', cls: 'bg-yellow-100 text-yellow-700' }
                return (
                  <div key={req.id} className="flex items-start gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <span className="text-2xl flex-shrink-0">{typeEmoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{req.name}</p>
                      <p className="text-xs text-gray-500">{typeLabel} · {req.city}, {req.state}</p>
                      {dateStr && <p className="text-xs text-gray-400 mt-0.5">Enviado em {dateStr}</p>}
                    </div>
                    <span className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full ${statusCfg.cls}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                )
              })}
              <div className="mt-2 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 text-center mb-3">Quer anunciar mais?</p>
                <div className="flex flex-col gap-2">
                  {[
                    { emoji: '🎭', label: 'Anunciar evento',      href: '/anunciar?tipo=evento',   color: 'text-purple-600 bg-purple-50 border-purple-100' },
                    { emoji: '🍽️', label: 'Anunciar restaurante', href: '/anunciar?tipo=comer',    color: 'text-orange-600 bg-orange-50 border-orange-100' },
                    { emoji: '🏡', label: 'Anunciar hospedagem',  href: '/anunciar?tipo=hospedar', color: 'text-green-700 bg-green-50 border-green-100'  },
                  ].map((item) => (
                    <a key={item.href} href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors hover:opacity-80 ${item.color}`}>
                      <span className="text-lg">{item.emoji}</span>
                      {item.label}
                      <span className="ml-auto text-xs font-normal opacity-60">→</span>
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
