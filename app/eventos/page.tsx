'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getApprovedEvents } from '@/lib/firestore'
import type { RoleEvent, EventCategory } from '@/types'
import { EVENT_CATEGORY_LABELS } from '@/types'

const ALL_CATEGORIES = Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[]

interface SymplaEvent {
  id: string
  name: string
  description: string
  startDate: string
  endDate: string | null
  city: string
  state: string
  venue: string
  imageUrl: string | null
  url: string
  category: string
}

function getSymplaSearchUrl(city?: string) {
  const base = 'https://www.sympla.com.br/eventos'
  if (!city) return base
  return `${base}?s=${encodeURIComponent(city)}`
}

function formatEventDate(ts: any): string {
  if (!ts) return ''
  const date = ts.toDate ? ts.toDate() : new Date(ts)
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

function formatDateStr(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

function SymplaWidget({ city }: { city?: string }) {
  const url = getSymplaSearchUrl(city)
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="block rounded-2xl overflow-hidden border border-purple-100 hover:shadow-lg transition-shadow">
      <div className="bg-[#5B2D8E] px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-white font-extrabold text-xl tracking-tight">
            sympla<span className="text-purple-300">.</span>com<span className="text-purple-300">.</span>br
          </p>
          <p className="text-purple-300 text-xs">Ingressos e eventos perto de você</p>
        </div>
        <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full">Parceiro oficial</span>
      </div>
      <div className="bg-white px-5 py-4">
        {city && (
          <div className="flex items-center gap-2 bg-purple-50 rounded-xl px-3 py-2 mb-3 text-sm text-purple-700 font-medium">
            <span>📍</span>
            <span>Buscando eventos em <strong>{city}</strong></span>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3 mb-4 text-center">
          {[
            { num: '600K+', label: 'Eventos' },
            { num: '60M+', label: 'Ingressos' },
            { num: '100%', label: 'Seguro' },
          ].map((s) => (
            <div key={s.label} className="bg-gray-50 rounded-xl py-2">
              <p className="font-bold text-[#5B2D8E] text-sm">{s.num}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 mb-4 text-sm text-gray-600">
          <p>✅ Shows, festivais, feiras e muito mais</p>
          <p>✅ Ingresso digital no celular</p>
          <p>✅ Pagamento seguro e parcelado</p>
        </div>
        <div className="bg-[#5B2D8E] text-white text-center font-bold py-3 rounded-xl text-sm">
          🎭 Ver eventos disponíveis →
        </div>
      </div>
    </a>
  )
}

function SymplaEventCard({ event }: { event: SymplaEvent }) {
  return (
    <a href={event.url} target="_blank" rel="noopener noreferrer"
      className="card p-4 flex gap-4 hover:shadow-md transition-shadow">
      {event.imageUrl ? (
        <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
          <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-16 h-16 flex-shrink-0 rounded-xl bg-purple-50 flex items-center justify-center text-2xl">
          🎭
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-gray-900 leading-tight text-sm">{event.name}</h3>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
            Sympla
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          📍 {event.venue ? `${event.venue} · ` : ''}{event.city}, {event.state}
        </p>
        <p className="text-xs text-purple-600 font-semibold mt-1">
          {formatDateStr(event.startDate)}
          {event.category ? ` · ${event.category}` : ''}
        </p>
      </div>
    </a>
  )
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
  const [symplaEvents, setSymplaEvents] = useState<SymplaEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [cityFilter, setCityFilter] = useState(cityParam)
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | ''>('')

  useEffect(() => {
    const symplaParams = new URLSearchParams()
    if (cityParam) symplaParams.set('city', cityParam)

    Promise.all([
      getApprovedEvents(),
      fetch(`/api/sympla?${symplaParams}`).then((r) => r.json()).catch(() => ({ events: [] })),
    ]).then(([community, sympla]) => {
      setEvents(community)
      setSymplaEvents(sympla.events || [])
      setLoading(false)
    })
  }, [cityParam])

  const filteredCommunity = events.filter((e) => {
    const cityMatch = !cityFilter || e.city.toLowerCase().includes(cityFilter.toLowerCase())
    const catMatch = !categoryFilter || e.category === categoryFilter
    return cityMatch && catMatch
  })

  const filteredSympla = symplaEvents.filter((e) =>
    !cityFilter || e.city.toLowerCase().includes(cityFilter.toLowerCase())
  )

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

      {/* Widget Sympla */}
      <SymplaWidget city={cityParam || undefined} />

      {/* Sympla API events (só aparece se o organizador configurou o token) */}
      {!loading && filteredSympla.length > 0 && (
        <>
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-medium">eventos em destaque</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <div className="flex flex-col gap-3">
            {filteredSympla.map((e) => <SymplaEventCard key={e.id} event={e} />)}
          </div>
        </>
      )}

      {/* Separador comunidade */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400 font-medium">indicações da comunidade</span>
        <div className="flex-1 h-px bg-gray-100" />
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
      ) : filteredCommunity.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-2xl">
          <div className="text-4xl mb-3">🎪</div>
          <p className="font-semibold text-gray-700 mb-1">Nenhum evento por aqui ainda</p>
          <p className="text-sm text-gray-400 mb-4">
            {cityFilter ? `Nada encontrado em "${cityFilter}".` : 'A agenda tá vazia, mas a galera pode mudar isso!'}
          </p>
          <Link href="/eventos/sugerir"
            className="inline-block bg-purple-600 text-white text-sm font-semibold px-6 py-3 rounded-xl">
            🎭 Sugerir um evento
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredCommunity.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      )}
    </div>
  )
}

export default function EventosPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="skeleton h-64 rounded-2xl mb-6" />
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
      </div>
    }>
      <EventosContent />
    </Suspense>
  )
}
