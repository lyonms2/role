'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getApprovedStays } from '@/lib/firestore'
import { getOptimizedUrl } from '@/lib/cloudinary'
import type { Stay, StayCategory } from '@/types'
import { STAY_CATEGORY_LABELS } from '@/types'
import Pagination from '@/components/Pagination'
import ListItemSkeleton from '@/components/ListItemSkeleton'

const HOSPEDAGEM_CATEGORIES: StayCategory[] = ['hotel', 'pousada', 'hostel', 'chale', 'resort']
const CAMPING_CATEGORIES: StayCategory[] = ['camping']


function StayCard({ stay }: { stay: Stay }) {
  const label = STAY_CATEGORY_LABELS[stay.category]
  return (
    <div className="card p-4">
      {stay.photoUrl && (
        <div className="h-36 rounded-xl overflow-hidden bg-gray-100 mb-3">
          <img src={getOptimizedUrl(stay.photoUrl!, 640)} alt={stay.name} className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-bold text-gray-900">{stay.name}</h3>
        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">{label}</span>
      </div>
      <p className="text-xs text-gray-500 mb-2">📍 {stay.city}, {stay.state}</p>
      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{stay.description}</p>
      <div className="flex items-center justify-between">
        {stay.priceFrom ? (
          <span className="text-sm font-semibold text-gray-700">
            A partir de <span className="text-green-700">R$ {stay.priceFrom}</span>/noite
          </span>
        ) : <span />}
        <Link href={`/hospedar/${stay.id}`} className="text-xs text-blue-600 font-semibold">
          Ver detalhes →
        </Link>
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
  const [tab, setTab] = useState<'hospedagens' | 'camping'>('hospedagens')
  const [page, setPage] = useState(0)

  useEffect(() => {
    getApprovedStays().then((data) => {
      setStays(data)
      setLoading(false)
    })
  }, [])

  const activeCats = tab === 'hospedagens' ? HOSPEDAGEM_CATEGORIES : CAMPING_CATEGORIES

  const filtered = stays.filter((s) => {
    const cityMatch = !cityFilter || s.city.toLowerCase().includes(cityFilter.toLowerCase())
    const tabMatch = activeCats.includes(s.category)
    const catMatch = tab === 'camping' || !categoryFilter || s.category === categoryFilter
    return cityMatch && tabMatch && catMatch
  })
  const totalPages = Math.ceil(filtered.length / 5)
  const visible = filtered.slice(page * 5, (page + 1) * 5)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/explorar" className="text-sm text-gray-400 mb-4 inline-block">← Explorar</Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-4xl mb-2">{tab === 'camping' ? '⛺' : '🏡'}</div>
          <h1 className="text-2xl font-bold text-gray-900">Onde Dormir</h1>
          <p className="text-gray-500 text-sm mt-1">
            {tab === 'camping'
              ? 'Acampamentos e áreas de camping da comunidade'
              : 'Pousadas, hotéis e o lugar certo pra descansar depois do rolê'}
          </p>
        </div>
        <Link href="/sugerir?tipo=hospedar"
          className="flex-shrink-0 mt-1 bg-green-600 text-white text-xs font-semibold px-3 py-2 rounded-xl">
          + Indicar
        </Link>
      </div>

      {/* Abas */}
      <div className="flex gap-0 mb-5 border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => { setTab('hospedagens'); setCategoryFilter(''); setPage(0) }}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === 'hospedagens' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
          🏡 Hospedagens
        </button>
        <button
          onClick={() => { setTab('camping'); setCategoryFilter(''); setPage(0) }}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === 'camping' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
          ⛺ Camping
        </button>
      </div>

      {/* Separador */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400 font-medium">indicações da comunidade</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      {/* Filtro de cidade */}
      <input
        type="text"
        value={cityFilter}
        onChange={(e) => { setCityFilter(e.target.value); setPage(0) }}
        placeholder="Filtrar por cidade..."
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400 mb-4"
      />

      {/* Filtro de categoria — só na aba Hospedagens */}
      {tab === 'hospedagens' && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
          <button onClick={() => { setCategoryFilter(''); setPage(0) }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
              categoryFilter === '' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'
            }`}>
            Todos
          </button>
          {HOSPEDAGEM_CATEGORIES.map((cat) => (
            <button key={cat}
              onClick={() => { setCategoryFilter(categoryFilter === cat ? '' : cat); setPage(0) }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                categoryFilter === cat ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'
              }`}>
              {STAY_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <ListItemSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-2xl">
          <div className="text-4xl mb-3">{tab === 'camping' ? '⛺' : '🛏️'}</div>
          <p className="font-semibold text-gray-700 mb-1">Nenhuma indicação ainda</p>
          <p className="text-sm text-gray-400 mb-4">
            {cityFilter
              ? `Nada em "${cityFilter}" ainda.`
              : tab === 'camping'
              ? 'Conhece um camping incrível? Indica pra galera!'
              : 'Conhece uma pousada ou hotel incrível? Indica pra galera!'}
          </p>
          <Link href="/sugerir?tipo=hospedar"
            className="inline-block bg-green-600 text-white text-sm font-semibold px-6 py-3 rounded-xl">
            {tab === 'camping' ? '⛺ Indicar um camping' : '🏡 Indicar uma hospedagem'}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3 stagger">
          {visible.map((s) => <StayCard key={s.id} stay={s} />)}
          <Pagination page={page} totalPages={totalPages} onPrev={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)} />
        </div>
      )}

      {/* CTA anunciante */}
      <div className="mt-8 bg-green-50 border border-green-100 rounded-2xl p-5 flex items-center gap-4">
        <span className="text-4xl flex-shrink-0">🏡</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-sm">Tem uma pousada ou hotel?</p>
          <p className="text-gray-500 text-xs mt-0.5">Apareça para quem está planejando a viagem dos sonhos.</p>
        </div>
        <Link href="/sugerir?tipo=hospedar" className="flex-shrink-0 bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-green-700 transition-colors">
          Indicar →
        </Link>
      </div>
    </div>
  )
}

export default function HospedarPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="skeleton h-72 rounded-2xl mb-6" />
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => <div key={i} className="skeleton h-32 rounded-xl" />)}
        </div>
      </div>
    }>
      <HospedarContent />
    </Suspense>
  )
}
