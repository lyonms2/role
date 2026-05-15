'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getApprovedStays } from '@/lib/firestore'
import type { Stay, StayCategory } from '@/types'
import { STAY_CATEGORY_LABELS } from '@/types'

const ALL_CATEGORIES = Object.keys(STAY_CATEGORY_LABELS) as StayCategory[]

function StarRating({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`text-xs ${i <= Math.round(value) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
      ))}
      {value > 0 && <span className="text-xs text-gray-500 ml-1">{value.toFixed(1)}</span>}
    </span>
  )
}

function StayCard({ stay }: { stay: Stay }) {
  const label = STAY_CATEGORY_LABELS[stay.category]
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3 className="font-bold text-gray-900">{stay.name}</h3>
          <p className="text-xs text-gray-500">{stay.city}, {stay.state}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full whitespace-nowrap">{label}</span>
          {stay.priceFrom && (
            <span className="text-xs font-bold text-gray-700">
              A partir de <span className="text-green-700">R$ {stay.priceFrom}</span>
            </span>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{stay.description}</p>
      <div className="flex items-center justify-between">
        <StarRating value={stay.averageRating} />
        <div className="flex gap-3">
          {stay.mapsLink && (
            <a href={stay.mapsLink} target="_blank" rel="noopener noreferrer"
              className="text-xs text-gray-500 font-semibold">📍 Mapa</a>
          )}
          {stay.bookingUrl && (
            <a href={stay.bookingUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-green-700 font-semibold">Reservar →</a>
          )}
        </div>
      </div>
    </div>
  )
}

function HospedarContent() {
  const searchParams = useSearchParams()
  const cityParam = searchParams.get('city') || ''

  const [stays, setStays] = useState<Stay[]>([])
  const [loading, setLoading] = useState(true)
  const [cityFilter, setCityFilter] = useState(cityParam)
  const [categoryFilter, setCategoryFilter] = useState<StayCategory | ''>('')

  useEffect(() => {
    getApprovedStays().then((data) => {
      setStays(data)
      setLoading(false)
    })
  }, [])

  const filtered = stays.filter((s) => {
    const cityMatch = !cityFilter || s.city.toLowerCase().includes(cityFilter.toLowerCase())
    const catMatch = !categoryFilter || s.category === categoryFilter
    return cityMatch && catMatch
  })

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/explorar" className="text-sm text-gray-400 mb-4 inline-block">← Explorar</Link>

      <div className="mb-6">
        <div className="text-4xl mb-2">🏡</div>
        <h1 className="text-2xl font-bold text-gray-900">Onde Dormir</h1>
        <p className="text-gray-500 text-sm mt-1">Pousadas, hotéis e o lugar certo pra descansar depois do rolê</p>
      </div>

      <input
        type="text"
        value={cityFilter}
        onChange={(e) => setCityFilter(e.target.value)}
        placeholder="Filtrar por cidade... Ex: Gramado"
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400 mb-4"
      />

      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        <button onClick={() => setCategoryFilter('')}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
            categoryFilter === '' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'
          }`}>
          Todos
        </button>
        {ALL_CATEGORIES.map((cat) => (
          <button key={cat}
            onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
              categoryFilter === cat ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'
            }`}>
            {STAY_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🛏️</div>
          <p className="font-semibold text-gray-700 mb-1">Nenhuma hospedagem cadastrada ainda</p>
          <p className="text-sm text-gray-400 mb-6">
            {cityFilter ? `Nada encontrado em "${cityFilter}".` : 'Conhece uma pousada ou hotel incrível?'}
          </p>
          <Link href="/sugerir?tipo=hospedagem"
            className="inline-block bg-green-600 text-white text-sm font-semibold px-6 py-3 rounded-xl">
            🏡 Indicar uma hospedagem
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((s) => <StayCard key={s.id} stay={s} />)}
        </div>
      )}
    </div>
  )
}

export default function HospedarPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
      </div>
    }>
      <HospedarContent />
    </Suspense>
  )
}
