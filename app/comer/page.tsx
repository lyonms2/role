'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getApprovedEats } from '@/lib/firestore'
import { getOptimizedUrl } from '@/lib/cloudinary'
import type { Eat, EatCategory } from '@/types'
import { EAT_CATEGORY_LABELS } from '@/types'
import Pagination from '@/components/Pagination'
import ListItemSkeleton from '@/components/ListItemSkeleton'

const ALL_CATEGORIES = Object.keys(EAT_CATEGORY_LABELS) as EatCategory[]

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

function EatCard({ eat }: { eat: Eat }) {
  const label = EAT_CATEGORY_LABELS[eat.category]
  const isPaid = eat.plan === 'paid' || (!eat.plan && eat.suggestedBy === 'advertiser')
  return (
    <div className={`card p-4 ${isPaid ? 'shadow-[0_0_0_2px_rgb(251,146,60),0_4px_16px_rgba(251,146,60,0.25)]' : ''}`}>
      {eat.photoUrl && (
        <div className="h-36 rounded-xl overflow-hidden bg-gray-100 mb-3">
          <img src={getOptimizedUrl(eat.photoUrl, 640)} alt={eat.name} className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-bold text-gray-900">{eat.name}</h3>
          {isPaid && <span className="text-[10px] bg-orange-100 text-orange-600 font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0">Parceiro</span>}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full whitespace-nowrap">{label}</span>
          <span className="text-sm font-bold text-green-700">{eat.priceRange}</span>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-2">📍 {eat.city}, {eat.state}</p>
      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{eat.description}</p>
      <div className="flex items-center justify-between">
        <StarRating value={eat.averageRating} />
        <Link href={`/comer/${eat.id}`} className="text-xs text-orange-500 font-semibold">
          Ver detalhes →
        </Link>
      </div>
    </div>
  )
}

function ComerContent() {
  const searchParams = useSearchParams()
  const cityParam = searchParams.get('city') || ''

  const [eats, setEats] = useState<Eat[]>([])
  const [loading, setLoading] = useState(true)
  const [cityFilter, setCityFilter] = useState(cityParam)
  const [categoryFilter, setCategoryFilter] = useState<EatCategory | ''>('')
  const [priceFilter, setPriceFilter] = useState<string>('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    getApprovedEats().then((data) => {
      setEats(data)
      setLoading(false)
    })
  }, [])

  const filtered = eats.filter((e) => {
    const cityMatch = !cityFilter || e.city.toLowerCase().includes(cityFilter.toLowerCase())
    const catMatch = !categoryFilter || e.category === categoryFilter
    const priceMatch = !priceFilter || e.priceRange === priceFilter
    return cityMatch && catMatch && priceMatch
  })
  const totalPages = Math.ceil(filtered.length / 5)
  const visible = filtered.slice(page * 5, (page + 1) * 5)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/explorar" className="text-sm text-gray-400 mb-4 inline-block">← Explorar</Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-4xl mb-2">🍽️</div>
          <h1 className="text-2xl font-bold text-gray-900">Onde Comer</h1>
          <p className="text-gray-500 text-sm mt-1">Pedidas da galera local pra você não errar o rolê</p>
        </div>
        <Link href="/sugerir?tipo=comer"
          className="flex-shrink-0 mt-1 bg-orange-500 text-white text-xs font-semibold px-3 py-2 rounded-xl">
          + Indicar
        </Link>
      </div>

      <input
        type="text"
        value={cityFilter}
        onChange={(e) => { setCityFilter(e.target.value); setPage(0) }}
        placeholder="Filtrar por cidade... Ex: Urubici"
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 mb-4"
      />

      {/* Categorias */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        <button onClick={() => { setCategoryFilter(''); setPage(0) }}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
            categoryFilter === '' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'
          }`}>
          Tudo
        </button>
        {ALL_CATEGORIES.map((cat) => (
          <button key={cat}
            onClick={() => { setCategoryFilter(categoryFilter === cat ? '' : cat); setPage(0) }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
              categoryFilter === cat ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'
            }`}>
            {EAT_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Faixa de preço */}
      <div className="flex gap-2 mb-5">
        {['', '💲', '💲💲', '💲💲💲'].map((p) => (
          <button key={p}
            onClick={() => { setPriceFilter(p); setPage(0) }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
              priceFilter === p ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'
            }`}>
            {p || 'Qualquer preço'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <ListItemSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🍴</div>
          <p className="font-semibold text-gray-700 mb-1">Nenhuma pedida por aqui ainda</p>
          <p className="text-sm text-gray-400 mb-6">
            {cityFilter ? `Nada encontrado em "${cityFilter}".` : 'Conhece um lugar bom? Indica pra galera!'}
          </p>
          <Link href="/sugerir?tipo=comer"
            className="inline-block bg-orange-500 text-white text-sm font-semibold px-6 py-3 rounded-xl">
            🍽️ Indicar um lugar
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3 stagger">
          {visible.map((e) => <EatCard key={e.id} eat={e} />)}
          <Pagination page={page} totalPages={totalPages} onPrev={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)} />
        </div>
      )}

      {/* CTA anunciante */}
      <div className="mt-8 bg-orange-50 border border-orange-100 rounded-2xl p-5 flex items-center gap-4">
        <span className="text-4xl flex-shrink-0">🍽️</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-sm">Tem um restaurante ou bar?</p>
          <p className="text-gray-500 text-xs mt-0.5">Apareça para viajantes que buscam onde comer na região.</p>
        </div>
        <Link href="/sugerir?tipo=comer" className="flex-shrink-0 bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-orange-600 transition-colors">
          Indicar →
        </Link>
      </div>
    </div>
  )
}

export default function ComerPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
      </div>
    }>
      <ComerContent />
    </Suspense>
  )
}
