'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getApprovedEvents } from '@/lib/firestore'
import { filterActiveEvents } from '@/lib/events'
import { effectiveDate, getRecurrenceLabel } from '@/lib/recurrence'
import type { RoleEvent, EventCategory } from '@/types'
import { EVENT_CATEGORY_LABELS } from '@/types'
import Pagination from '@/components/Pagination'
import EventCardSkeleton from '@/components/EventCardSkeleton'
import Lightbox from '@/components/Lightbox'
import RouteModal from '@/components/RouteModal'
import { getOptimizedUrl } from '@/lib/cloudinary'

const ALL_CATEGORIES = Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[]

function toDate(ts: any): Date {
  if (!ts) return new Date(0)
  return ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts)
}

function formatEventDate(ts: any, recurrence?: string | null): string {
  if (!ts) return ''
  const base = toDate(ts)
  const display = recurrence ? effectiveDate(base, recurrence) : base
  return display.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

function EventCard({ event, onPhoto, onRoute }: { event: RoleEvent; onPhoto: (url: string) => void; onRoute: (e: RoleEvent) => void }) {
  const label = EVENT_CATEGORY_LABELS[event.category]
  const recurrenceLabel = event.recurrence ? getRecurrenceLabel(toDate(event.date), event.recurrence) : null
  const isPaid = event.plan === 'paid'

  if (isPaid) {
    return (
      <div className="rounded-2xl overflow-hidden border-2 border-purple-300 bg-white shadow-sm">
        {event.photoUrl ? (
          <button onClick={() => onPhoto(event.photoUrl!)} className="relative w-full h-52 block cursor-zoom-in focus:outline-none">
            <img src={getOptimizedUrl(event.photoUrl!, 800)} alt={event.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <span className="absolute top-3 right-3 bg-purple-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">⭐ Destaque</span>
            {recurrenceLabel && <span className="absolute top-3 left-3 bg-white/90 text-purple-600 text-xs font-bold px-2 py-0.5 rounded-full">🔁 {recurrenceLabel}</span>}
            <div className="absolute bottom-3 left-3 right-3">
              <div className="flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs bg-purple-500/80 text-white px-2 py-0.5 rounded-full">{label}</span>
                  <h3 className="font-bold text-white text-base leading-tight mt-1 truncate">{event.name}</h3>
                  <p className="text-white/80 text-xs mt-0.5">
                    📅 {formatEventDate(event.date, event.recurrence)} · 📍 {event.venue ? `${event.venue}, ` : ''}{event.city}
                  </p>
                </div>
              </div>
            </div>
          </button>
        ) : (
          <div className="px-4 py-3 flex items-center gap-2 bg-purple-50">
            <span className="text-xs bg-purple-600 text-white font-bold px-2 py-0.5 rounded-full">⭐ Destaque</span>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{label}</span>
          </div>
        )}
        <div className="px-4 py-3">
          {!event.photoUrl && (
            <>
              <h3 className="font-bold text-gray-900 leading-tight mb-1">{event.name}</h3>
              <p className="text-xs text-gray-500 mb-1">
                📅 {formatEventDate(event.date, event.recurrence)} · 📍 {event.venue ? `${event.venue} · ` : ''}{event.city}, {event.state}
              </p>
            </>
          )}
          {event.photoUrl && (event.lat && event.lng) && (
            <p className="text-xs text-gray-500 mb-1">
              <button onClick={() => onRoute(event)} className="hover:text-purple-500 transition-colors">
                📍 {event.city}, {event.state}
              </button>
            </p>
          )}
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{event.description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {event.price && <span className="text-xs font-semibold text-green-700">{event.price}</span>}
              {event.ticketUrl && (
                <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-white bg-purple-600 font-semibold px-3 py-1 rounded-lg">
                  Comprar ingresso →
                </a>
              )}
            </div>
            <a href={`/evento/${event.id}`} className="text-xs text-purple-500 font-semibold">Ver detalhes →</a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-4">
      {event.photoUrl && (
        <button onClick={() => onPhoto(event.photoUrl!)} className="w-full h-36 rounded-xl overflow-hidden bg-gray-100 mb-3 block cursor-zoom-in focus:outline-none relative">
          <img src={getOptimizedUrl(event.photoUrl!, 640)} alt={event.name} className="w-full h-full object-cover" loading="lazy" />
        </button>
      )}
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-bold text-gray-900 leading-tight">{event.name}</h3>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">{label}</span>
          {recurrenceLabel && <span className="text-xs bg-purple-50 text-purple-500 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">🔁 {recurrenceLabel}</span>}
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-1">
        📅 {formatEventDate(event.date, event.recurrence)}
        {(event.lat && event.lng) ? (
          <> · <button onClick={() => onRoute(event)} className="hover:text-purple-500 transition-colors">
            📍 {event.venue ? `${event.venue} · ` : ''}{event.city}, {event.state}
          </button></>
        ) : (
          <> · 📍 {event.venue ? `${event.venue} · ` : ''}{event.city}, {event.state}</>
        )}
      </p>
      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{event.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {event.price && <span className="text-xs font-semibold text-green-700">{event.price}</span>}
          {event.ticketUrl && (
            <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 font-semibold">
              Comprar ingresso →
            </a>
          )}
        </div>
        <a href={`/evento/${event.id}`} className="text-xs text-purple-500 font-semibold">Ver detalhes →</a>
      </div>
    </div>
  )
}

function EventosContent() {
  const searchParams = useSearchParams()
  const cityParam = searchParams.get('city') || ''

  const [events, setEvents] = useState<RoleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [cityFilter, setCityFilter] = useState(cityParam)
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | ''>('')
  const [page, setPage] = useState(0)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [routeEvent, setRouteEvent] = useState<RoleEvent | null>(null)

  useEffect(() => {
    getApprovedEvents().then((data) => {
      setEvents(filterActiveEvents(data))
      setLoading(false)
    })
  }, [])

  const filtered = events
    .filter((e) => {
      const cityMatch = !cityFilter || e.city.toLowerCase().includes(cityFilter.toLowerCase())
      const catMatch = !categoryFilter || e.category === categoryFilter
      return cityMatch && catMatch
    })
    .sort((a, b) => {
      // Pagos sempre primeiro, depois por data
      if (a.plan === 'paid' && b.plan !== 'paid') return -1
      if (b.plan === 'paid' && a.plan !== 'paid') return 1
      return 0
    })
  const totalPages = Math.ceil(filtered.length / 5)
  const visible = filtered.slice(page * 5, (page + 1) * 5)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {lightboxUrl && <Lightbox photos={[lightboxUrl]} onClose={() => setLightboxUrl(null)} />}
      {routeEvent && routeEvent.lat && routeEvent.lng && (
        <RouteModal
          destLat={routeEvent.lat}
          destLng={routeEvent.lng}
          destName={routeEvent.name}
          mapsUrl={routeEvent.mapsLink || `https://www.google.com/maps?q=${routeEvent.lat},${routeEvent.lng}`}
          onClose={() => setRouteEvent(null)}
        />
      )}
      <Link href="/explorar" className="text-sm text-gray-400 mb-4 inline-block">← Explorar</Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-4xl mb-2">🎭</div>
          <h1 className="text-2xl font-bold text-gray-900">Shows & Eventos</h1>
          <p className="text-gray-500 text-sm mt-1">O que tá rolando perto do seu destino</p>
        </div>
        <Link href="/eventos/sugerir"
          className="flex-shrink-0 mt-1 bg-purple-600 text-white text-xs font-semibold px-3 py-2 rounded-xl">
          + Indicar evento
        </Link>
      </div>

      <input
        type="text"
        value={cityFilter}
        onChange={(e) => { setCityFilter(e.target.value); setPage(0) }}
        placeholder="Filtrar por cidade... Ex: Florianópolis"
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 mb-4"
      />

      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        <button
          onClick={() => { setCategoryFilter(''); setPage(0) }}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
            categoryFilter === '' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200'
          }`}
        >
          Todos
        </button>
        {ALL_CATEGORIES.map((cat) => (
          <button key={cat}
            onClick={() => { setCategoryFilter(categoryFilter === cat ? '' : cat); setPage(0) }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
              categoryFilter === cat ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {EVENT_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <EventCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🎪</div>
          <p className="font-semibold text-gray-700 mb-1">Nenhum evento por aqui ainda</p>
          <p className="text-sm text-gray-400 mb-6">
            {cityFilter ? `Nada encontrado em "${cityFilter}".` : 'Tem um show ou evento? Anuncie aqui!'}
          </p>
          <Link href="/eventos/sugerir"
            className="inline-block bg-purple-600 text-white text-sm font-semibold px-6 py-3 rounded-xl">
            🎭 Indicar um evento
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3 stagger">
          {visible.map((e) => <EventCard key={e.id} event={e} onPhoto={setLightboxUrl} onRoute={setRouteEvent} />)}
          <Pagination page={page} totalPages={totalPages} onPrev={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)} />
        </div>
      )}

      {/* CTA anunciante */}
      <div className="mt-8 bg-purple-50 border border-purple-100 rounded-2xl p-5 flex items-center gap-4">
        <span className="text-4xl flex-shrink-0">🎭</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-sm">Tem um show ou evento?</p>
          <p className="text-gray-500 text-xs mt-0.5">Divulgue para quem já está indo pra sua cidade.</p>
        </div>
        <Link href="/eventos/sugerir" className="flex-shrink-0 bg-purple-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-purple-700 transition-colors">
          Indicar →
        </Link>
      </div>
    </div>
  )
}

export default function EventosPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
      </div>
    }>
      <EventosContent />
    </Suspense>
  )
}
