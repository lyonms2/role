'use client'

import { useEffect, useState } from 'react'
import RouteModal from './RouteModal'
import { getEventById, getEventReviews } from '@/lib/firestore'
import { isEventExpired } from '@/lib/events'
import { getOptimizedUrl } from '@/lib/cloudinary'
import type { RoleEvent, EventReview } from '@/types'
import { EVENT_CATEGORY_LABELS } from '@/types'

function toDate(ts: any): Date {
  if (!ts) return new Date(0)
  if (ts.toDate) return ts.toDate()
  if (ts.seconds) return new Date(ts.seconds * 1000)
  return new Date(ts)
}

function fmt(ts: any, opts: Intl.DateTimeFormatOptions) {
  try { return toDate(ts).toLocaleDateString('pt-BR', opts) } catch { return '' }
}

interface Props {
  eventId: string
  onClose: () => void
  zIndex?: number
}

export default function EventDetailModal({ eventId, onClose, zIndex = 120 }: Props) {
  const [event, setEvent] = useState<RoleEvent | null>(null)
  const [reviews, setReviews] = useState<EventReview[]>([])
  const [loading, setLoading] = useState(true)
  const [showRoute, setShowRoute] = useState(false)
  const [lightbox, setLightbox] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    Promise.all([getEventById(eventId), getEventReviews(eventId)]).then(([ev, revs]) => {
      setEvent(ev)
      setReviews(revs)
      setLoading(false)
    })
  }, [eventId])

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  const expired = event ? isEventExpired(event) : false
  const label = event ? (EVENT_CATEGORY_LABELS[event.category] || event.category) : ''
  const mapsUrl = event?.mapsLink || (event?.lat ? `https://www.google.com/maps?q=${event.lat},${event.lng}` : '')

  return (
    <div className="fixed inset-0 flex flex-col bg-black/60" style={{ zIndex }} onClick={onClose}>

      {lightbox && event?.photoUrl && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center"
          style={{ zIndex: zIndex + 80 }}
          onClick={(e) => { e.stopPropagation(); setLightbox(false) }}
        >
          <button
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/20 text-white text-lg"
            onClick={() => setLightbox(false)}
          >✕</button>
          <img
            src={getOptimizedUrl(event.photoUrl, 1200)}
            alt={event.name}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {showRoute && event?.lat && event?.lng && (
        <RouteModal
          destLat={event.lat}
          destLng={event.lng}
          destName={event.venue || event.name}
          mapsUrl={mapsUrl}
          onClose={() => setShowRoute(false)}
          zIndex={zIndex + 10}
        />
      )}

      <div
        className="bg-white flex flex-col mt-16 rounded-t-3xl overflow-hidden flex-1"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">🎭 {label}</span>
            <p className="font-bold text-gray-900 text-base truncate">
              {loading ? '...' : (event?.name || 'Detalhes do evento')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors ml-2"
          >✕</button>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col gap-3 p-4">
              <div className="skeleton h-52 w-full rounded-xl" />
              <div className="skeleton h-6 w-2/3" />
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-16 w-full rounded-xl" />
            </div>
          ) : !event ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-2">😕</div>
              <p>Não foi possível carregar o evento.</p>
            </div>
          ) : (
            <div className="flex flex-col">

              {/* Flyer */}
              {event.photoUrl ? (
                <div className="relative bg-gray-900 flex-shrink-0">
                  <img
                    src={getOptimizedUrl(event.photoUrl, 800)}
                    alt={event.name}
                    className="w-full object-contain max-h-64 cursor-zoom-in"
                    onClick={() => setLightbox(true)}
                  />
                  <button
                    onClick={() => setLightbox(true)}
                    className="absolute bottom-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white text-sm font-bold"
                  >⛶</button>
                  {expired && (
                    <span className="absolute top-3 left-3 text-xs font-semibold px-2 py-1 rounded-full bg-gray-800/90 text-white">
                      📅 Já aconteceu
                    </span>
                  )}
                </div>
              ) : (
                <div className="h-28 bg-gradient-to-br from-purple-500 to-purple-800 flex items-center justify-center text-5xl flex-shrink-0">🎭</div>
              )}

              <div className="px-4 py-4 flex flex-col gap-4">

                {/* Nome + rating */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 leading-tight">{event.name}</h2>
                  {avgRating && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-yellow-400 text-sm">★</span>
                      <span className="text-sm font-semibold text-gray-700">{avgRating}</span>
                      <span className="text-xs text-gray-400">({reviews.length} avaliação{reviews.length !== 1 ? 'ões' : ''})</span>
                    </div>
                  )}
                </div>

                {/* Card detalhes */}
                <div className="bg-purple-50 border border-purple-100 rounded-2xl px-4 py-4 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">📅</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 capitalize">
                        {fmt(event.date, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-purple-700 font-medium mt-0.5">
                        {fmt(event.date, { hour: '2-digit', minute: '2-digit' } as any)}
                        {event.endDate ? ` – ${fmt(event.endDate, { hour: '2-digit', minute: '2-digit' } as any)}` : ''}
                      </p>
                    </div>
                  </div>
                  {event.venue && (
                    <div className="flex items-start gap-3">
                      <span className="text-lg mt-0.5">📍</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{event.venue}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{event.city}, {event.state}</p>
                      </div>
                    </div>
                  )}
                  {event.price && (
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🎟️</span>
                      <p className="text-sm font-semibold text-gray-800">{event.price}</p>
                    </div>
                  )}
                </div>

                {/* Descrição */}
                {event.description && (
                  <p className="text-sm text-gray-600 leading-relaxed">{event.description}</p>
                )}

                {/* Ações */}
                <div className="flex flex-col gap-2.5">
                  {event.ticketUrl && !expired && (
                    <a
                      href={event.ticketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 rounded-xl font-bold text-white text-sm text-center bg-purple-600 hover:bg-purple-700 transition-colors"
                    >
                      🎟️ Comprar ingressos
                    </a>
                  )}
                  {(event.mapsLink || (event.lat && event.lng)) && (
                    <button
                      onClick={() => setShowRoute(true)}
                      className="w-full py-3 rounded-xl font-bold text-sm text-center border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      🗺️ Como chegar
                    </button>
                  )}
                </div>

                {/* Avaliações */}
                <div className="pt-1 pb-4">
                  <h3 className="font-bold text-gray-900 text-sm mb-3">
                    Avaliações {reviews.length > 0 && <span className="text-gray-400 font-normal">({reviews.length})</span>}
                  </h3>
                  {reviews.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Nenhuma avaliação ainda.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {reviews.map((r) => (
                        <div key={r.id} className="bg-gray-50 rounded-2xl p-3 flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            {r.userPhoto ? (
                              <img src={r.userPhoto} alt={r.userName} className="w-7 h-7 rounded-full object-cover" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold">
                                {r.userName[0]?.toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-800 truncate">{r.userName}</p>
                            </div>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <span key={i} className={`text-xs ${i <= r.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap text-xs">
                            <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-600">
                              {r.crowded === 'nao' ? '😌 Tranquilo' : r.crowded === 'moderado' ? '🙂 Moderado' : '🎉 Lotado'}
                            </span>
                            <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-600">
                              {r.familyFriendly ? '👨‍👩‍👧 Família OK' : '🔞 Adulto'}
                            </span>
                          </div>
                          {r.text && <p className="text-xs text-gray-700 leading-relaxed">{r.text}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
