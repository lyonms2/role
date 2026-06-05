'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getEventById, getEventReviews, hasUserReviewedEvent, deleteEventReview, reportReview, hasUserReportedReview } from '@/lib/firestore'
import { isEventExpired } from '@/lib/events'
import { effectiveDate, getRecurrenceLabel } from '@/lib/recurrence'
import { auth } from '@/lib/firebase'
import { useRoteiro } from '@/lib/roteiro-context'
import type { RoleEvent, EventReview } from '@/types'
import { EVENT_CATEGORY_LABELS } from '@/types'
import Lightbox from '@/components/Lightbox'
import EventReviewForm from '@/components/EventReviewForm'
import RouteModal from '@/components/RouteModal'
import { getOptimizedUrl } from '@/lib/cloudinary'

function toDate(ts: any): Date {
  if (!ts) return new Date(0)
  if (ts.toDate) return ts.toDate()
  if (ts.seconds) return new Date(ts.seconds * 1000)
  return new Date(ts)
}

function formatDate(ts: any): string {
  try {
    return toDate(ts).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  } catch { return '' }
}

function formatTime(ts: any): string {
  try {
    return toDate(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function isSameDay(a: any, b: any): boolean {
  try {
    return toDate(a).toDateString() === toDate(b).toDateString()
  } catch { return false }
}

function avgRating(reviews: EventReview[]): string {
  if (!reviews.length) return ''
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
  return avg.toFixed(1)
}

export default function EventoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { setDestination, toggleEvent } = useRoteiro()
  const [event, setEvent] = useState<RoleEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(false)
  const [showRoute, setShowRoute] = useState(false)
  const [durationMin, setDurationMin] = useState<number | null>(null)
  const [reviews, setReviews] = useState<EventReview[]>([])
  const [alreadyReviewed, setAlreadyReviewed] = useState(false)
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null)
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null)
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    getEventById(id).then((ev) => { setEvent(ev); setLoading(false) })
    getEventReviews(id).then(setReviews)
  }, [id])

  useEffect(() => {
    const user = auth.currentUser
    if (user) hasUserReviewedEvent(user.uid, id).then(setAlreadyReviewed)
  }, [id])

  useEffect(() => {
    if (!event?.lat || !event?.lng) return
    navigator.geolocation?.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(`/api/distance?origin=${pos.coords.latitude},${pos.coords.longitude}&destinations=${event.lat},${event.lng}`)
        const data = await res.json()
        if (data.results?.[0]?.durationMin) setDurationMin(data.results[0].durationMin)
      } catch {}
    }, () => {}, { timeout: 10000, enableHighAccuracy: false })
  }, [event])

  function handleReviewSuccess() {
    getEventReviews(id).then(setReviews)
    setAlreadyReviewed(true)
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6 flex flex-col gap-4">
        <div className="skeleton h-8 w-2/3" />
        <div className="skeleton h-72 w-full rounded-2xl" />
        <div className="skeleton h-24 w-full rounded-2xl" />
        <div className="skeleton h-12 w-full rounded-xl" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-3">🎭</div>
        <p className="font-bold text-gray-800">Evento não encontrado</p>
        <Link href="/eventos" className="text-sm text-purple-500 mt-3 inline-block">← Ver todos os eventos</Link>
      </div>
    )
  }

  const label = EVENT_CATEGORY_LABELS[event.category] || event.category
  const expired = isEventExpired(event)
  const sameDay = event.endDate ? isSameDay(event.date, event.endDate) : true
  const rating = avgRating(reviews)

  return (
    <div className="max-w-lg mx-auto pb-24">

      {lightbox && event.photoUrl && (
        <Lightbox photos={[event.photoUrl]} onClose={() => setLightbox(false)} />
      )}

      {showRoute && event.lat && event.lng && (
        <RouteModal
          destLat={event.lat}
          destLng={event.lng}
          destName={event.venue || event.name}
          mapsUrl={event.mapsLink || `https://www.google.com/maps?q=${event.lat},${event.lng}`}
          onClose={() => setShowRoute(false)}
        />
      )}

      {/* Topo: navegação */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          ← Voltar
        </button>
        <span className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full">
          🎭 {label}
        </span>
      </div>

      <div className="px-4 flex flex-col gap-5">

        {/* Nome do evento */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{event.name}</h1>
          {reviews.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-yellow-400 text-sm">★</span>
              <span className="text-sm font-semibold text-gray-700">{rating}</span>
              <span className="text-xs text-gray-400">({reviews.length} avaliação{reviews.length !== 1 ? 'ões' : ''})</span>
            </div>
          )}
        </div>

        {/* Flyer completo */}
        {event.photoUrl && (
          <button
            onClick={() => setLightbox(true)}
            className="w-full rounded-2xl overflow-hidden bg-gray-900 focus:outline-none cursor-zoom-in shadow-md"
          >
            <img
              src={getOptimizedUrl(event.photoUrl, 1200)}
              alt={`Flyer — ${event.name}`}
              className="w-full object-contain max-h-[70vh]"
            />
          </button>
        )}

        {!event.photoUrl && (
          <div className="h-32 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-800 flex items-center justify-center text-6xl">🎭</div>
        )}

        {/* Banner evento expirado */}
        {expired && (
          <div className="bg-gray-100 border border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl flex-shrink-0">📅</span>
            <div>
              <p className="text-sm font-semibold text-gray-700">Este evento já aconteceu</p>
              <p className="text-xs text-gray-500 mt-0.5">Mas você ainda pode ver as avaliações de quem foi!</p>
            </div>
          </div>
        )}

        {/* Card de detalhes */}
        <div className="bg-purple-50 border border-purple-100 rounded-2xl px-4 py-4 flex flex-col gap-3">

          {/* Data e horário */}
          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5">📅</span>
            <div>
              {event.recurrence ? (
                <>
                  <p className="text-sm font-semibold text-purple-700">
                    🔁 {getRecurrenceLabel(toDate(event.date), event.recurrence)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 capitalize">
                    Próxima: {effectiveDate(toDate(event.date), event.recurrence).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                    {' · '}{formatTime(event.date)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-gray-800 capitalize">{formatDate(event.date)}</p>
                  {!sameDay && event.endDate && (
                    <p className="text-xs text-purple-600 mt-0.5 capitalize">até {formatDate(event.endDate)}</p>
                  )}
                  <p className="text-xs text-purple-700 font-medium mt-0.5">
                    {formatTime(event.date)}{event.endDate ? ` – ${formatTime(event.endDate)}` : ''}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Local */}
          {event.venue && (
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">📍</span>
              <div>
                {event.mapsLink ? (
                  <a href={event.mapsLink} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-semibold text-gray-800 hover:text-purple-600 transition-colors">
                    {event.venue}
                  </a>
                ) : (
                  <p className="text-sm font-semibold text-gray-800">{event.venue}</p>
                )}
                <p className="text-xs text-gray-500 mt-0.5">{event.city}, {event.state}</p>
              </div>
            </div>
          )}

          {/* Preço */}
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
        {!expired && (
          <div className="flex flex-col gap-2.5">
            {event.ticketUrl && (
              <a
                href={event.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 rounded-xl font-bold text-white text-sm text-center bg-purple-600 hover:bg-purple-700 transition-colors shadow-sm"
              >
                🎟️ Comprar ingressos
              </a>
            )}
            {(event.mapsLink || (event.lat && event.lng)) && (
              <button
                onClick={() => setShowRoute(true)}
                className="w-full py-3 rounded-xl font-bold text-sm text-center border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                🗺️ Como chegar{durationMin != null ? ` (~${durationMin >= 60 ? `${Math.floor(durationMin / 60)}h${durationMin % 60 > 0 ? `${durationMin % 60}min` : ''}` : `${durationMin}min`})` : ''}
              </button>
            )}

            {/* CTA principal: montar roteiro */}
            <button
              onClick={() => {
                setDestination({
                  id: event.id,
                  name: event.name,
                  city: event.city,
                  state: event.state,
                  lat: event.lat ?? 0,
                  lng: event.lng ?? 0,
                  photoUrl: event.photoUrl,
                  source: 'event',
                })
                toggleEvent({
                  id: event.id,
                  name: event.name,
                  city: event.city,
                  venue: event.venue || '',
                  date: event.date,
                  category: event.category,
                  photoUrl: event.photoUrl,
                  mapsLink: event.mapsLink,
                })
                router.push('/roteiro')
              }}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm bg-orange-500 hover:bg-orange-600 transition-colors shadow-sm"
            >
              🗓️ Quero ir — montar roteiro
            </button>
          </div>
        )}

        {/* Avaliações */}
        <div className="pt-1">
          <h2 className="font-bold text-gray-900 text-base mb-3">
            Avaliações {reviews.length > 0 && <span className="text-gray-400 font-normal text-sm">({reviews.length})</span>}
          </h2>

          {!alreadyReviewed && (
            <div className="mb-4">
              <EventReviewForm eventId={event.id} eventName={event.name} placeLat={event.lat} placeLng={event.lng} onSuccess={handleReviewSuccess} />
            </div>
          )}

          {reviews.length === 0 && alreadyReviewed && (
            <p className="text-sm text-gray-400 text-center py-4">Seja o primeiro a avaliar esse evento!</p>
          )}

          <div className="flex flex-col gap-3">
            {reviews.map((r) => {
              const currentUid = auth.currentUser?.uid
              const isOwner = !!currentUid && currentUid === r.userId
              return (
                <div key={r.id} className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {r.userPhoto ? (
                      <Image src={r.userPhoto} alt={r.userName} width={32} height={32} className="rounded-full object-cover" unoptimized />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold">
                        {r.userName[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800 truncate">{r.userName}</p>
                        {r.reviewerRank && <span className="bg-orange-50 text-orange-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">{r.reviewerRank}</span>}
                        {r.verified && <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">✅ Verificado</span>}
                      </div>
                      <p className="text-xs text-gray-400">
                        {r.createdAt?.toDate?.().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <span key={i} className={`text-sm ${i <= r.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                        ))}
                      </div>
                      {isOwner ? (
                        deletingReviewId === r.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={async () => {
                                await deleteEventReview(r.id, event.id, r.rating, r.photos)
                                setReviews((prev) => prev.filter((x) => x.id !== r.id))
                                setAlreadyReviewed(false)
                                setDeletingReviewId(null)
                              }}
                              className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-lg"
                            >
                              Confirmar
                            </button>
                            <button onClick={() => setDeletingReviewId(null)} className="text-xs text-gray-400 px-1">✕</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeletingReviewId(r.id)} className="text-gray-400 hover:text-red-500 transition-colors text-sm">🗑️</button>
                        )
                      ) : currentUid ? (
                        reportedIds.has(r.id) ? (
                          <span className="text-xs text-gray-400">Denunciado</span>
                        ) : reportingReviewId === r.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={async () => {
                                const user = auth.currentUser
                                if (!user) return
                                const already = await hasUserReportedReview(user.uid, r.id)
                                if (!already) await reportReview({ reviewId: r.id, reviewType: 'event', eventId: event.id, reviewUserId: r.userId, reviewUserName: r.userName, reviewText: r.text, reviewRating: r.rating, placeName: event.name, reportedBy: user.uid, reportedByName: user.displayName ?? 'Anônimo' })
                                setReportedIds((s) => new Set(s).add(r.id))
                                setReportingReviewId(null)
                              }}
                              className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-1 rounded-lg"
                            >Confirmar</button>
                            <button onClick={() => setReportingReviewId(null)} className="text-xs text-gray-400 px-1">✕</button>
                          </div>
                        ) : (
                          <button onClick={() => setReportingReviewId(r.id)} className="text-gray-300 hover:text-orange-400 transition-colors text-sm" title="Denunciar">🚩</button>
                        )
                      ) : null}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap text-xs">
                    {r.organization && (
                      <span className="bg-white border border-gray-200 px-2 py-1 rounded-full text-gray-600">
                        {r.organization === 'otima' ? '👏 Organização ótima' : r.organization === 'boa' ? '🙂 Organização boa' : '😕 Organização ruim'}
                      </span>
                    )}
                    <span className="bg-white border border-gray-200 px-2 py-1 rounded-full text-gray-600">
                      {(r.crowded === 'nao' || r.crowded === 'tranquilo') ? '😌 Tranquilo' : r.crowded === 'moderado' ? '🙂 Moderado' : '🎉 Lotado'}
                    </span>
                    {r.priceRange && (
                      <span className="bg-white border border-gray-200 px-2 py-1 rounded-full text-gray-600">
                        {r.priceRange} {r.priceRange === '💲' ? 'Econômico' : r.priceRange === '💲💲' ? 'Moderado' : 'Premium'}
                      </span>
                    )}
                    <span className="bg-white border border-gray-200 px-2 py-1 rounded-full text-gray-600">
                      {r.familyFriendly ? '👨‍👩‍👧 Família OK' : '🔞 Adulto'}
                    </span>
                  </div>

                  {r.text && <p className="text-sm text-gray-700 leading-relaxed">{r.text}</p>}

                  {r.photos && r.photos.length > 0 && (
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {r.photos.map((url, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                          <Image src={getOptimizedUrl(url, 200)} alt="" fill className="object-cover" unoptimized />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
