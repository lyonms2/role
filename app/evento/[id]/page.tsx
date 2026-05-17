'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getEventById } from '@/lib/firestore'
import { useRoteiro } from '@/lib/roteiro-context'
import type { RoleEvent } from '@/types'
import { EVENT_CATEGORY_LABELS } from '@/types'
import Lightbox from '@/components/Lightbox'
import { getOptimizedUrl } from '@/lib/cloudinary'

function formatEventDate(ts: any): string {
  try {
    const date = ts?.toDate ? ts.toDate() : new Date((ts?.seconds ?? 0) * 1000)
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  } catch { return '' }
}

export default function EventoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { toggleEvent, hasEvent } = useRoteiro()
  const [event, setEvent] = useState<RoleEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(false)

  useEffect(() => {
    getEventById(id).then((ev) => { setEvent(ev); setLoading(false) })
  }, [id])

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

        {/* Infos principais */}
        <div className="flex flex-col gap-2">
          {dateStr && (
            <div className="flex items-center gap-2 text-sm text-purple-700 font-semibold">
              <span>📅</span>
              <span className="capitalize">{dateStr}</span>
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
        <div className="flex flex-col gap-2 pt-1">
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
        </div>

      </div>
    </div>
  )
}
