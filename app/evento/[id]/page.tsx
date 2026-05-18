'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getEventById, getEventReviews, hasUserReviewedEvent, deleteEventReview } from '@/lib/firestore'
import { isEventExpired } from '@/lib/events'
import { auth } from '@/lib/firebase'
import { useRoteiro } from '@/lib/roteiro-context'
import type { RoleEvent, EventReview } from '@/types'
import { EVENT_CATEGORY_LABELS } from '@/types'
import Lightbox from '@/components/Lightbox'
import EventReviewForm from '@/components/EventReviewForm'
import { getOptimizedUrl } from '@/lib/cloudinary'

function formatEventDate(ts: any): string {
  try {
    const date = ts?.toDate ? ts.toDate() : new Date((ts?.seconds ?? 0) * 1000)
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  } catch { return '' }
}

function formatTime(ts: any): string {
  try {
    const date = ts?.toDate ? ts.toDate() : new Date((ts?.seconds ?? 0) * 1000)
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function isSameDay(a: any, b: any): boolean {
  try {
    const da = a?.toDate ? a.toDate() : new Date((a?.seconds ?? 0) * 1000)
    const db = b?.toDate ? b.toDate() : new Date((b?.seconds ?? 0) * 1000)
    return da.toDateString() === db.toDateString()
  } catch { return false }
}

export default function EventoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { toggleEvent, hasEvent } = useRoteiro()
  const [event, setEvent] = useState<RoleEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(false)
  const [reviews, setReviews] = useState<EventReview[]>([])
  const [alreadyReviewed, setAlreadyReviewed] = useState(false)
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null)

  useEffect(() => {
    getEventById(id).then((ev) => { setEvent(ev); setLoading(false) })
    getEventReviews(id).then(setReviews)
  }, [id])

  useEffect(() => {
    const user = auth.currentUser
    if (user) hasUserReviewedEvent(user.uid, id).then(setAlreadyReviewed)
  }, [id])

  function handleReviewSuccess() {
    getEventReviews(id).then(setReviews)
    setAlreadyReviewed(true)
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="skeleton h-56 w-full" />
        <div className="px-4 py-5 flex flex-col gap-3">
          <div className="skeleton h-7 w-3/4" />
          <div className="skeleton h-4 w-1/2" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-full" />
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-3">🎭</div>
        <p className="font-bold text-gray-800">Evento não encontrado</p>
        <Link href="/eventos" className="text-sm text-purple-500 mt-3 inline-block">← Ver todos os eventos</Link>
      </div>
    )
  }

  const added = hasEvent(event.id)
  const label = EVENT_CATEGORY_LABELS[event.category] || event.category
  const dateStr = formatEventDate(event.date)
  const expired = isEventExpired(event)

  return (
    <div className="max-w-2xl mx-auto pb-20">

      {lightbox && event.photoUrl && (
        <Lightbox photos={[event.photoUrl]} onClose={() => setLightbox(false)} />
      )}

      {/* Hero */}
      <div className="relative">
        {event.photoUrl ? (
          <button
            onClick={() => setLightbox(true)}
            className="relative h-56 w-full bg-gray-100 block cursor-zoom-in focus:outline-none"
          >
            <img src={getOptimizedUrl(event.photoUrl, 1200)} alt={event.name} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
            <span className="absolute top-4 right-14 bg-black/40 text-white text-xs px-2 py-1 rounded-full">⛶ ampliar</span>
          </button>
        ) : (
          <div className="h-36 bg-gradient-to-br from-purple-500 to-purple-800 flex items-center justify-center text-6xl">🎭</div>
        )}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 bg-white/90 rounded-full w-9 h-9 flex items-center justify-center text-gray-700 shadow"
        >←</button>
        <span className="absolute top-4 right-4 bg-purple-600/90 text-white text-xs font-bold px-3 py-1 rounded-full">
          {label}
        </span>
        {event.photoUrl && (
          <div className="absolute bottom-4 left-4 right-16">
            <h1 className="text-white text-xl font-bold leading-tight drop-shadow">{event.name}</h1>
          </div>
        )}
      </div>

      <div className="px-4 py-5 flex flex-col gap-4">
        {!event.photoUrl && (
          <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
        )}

        {expired && (
          <div className="bg-gray-100 border border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl flex-shrink-0">📅</span>
            <div>
              <p className="text-sm font-semibold text-gray-700">Este evento já aconteceu</p>
              <p className="text-xs text-gray-500 mt-0.5">Mas você ainda pode ver as avaliações de quem foi!</p>
            </div>
          </div>
        )}

        {/* Infos principais */}
        <div className="flex flex-col gap-2">
          {dateStr && (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 text-sm text-purple-700 font-semibold">
                <span>📅</span>
                <span className="capitalize">{dateStr}</span>
              </div>
              {event.endDate && !isSameDay(event.date, event.endDate) ? (
                <div className="flex items-center gap-2 text-sm text-purple-600 pl-6">
                  <span>até <span className="capitalize">{formatEventDate(event.endDate)}</span></span>
                </div>
              ) : null}
              {event.date && (
                <div className="flex items-center gap-2 text-xs text-purple-500 pl-6">
                  {formatTime(event.date)}
                  {event.endDate ? ` – ${formatTime(event.endDate)}` : ''}
                </div>
              )}
            </div>
          )}
          {event.venue && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>📍</span>
              {event.mapsLink ? (
                <a href={event.mapsLink} target="_blank" rel="noopener noreferrer" className="hover:text-purple-500 transition-colors">
                  {event.venue} · {event.city}, {event.state}
                </a>
              ) : (
                <span>{event.venue} · {event.city}, {event.state}</span>
              )}
            </div>
          )}
          {event.price && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>🎟️</span>
              <span>{event.price}</span>
            </div>
          )}
        </div>

        {/* Descrição */}
        {event.description && (
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-sm text-gray-700 leading-relaxed">{event.description}</p>
          </div>
        )}

        {/* Ações */}
        {!expired && <div className="flex flex-col gap-2 pt-1">
          {event.ticketUrl && (
            <a
              href={event.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm text-center bg-purple-600 hover:bg-purple-700 transition-colors"
            >
              🎟️ Comprar ingressos
            </a>
          )}
          {event.mapsLink && (
            <a
              href={event.mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-xl font-bold text-sm text-center border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              🗺️ Como chegar
            </a>
          )}
          <button
            onClick={() => toggleEvent({
              id: event.id,
              name: event.name,
              city: event.city,
              venue: event.venue || '',
              date: event.date,
              category: event.category,
              photoUrl: event.photoUrl,
              mapsLink: event.mapsLink,
            })}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
              added
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
          >
            {added ? '✓ Adicionado ao roteiro' : '+ Adicionar ao roteiro'}
          </button>
        </div>}

        {/* Avaliações */}
        <div className="pt-2">
          <h2 className="font-bold text-gray-900 text-base mb-3">
            Avaliações {reviews.length > 0 && <span className="text-gray-400 font-normal text-sm">({reviews.length})</span>}
          </h2>

          {!alreadyReviewed && (
            <div className="mb-4">
              <EventReviewForm eventId={event.id} onSuccess={handleReviewSuccess} />
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
                    <p className="text-sm font-semibold text-gray-800 truncate">{r.userName}</p>
                    <p className="text-xs text-gray-400">
                      {r.createdAt?.toDate?.().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span key={i} className={`text-sm ${i <= r.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                      ))}
                    </div>
                    {isOwner && (
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
                    )}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap text-xs">
                  <span className="bg-white border border-gray-200 px-2 py-1 rounded-full text-gray-600">
                    {r.crowded === 'nao' ? '😌 Tranquilo' : r.crowded === 'moderado' ? '🙂 Moderado' : '🎉 Lotado'}
                  </span>
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
            )})}
          </div>
        </div>

      </div>
    </div>
  )
}
