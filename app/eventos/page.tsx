'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getApprovedEvents } from '@/lib/firestore'
import type { RoleEvent, EventCategory } from '@/types'
import { EVENT_CATEGORY_LABELS } from '@/types'

const ALL_CATEGORIES = Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[]

function formatEventDate(ts: any): string {
  if (!ts) return ''
  const date = ts.toDate ? ts.toDate() : new Date(ts)
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

function EventCard({ event }: { event: RoleEvent }) {
  const label = EVENT_CATEGORY_LABELS[event.category]
  return (
    <div className="card p-4 flex gap-4">
      <div className="w-14 flex-shrink-0 flex flex-col items-center justify-center bg-purple-50 rounded-xl py-2 px-1 text-center">
        <span className="text-xs font-bold text-purple-600 leading-tight">
          {formatEventDate(event.date)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-gray-900 leading-tight">{event.name}</h3>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
            {label}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">📍 {event.venue} · {event.city}, {event.state}</p>
        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{event.description}</p>
        <div className="flex items-center gap-3 mt-2">
          {event.price && (
            <span className="text-xs font-semibold text-green-700">{event.price}</span>
          )}
          {event.ticketUrl && (
            <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-purple-600 font-semibold underline">
              Comprar ingresso →
            </a>
          )}
        </div>
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

  useEffect(() => {
    getApprovedEvents().then((data) => {
      setEvents(data)
      setLoading(false)
    })
  }, [])

  const filtered = events.filter((e) => {
    const cityMatch = !cityFilter || e.city.toLowerCase().includes(cityFilter.toLowerCase())
    const catMatch = !categoryFilter || e.category === categoryFilter
    return cityMatch && catMatch
  })

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/explorar" className="text-sm text-gray-400 mb-4 inline-block">← Explorar</Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-4xl mb-2">🎭</div>
          <h1 className="text-2xl font-bold text-gray-900">Shows & Eventos</h1>
          <p className="text-gray-500 text-sm mt-1">O que tá rolando perto do seu destino</p>
        </div>
        <Link href="/eventos/sugerir"
          className="flex-shrink-0 mt-1 bg-purple-600 text-white text-xs font-semibold px-3 py-2 rounded-xl">
          + Sugerir
        </Link>
      </div>

      {/* Busca por cidade */}
      <input
        type="text"
        value={cityFilter}
        onChange={(e) => setCityFilter(e.target.value)}
        placeholder="Filtrar por cidade... Ex: Florianópolis"
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 mb-4"
      />

      {/* Filtros de categoria */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        <button
          onClick={() => setCategoryFilter('')}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
            categoryFilter === '' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200'
          }`}
        >
          Todos
        </button>
        {ALL_CATEGORIES.map((cat) => (
          <button key={cat}
            onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
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
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🎪</div>
          <p className="font-semibold text-gray-700 mb-1">Nenhum evento por aqui ainda</p>
          <p className="text-sm text-gray-400 mb-6">
            {cityFilter ? `Nada encontrado em "${cityFilter}".` : 'A agenda tá vazia, mas a galera pode mudar isso!'}
          </p>
          <Link href="/eventos/sugerir"
            className="inline-block bg-purple-600 text-white text-sm font-semibold px-6 py-3 rounded-xl">
            🎭 Sugerir um evento
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      )}
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
