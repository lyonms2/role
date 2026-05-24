'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useRoteiro, type EatSnap, type StaySnap, type EventSnap } from '@/lib/roteiro-context'
import type { RoleEvent, RoteiroReview } from '@/types'
import { useAuth } from '@/lib/auth-context'
import { getApprovedEats, getApprovedStays, getApprovedEvents, saveRoteiro, updateRoteiroItems, getPublishedRoteiros, copyRoteiroToProfile, addRoteiroReview, getRoteiroReviews, hasUserReviewedRoteiro, reportReview, hasUserReportedReview, type SavedRoteiro } from '@/lib/firestore'
import { auth, googleProvider } from '@/lib/firebase'
import { signInWithPopup } from 'firebase/auth'
import PlaceDetailModal from '@/components/PlaceDetailModal'
import EventDetailModal from '@/components/EventDetailModal'
import EatDetailModal from '@/components/EatDetailModal'
import StayDetailModal from '@/components/StayDetailModal'
import Pagination from '@/components/Pagination'
import ListItemSkeleton from '@/components/ListItemSkeleton'
import { haversineDistance } from '@/lib/geolocation'
import { getOptimizedUrl } from '@/lib/cloudinary'

type Tab = 'evento' | 'comer' | 'dormir'

type EatRow   = { id: string; name: string; city: string; category: string; priceRange: string; priceLevel?: string; rating?: number; reviewCount?: number; googlePlaceId?: string; address?: string; lat?: number; lng?: number; photoUrl?: string; isAdvertiser?: boolean }
type StayRow  = { id: string; name: string; city: string; category: string; priceFrom?: number | null; priceLevel?: string; bookingUrl?: string | null; rating?: number; reviewCount?: number; googlePlaceId?: string; address?: string; lat?: number; lng?: number; photoUrl?: string; isAdvertiser?: boolean }

type SortKey = 'rating' | 'distance' | 'price'

// ── Sub-componentes ──────────────────────────────────────────

function AddBtn({ added, onToggle }: { added: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
        added
          ? 'bg-green-100 text-green-700 border border-green-200'
          : 'bg-orange-500 text-white hover:bg-orange-600'
      }`}
    >
      {added ? '✓ Adicionado' : '+ Adicionar'}
    </button>
  )
}

function StarRating({ rating, reviewCount }: { rating: number; reviewCount?: number }) {
  return (
    <div className="flex items-center gap-1 mt-0.5">
      <span className="text-yellow-400 text-xs">★</span>
      <span className="text-xs text-gray-600 font-medium">{rating.toFixed(1)}</span>
      {reviewCount !== undefined && (
        <span className="text-xs text-gray-400">({reviewCount.toLocaleString('pt-BR')})</span>
      )}
    </div>
  )
}

function EventItem({ event, added, onToggle, onDetail }: { event: RoleEvent; added: boolean; onToggle: () => void; onDetail: () => void }) {
  let dateStr = ''
  let timeStr = ''
  try {
    const d = (event.date as any)?.toDate ? (event.date as any).toDate() : new Date((event.date as any)?.seconds * 1000)
    dateStr = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
    timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {}
  return (
    <div className={`flex rounded-xl border overflow-hidden transition-all ${added ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-white'}`}>
      {event.photoUrl ? (
        <div className="relative w-20 h-20 flex-shrink-0">
          <img src={getOptimizedUrl(event.photoUrl, 160)} alt={event.name} className="absolute inset-0 w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-20 h-20 flex-shrink-0 bg-purple-50 flex items-center justify-center text-2xl">🎭</div>
      )}
      <div className="flex-1 p-3 min-w-0 flex flex-col justify-between">
        <div>
          {dateStr && (
            <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide capitalize">
              {dateStr}{timeStr ? ` · ${timeStr}` : ''}
            </p>
          )}
          <p className="font-semibold text-gray-800 text-sm leading-tight truncate mt-0.5">{event.name}</p>
          {event.venue && <p className="text-xs text-gray-400 truncate mt-0.5">📍 {event.venue}</p>}
          {event.price && <p className="text-xs font-semibold text-green-700 mt-0.5">{event.price}</p>}
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <button onClick={onDetail} className="text-xs text-purple-600 font-bold hover:underline">
            Ver detalhes →
          </button>
          <AddBtn added={added} onToggle={onToggle} />
        </div>
      </div>
    </div>
  )
}

function DirectionsBtn({ lat, lng, placeId, name, fromLat, fromLng }: { lat?: number; lng?: number; placeId?: string; name: string; fromLat?: number; fromLng?: number }) {
  const params = new URLSearchParams({ api: '1', travelmode: 'driving' })
  if (placeId) params.set('destination_place_id', placeId)
  if (lat && lng) params.set('destination', `${lat},${lng}`)
  else params.set('destination', name)
  if (fromLat && fromLng) params.set('origin', `${fromLat},${fromLng}`)
  return (
    <a
      href={`https://www.google.com/maps/dir/?${params}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-blue-500 font-medium mt-0.5 flex items-center gap-0.5 hover:underline"
    >
      🗺️ Como chegar
    </a>
  )
}

function EatItem({ eat, added, onToggle, onDetail, fromLat, fromLng }: { eat: EatRow; added: boolean; onToggle: () => void; onDetail?: () => void; fromLat?: number; fromLng?: number }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${added ? 'border-green-200 bg-green-50' : eat.isAdvertiser ? 'border-orange-300 bg-orange-50/40' : 'border-gray-100 bg-white'}`}>
      <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-xl flex-shrink-0 mt-0.5">🍽️</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-gray-800 text-sm leading-tight truncate">{eat.name}</p>
          {eat.isAdvertiser && <span className="text-[10px] bg-orange-100 text-orange-600 font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0">Parceiro</span>}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{eat.category} · {eat.priceRange}</p>
        {eat.rating && <StarRating rating={eat.rating} reviewCount={eat.reviewCount} />}
        {eat.address && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {eat.address}</p>
        )}
        <div className="flex items-center gap-3 mt-0.5">
          {onDetail && <button onClick={onDetail} className="text-xs text-orange-500 font-medium">Ver detalhes →</button>}
          <DirectionsBtn lat={eat.lat} lng={eat.lng} placeId={eat.googlePlaceId} name={eat.name} fromLat={fromLat} fromLng={fromLng} />
        </div>
      </div>
      <AddBtn added={added} onToggle={onToggle} />
    </div>
  )
}

function StayItem({ stay, added, onToggle, onDetail, fromLat, fromLng }: { stay: StayRow; added: boolean; onToggle: () => void; onDetail?: () => void; fromLat?: number; fromLng?: number }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${added ? 'border-green-200 bg-green-50' : stay.isAdvertiser ? 'border-orange-300 bg-orange-50/40' : 'border-gray-100 bg-white'}`}>
      <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl flex-shrink-0 mt-0.5">🏡</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-gray-800 text-sm leading-tight truncate">{stay.name}</p>
          {stay.isAdvertiser && <span className="text-[10px] bg-green-100 text-green-700 font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0">Parceiro</span>}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {stay.category}{stay.priceFrom ? ` · a partir de R$${stay.priceFrom}/noite` : ''}
        </p>
        {stay.rating && <StarRating rating={stay.rating} reviewCount={stay.reviewCount} />}
        {stay.address && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {stay.address}</p>
        )}
        <div className="flex items-center gap-3 mt-0.5">
          {onDetail && <button onClick={onDetail} className="text-xs text-blue-500 font-medium">Ver detalhes →</button>}
          <DirectionsBtn lat={stay.lat} lng={stay.lng} placeId={stay.googlePlaceId} name={stay.name} fromLat={fromLat} fromLng={fromLng} />
        </div>
      </div>
      <AddBtn added={added} onToggle={onToggle} />
    </div>
  )
}

const PRICE_ORDER: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
}

function sortItems<T extends { rating?: number; lat?: number; lng?: number; priceLevel?: string; priceFrom?: number | null; isAdvertiser?: boolean }>(
  items: T[], sort: SortKey, originLat: number, originLng: number
): T[] {
  const advertisers = items.filter((i) => i.isAdvertiser)
  const rest = [...items.filter((i) => !i.isAdvertiser)].sort((a, b) => {
    if (sort === 'rating') return (b.rating ?? 0) - (a.rating ?? 0)
    if (sort === 'distance') {
      const da = a.lat != null && a.lng != null ? haversineDistance(originLat, originLng, a.lat, a.lng) : 9999
      const db = b.lat != null && b.lng != null ? haversineDistance(originLat, originLng, b.lat, b.lng) : 9999
      return da - db
    }
    if (sort === 'price') {
      const pa = a.priceFrom != null ? a.priceFrom : (PRICE_ORDER[a.priceLevel || ''] ?? 2) * 100
      const pb = b.priceFrom != null ? b.priceFrom : (PRICE_ORDER[b.priceLevel || ''] ?? 2) * 100
      return pa - pb
    }
    return 0
  })
  return [...advertisers, ...rest]
}

function OriginToggle({ mode, loading, onToggle, destName }: { mode: 'destination' | 'me'; loading: boolean; onToggle: (m: 'destination' | 'me') => void; destName: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-xs text-gray-400 flex-shrink-0">Referência:</span>
      <div className="flex rounded-full border border-gray-200 overflow-hidden text-xs">
        <button
          onClick={() => onToggle('destination')}
          className={`px-3 py-1 font-semibold transition-colors truncate max-w-[140px] ${mode === 'destination' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          🏕️ {destName}
        </button>
        <button
          onClick={() => onToggle('me')}
          className={`px-3 py-1 font-semibold transition-colors flex-shrink-0 ${mode === 'me' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          {loading ? '⏳' : '📍 Eu'}
        </button>
      </div>
    </div>
  )
}

function SortBar({ sort, onSort, showPrice }: { sort: SortKey; onSort: (s: SortKey) => void; showPrice: boolean }) {
  const opts: { key: SortKey; label: string }[] = [
    { key: 'rating', label: '⭐ Melhor avaliado' },
    { key: 'distance', label: '📍 Mais perto' },
    ...(showPrice ? [{ key: 'price' as SortKey, label: '💲 Mais barato' }] : []),
  ]
  return (
    <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => onSort(o.key)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            sort === o.key
              ? 'bg-orange-500 text-white border-orange-500'
              : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function SectionLabel({ source }: { source: 'firestore' | 'google' }) {
  if (source !== 'google') return null
  return (
    <p className="text-xs text-gray-400 mb-2 text-center">
      📍 Sugestões do Google para a região
    </p>
  )
}

function EmptyTab({ city, type, href }: { city: string; type: string; href: string }) {
  return (
    <div className="text-center py-10">
      <div className="text-4xl mb-3">🔍</div>
      <p className="text-gray-600 font-semibold">Sem {type} em {city} ainda</p>
      <p className="text-gray-400 text-sm mt-1 mb-4">Seja o primeiro a sugerir!</p>
      <Link href={href} className="text-sm font-semibold text-orange-500 border border-orange-300 px-4 py-2 rounded-xl">
        + Sugerir {type}
      </Link>
    </div>
  )
}

// ── Tela vazia com roteiros da comunidade ────────────────────

function RoteiroEmptyState() {
  const { user } = useAuth()
  const [roteiros, setRoteiros] = useState<SavedRoteiro[]>([])
  const [loading, setLoading] = useState(true)
  const [copyingId, setCopyingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showLogin, setShowLogin] = useState(false)
  const [cityFilter, setCityFilter] = useState('')
  const [sortByRating, setSortByRating] = useState(false)
  const [reviewTarget, setReviewTarget] = useState<SavedRoteiro | null>(null)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set())
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set())
  const [reviewsMap, setReviewsMap] = useState<Record<string, RoteiroReview[]>>({})
  const [reviewPageMap, setReviewPageMap] = useState<Record<string, number>>({})
  const [loadingReviews, setLoadingReviews] = useState<Set<string>>(new Set())

  useEffect(() => {
    getPublishedRoteiros().then(setRoteiros).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!user || roteiros.length === 0) return
    Promise.all(roteiros.map((r) => hasUserReviewedRoteiro(user.uid, r.id))).then((results) => {
      const ids = new Set(roteiros.filter((_, i) => results[i]).map((r) => r.id))
      setReviewedIds(ids)
    })
  }, [user, roteiros])

  async function handleCopy(r: SavedRoteiro) {
    if (!user) { setShowLogin(true); return }
    setCopyingId(r.id)
    try {
      await copyRoteiroToProfile(r, user.uid, user.displayName || 'Usuário', user.photoURL ?? undefined)
      setCopiedId(r.id)
      setTimeout(() => setCopiedId(null), 2500)
    } finally {
      setCopyingId(null)
    }
  }

  async function toggleReviews(roteiroId: string) {
    const isOpen = expandedReviews.has(roteiroId)
    if (isOpen) {
      setExpandedReviews((prev) => { const s = new Set(prev); s.delete(roteiroId); return s })
      return
    }
    setExpandedReviews((prev) => new Set([...prev, roteiroId]))
    if (reviewsMap[roteiroId]) return
    setLoadingReviews((prev) => new Set([...prev, roteiroId]))
    try {
      const reviews = await getRoteiroReviews(roteiroId)
      setReviewsMap((prev) => ({ ...prev, [roteiroId]: reviews }))
      setReviewPageMap((prev) => ({ ...prev, [roteiroId]: 0 }))
    } finally {
      setLoadingReviews((prev) => { const s = new Set(prev); s.delete(roteiroId); return s })
    }
  }

  async function handleSubmitReview() {
    if (!user || !reviewTarget || reviewRating === 0) return
    setSubmittingReview(true)
    try {
      await addRoteiroReview({
        roteiroId: reviewTarget.id,
        roteiroName: reviewTarget.name,
        userId: user.uid,
        userName: user.displayName || 'Usuário',
        userPhoto: user.photoURL ?? undefined,
        rating: reviewRating,
        text: reviewText.trim(),
      })
      setReviewedIds((prev) => new Set([...prev, reviewTarget.id]))
      setRoteiros((prev) => prev.map((r) => r.id === reviewTarget.id
        ? { ...r, averageRating: ((r.averageRating || 0) * (r.reviewCount || 0) + reviewRating) / ((r.reviewCount || 0) + 1), reviewCount: (r.reviewCount || 0) + 1 }
        : r
      ))
      const newReview: RoteiroReview = {
        id: Date.now().toString(),
        roteiroId: reviewTarget.id,
        roteiroName: reviewTarget.name,
        userId: user!.uid,
        userName: user!.displayName || 'Usuário',
        userPhoto: user!.photoURL ?? undefined,
        rating: reviewRating,
        text: reviewText.trim(),
        createdAt: { toDate: () => new Date() } as any,
      }
      setReviewsMap((prev) => ({
        ...prev,
        [reviewTarget.id]: [newReview, ...(prev[reviewTarget.id] || [])],
      }))
      setReviewTarget(null)
      setReviewRating(0)
      setReviewText('')
    } finally {
      setSubmittingReview(false)
    }
  }

  const filtered = roteiros
    .filter((r) => !cityFilter || r.destination.city.toLowerCase().includes(cityFilter.toLowerCase()))
    .sort((a, b) => sortByRating ? (b.averageRating || 0) - (a.averageRating || 0) : 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🗺️</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Seu roteiro está vazio</h1>
        <p className="text-gray-500 mb-5">Escolha um destino primeiro para montar seu roteiro.</p>
        <Link href="/" className="btn-primary inline-block">Descobrir destinos →</Link>
      </div>

      {/* Roteiros da comunidade */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900">🗓️ Roteiros da comunidade</h2>
          <span className="text-xs text-gray-400">Copie e adapte</span>
        </div>

        <input
          type="text"
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          placeholder="Filtrar por cidade..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 mb-2"
        />
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSortByRating((prev) => !prev)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              sortByRating
                ? 'bg-yellow-400 text-white border-yellow-400'
                : 'bg-white text-gray-500 border-gray-200 hover:border-yellow-300'
            }`}
          >
            ⭐ Mais avaliados
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl bg-gray-100 animate-pulse h-52" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-2xl">
            <div className="text-4xl mb-3">🗺️</div>
            <p className="font-semibold text-gray-700 mb-1">Nenhum roteiro encontrado</p>
            <p className="text-sm text-gray-400">
              {cityFilter ? `Nenhum roteiro em "${cityFilter}" ainda.` : 'Seja o primeiro a compartilhar um roteiro!'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((r) => (
              <div key={r.id} className="card p-4">
                {r.destination.photoUrl ? (
                  <div className="h-36 rounded-xl overflow-hidden bg-gray-100 mb-3">
                    <img
                      src={r.destination.photoUrl.startsWith('/api/photo') ? r.destination.photoUrl : getOptimizedUrl(r.destination.photoUrl, 640)}
                      alt={r.destination.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="h-36 rounded-xl bg-orange-50 flex items-center justify-center text-4xl mb-3">🗺️</div>
                )}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-gray-900 leading-tight">{r.name}</h3>
                  {r.copyCount ? (
                    <span className="text-xs bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                      📋 {r.copyCount}x copiado
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-gray-500 mb-2">📍 {r.destination.city}, {r.destination.state}</p>
                <div className="flex items-center gap-1.5 mb-3">
                  {r.authorPhotoUrl ? (
                    <img src={r.authorPhotoUrl} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-orange-100 flex-shrink-0 flex items-center justify-center text-[9px] text-orange-600 font-bold">
                      {r.authorName?.charAt(0).toUpperCase() || '?'}
                    </span>
                  )}
                  <p className="text-xs text-gray-500 truncate">{r.authorName || 'Anônimo'}</p>
                  {r.scheduledDate && (
                    <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
                      📅 {new Date(r.scheduledDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                </div>
                {(r.averageRating || 0) > 0 && (
                  <div className="flex items-center gap-1 mb-2">
                    {[1,2,3,4,5].map((s) => (
                      <span key={s} className={`text-sm ${s <= Math.round(r.averageRating!) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                    ))}
                    <span className="text-xs text-gray-500 ml-1">{r.averageRating!.toFixed(1)} ({r.reviewCount})</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Link href={`/ver/${r.id}`} className="flex-1 py-2 rounded-xl text-sm font-semibold text-center border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                    Ver →
                  </Link>
                  <button
                    onClick={() => handleCopy(r)}
                    disabled={copyingId === r.id || r.userId === user?.uid}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                      r.userId === user?.uid ? 'bg-gray-100 text-gray-400 cursor-default' : copiedId === r.id ? 'bg-green-100 text-green-700' : 'bg-orange-500 text-white hover:bg-orange-600'
                    }`}
                  >
                    {r.userId === user?.uid ? 'Seu roteiro' : copiedId === r.id ? '✓ Copiado!' : copyingId === r.id ? '...' : '📋 Copiar'}
                  </button>
                  <button
                    onClick={() => { if (!user) { setShowLogin(true); return } setReviewTarget(r); setReviewRating(0); setReviewText('') }}
                    disabled={reviewedIds.has(r.id)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                      reviewedIds.has(r.id) ? 'bg-gray-100 text-gray-400' : 'bg-yellow-400 text-white hover:bg-yellow-500'
                    }`}
                  >
                    {reviewedIds.has(r.id) ? '✓ Avaliado' : '⭐ Avaliar'}
                  </button>
                </div>

                {/* Avaliações colapsáveis */}
                {(r.reviewCount || 0) > 0 && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <button
                      onClick={() => toggleReviews(r.id)}
                      className="w-full flex items-center justify-between text-sm text-gray-500 hover:text-orange-500 transition-colors"
                    >
                      <span className="font-semibold">💬 {r.reviewCount} {(r.reviewCount || 0) !== 1 ? 'avaliações' : 'avaliação'}</span>
                      <span className="text-xs">{expandedReviews.has(r.id) ? '▲ Fechar' : '▼ Ver'}</span>
                    </button>

                    {expandedReviews.has(r.id) && (
                      <div className="mt-3">
                        {loadingReviews.has(r.id) ? (
                          <div className="flex flex-col gap-2">
                            {[1,2].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
                          </div>
                        ) : (() => {
                          const allRevs = reviewsMap[r.id] || []
                          const page = reviewPageMap[r.id] || 0
                          const totalPages = Math.ceil(allRevs.length / 5)
                          const slice = allRevs.slice(page * 5, (page + 1) * 5)
                          return (
                            <>
                              <div className="flex flex-col gap-2">
                                {slice.map((rv) => (
                                  <div key={rv.id} className="bg-gray-50 rounded-xl p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                      {rv.userPhoto ? (
                                        <img src={rv.userPhoto} alt={rv.userName} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                                      ) : (
                                        <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-600 flex-shrink-0">
                                          {rv.userName.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                      <span className="text-xs font-semibold text-gray-700 truncate">{rv.userName}</span>
                                      <span className="text-yellow-400 text-xs ml-auto flex-shrink-0">{'★'.repeat(rv.rating)}{'☆'.repeat(5 - rv.rating)}</span>
                                    </div>
                                    {rv.text && <p className="text-xs text-gray-600 leading-relaxed">{rv.text}</p>}
                                  </div>
                                ))}
                              </div>
                              {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-2">
                                  <button
                                    onClick={() => setReviewPageMap((prev) => ({ ...prev, [r.id]: page - 1 }))}
                                    disabled={page === 0}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-gray-50"
                                  >
                                    ← Anterior
                                  </button>
                                  <span className="text-xs text-gray-400">{page + 1}/{totalPages}</span>
                                  <button
                                    onClick={() => setReviewPageMap((prev) => ({ ...prev, [r.id]: page + 1 }))}
                                    disabled={page >= totalPages - 1}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-gray-50"
                                  >
                                    Próxima →
                                  </button>
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de avaliação */}
      {reviewTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="bg-white rounded-t-3xl w-full max-w-2xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Avaliar roteiro</h3>
            <p className="text-sm text-gray-500 mb-4">{reviewTarget.name}</p>
            <div className="flex justify-center gap-3 mb-5">
              {[1,2,3,4,5].map((s) => (
                <button key={s} onClick={() => setReviewRating(s)} className={`text-4xl transition-transform hover:scale-110 ${s <= reviewRating ? 'text-yellow-400' : 'text-gray-200'}`}>★</button>
              ))}
            </div>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Conte sua experiência com este roteiro (opcional)"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none mb-4"
            />
            <button
              onClick={handleSubmitReview}
              disabled={reviewRating === 0 || submittingReview}
              className="w-full btn-primary mb-3 disabled:opacity-50"
            >
              {submittingReview ? 'Enviando...' : 'Enviar avaliação'}
            </button>
            <button onClick={() => setReviewTarget(null)} className="w-full text-sm text-gray-400">Cancelar</button>
          </div>
        </div>
      )}

      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="bg-white rounded-t-3xl w-full max-w-2xl p-6 text-center">
            <div className="text-4xl mb-3">⭐</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Entre para avaliar</h3>
            <p className="text-gray-500 text-sm mb-5">Entre com Google para avaliar e copiar roteiros da comunidade.</p>
            <button
              onClick={async () => {
                const { auth, googleProvider } = await import('@/lib/firebase')
                const { signInWithPopup } = await import('firebase/auth')
                try { await signInWithPopup(auth, googleProvider) } catch {}
                setShowLogin(false)
              }}
              className="w-full btn-primary mb-3"
            >
              Entrar com Google
            </button>
            <button onClick={() => setShowLogin(false)} className="text-sm text-gray-400">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────

function RoteiroContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const updateId = searchParams.get('update')
  const { user } = useAuth()
  const { destination, events, eats, stays, toggleEvent, toggleEat, toggleStay, hasEvent, hasEat, hasStay, clearRoteiro, itemCount } = useRoteiro()

  const [tab, setTab] = useState<Tab>('evento')
  const [allEvents, setAllEvents] = useState<RoleEvent[]>([])
  const [allEats, setAllEats] = useState<EatRow[]>([])
  const [allStays, setAllStays] = useState<StayRow[]>([])
  const [eventsPage, setEventsPage] = useState(0)
  const [eatsSource, setEatsSource] = useState<'firestore' | 'google'>('firestore')
  const [staysSource, setStaysSource] = useState<'firestore' | 'google'>('firestore')
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [roteiroName, setRoteiroName] = useState('')
  const [showLogin, setShowLogin] = useState(false)
  const [detailPlaceId, setDetailPlaceId] = useState<string | null>(null)
  const [detailEventId, setDetailEventId] = useState<string | null>(null)
  const [detailEatId, setDetailEatId] = useState<string | null>(null)
  const [detailStayId, setDetailStayId] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('rating')
  const [eatsPage, setEatsPage] = useState(0)
  const [staysPage, setStaysPage] = useState(0)
  const [originMode, setOriginMode] = useState<'destination' | 'me'>('destination')
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)

  function handleOriginMode(mode: 'destination' | 'me') {
    setOriginMode(mode)
    if (mode === 'me' && !userCoords) {
      setGeoLoading(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoLoading(false) },
        () => { setOriginMode('destination'); setGeoLoading(false) }
      )
    }
  }

  useEffect(() => {
    if (!destination) { setLoadingData(false); return }
    if (destination.source === 'event') setTab('comer')
    setRoteiroName(`Rolê em ${destination.city}`)
    setLoadingData(true)

    async function load() {
      const city = destination!.city
      const lat = destination!.lat
      const lng = destination!.lng

      const [fsEats, fsStays, fsEvents] = await Promise.all([
        getApprovedEats(city),
        getApprovedStays(city),
        getApprovedEvents(city),
      ])
      setAllEvents(fsEvents)

      const [googleEats, googleStays] = await Promise.all([
        fetch(`/api/nearby?lat=${lat}&lng=${lng}&type=eats`).then((res) => res.json()).catch(() => ({ results: [] })),
        fetch(`/api/nearby?lat=${lat}&lng=${lng}&type=stays`).then((res) => res.json()).catch(() => ({ results: [] })),
      ])

      const advertiserEats = fsEats.map((e) => ({ id: e.id, name: e.name, city: e.city, category: e.category, priceRange: e.priceRange, rating: e.averageRating || undefined, reviewCount: e.reviewCount || undefined, lat: e.lat, lng: e.lng, photoUrl: e.photoUrl, isAdvertiser: (e as any).plan !== 'free' }))
      const googleEatRows = (googleEats.results || []).map((e: any) => ({ ...e, city }))
      setAllEats([...advertiserEats, ...googleEatRows])
      setEatsSource(advertiserEats.length > 0 ? 'firestore' : 'google')

      const advertiserStays = fsStays.map((s) => ({ id: s.id, name: s.name, city: s.city, category: s.category, priceFrom: s.priceFrom, bookingUrl: s.bookingUrl, rating: s.averageRating || undefined, reviewCount: s.reviewCount || undefined, lat: s.lat, lng: s.lng, photoUrl: s.photoUrl, isAdvertiser: (s as any).plan !== 'free' }))
      const googleStayRows = (googleStays.results || []).map((s: any) => ({ ...s, city }))
      setAllStays([...advertiserStays, ...googleStayRows])
      setStaysSource(advertiserStays.length > 0 ? 'firestore' : 'google')

      setLoadingData(false)
    }

    load()
  }, [destination?.id])

  async function handleSave() {
    if (!user) { setShowLogin(true); return }
    if (!destination) return
    setSaving(true)
    setSaveError(false)
    try {
      const name = roteiroName || `Rolê em ${destination.city}`
      if (updateId) {
        await updateRoteiroItems(updateId, { name, destination, events, eats, stays })
      } else {
        await saveRoteiro({ userId: user.uid, name, destination, events, eats, stays })
      }
      setSaved(true)
      setTimeout(() => { clearRoteiro(); router.push('/perfil?tab=roteiros') }, 1800)
    } catch (err) {
      console.error('[saveRoteiro]', err)
      setSaving(false)
      setSaveError(true)
    }
  }

  if (!destination) {
    return <RoteiroEmptyState />
  }

  const backHref = destination.source === 'event'
    ? `/evento/${destination.id}`
    : destination.source === 'external' && destination.googlePlaceId
    ? `/destino/google/${destination.googlePlaceId}`
    : `/destino/${destination.id}`

  const fromEvent = destination.source === 'event'

  const TABS = [
    ...(!fromEvent ? [{ id: 'evento' as Tab, icon: '🎭', label: 'Eventos', count: events.length }] : []),
    { id: 'comer'  as Tab, icon: '🍽️', label: 'Comer',   count: eats.length },
    { id: 'dormir' as Tab, icon: '🏡', label: 'Dormir',  count: stays.length },
  ]

  return (
    <div className="max-w-2xl mx-auto pb-40">

      {detailPlaceId && (
        <PlaceDetailModal placeId={detailPlaceId} onClose={() => setDetailPlaceId(null)} />
      )}
      {detailEventId && (
        <EventDetailModal eventId={detailEventId} onClose={() => setDetailEventId(null)} />
      )}
      {detailEatId && (
        <EatDetailModal eatId={detailEatId} onClose={() => setDetailEatId(null)} />
      )}
      {detailStayId && (
        <StayDetailModal stayId={detailStayId} onClose={() => setDetailStayId(null)} />
      )}

      {/* ── Hero do destino ── */}
      <div className="relative h-52 bg-gray-100">
        {destination.photoUrl ? (
          <Image src={destination.photoUrl} alt={destination.name} fill className="object-cover"
            sizes="100vw" unoptimized={destination.photoUrl.startsWith('/api/photo')} />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-6xl">🗺️</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-black/10" />
        {updateId ? (
          <button
            onClick={() => { clearRoteiro(); router.push('/perfil?tab=roteiros') }}
            className="absolute top-4 left-4 bg-white/90 rounded-full px-3 h-9 flex items-center gap-1.5 text-gray-700 text-xs font-bold shadow hover:bg-gray-100 transition-colors"
          >
            ← Cancelar
          </button>
        ) : (
          <>
            <Link href={backHref} className="absolute top-4 left-4 bg-white/90 rounded-full w-9 h-9 flex items-center justify-center text-gray-700 shadow">←</Link>
            <button
              onClick={() => { clearRoteiro(); router.push('/') }}
              className="absolute top-4 right-4 bg-white/90 rounded-full px-3 h-9 flex items-center gap-1.5 text-red-500 text-xs font-bold shadow hover:bg-red-50 transition-colors"
            >
              🗑️ Desistir
            </button>
          </>
        )}
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-white/70 text-xs mb-0.5">📍 Destino selecionado</p>
          <h1 className="text-white text-xl font-bold leading-tight">{destination.name}</h1>
          <p className="text-white/80 text-sm">{destination.city}, {destination.state}</p>
        </div>
      </div>

      {/* ── Nome editável ── */}
      <div className="px-4 pt-5 pb-1">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Nome do roteiro</label>
        <input
          type="text"
          value={roteiroName}
          onChange={(e) => setRoteiroName(e.target.value)}
          className="w-full text-xl font-bold text-gray-900 border-0 border-b-2 border-orange-200 focus:border-orange-500 focus:outline-none py-1 bg-transparent mt-1"
          placeholder="Ex: Finde em Floripa 🌊"
        />
      </div>


      {/* ── Tabs ── */}
      <div className="flex px-4 gap-2 py-4">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === t.id ? 'bg-orange-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
            {t.count > 0 && (
              <span className={`text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold ${tab === t.id ? 'bg-white/25 text-white' : 'bg-orange-500 text-white'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Conteúdo da tab ── */}
      <div className="px-4">
        {loadingData ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => <ListItemSkeleton key={i} />)}
          </div>
        ) : tab === 'evento' ? (
          <>
            {/* Eventos já adicionados de outras cidades */}
            {events.filter((ev) => !allEvents.some((ae) => ae.id === ev.id)).map((ev) => {
              let dateStr = ''
              try {
                const d = (ev.date as any)?.toDate ? (ev.date as any).toDate() : new Date((ev.date as any)?.seconds * 1000)
                dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
              } catch {}
              return (
                <div key={ev.id} className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 mb-2">
                  <span className="text-xl flex-shrink-0">🎭</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{ev.name}</p>
                    <p className="text-xs text-gray-500">{ev.city}{dateStr ? ` · ${dateStr}` : ''}</p>
                  </div>
                  <button onClick={() => toggleEvent(ev)} className="flex-shrink-0 text-xs font-bold text-green-700 bg-green-100 border border-green-200 px-2 py-1 rounded-xl hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors">✓ Adicionado</button>
                </div>
              )
            })}
            {/* Eventos da cidade */}
            {allEvents.length === 0
              ? events.filter((ev) => !allEvents.some((ae) => ae.id === ev.id)).length === 0
                ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">🎭</div>
                    <p className="text-gray-600 font-semibold">Sem eventos em {destination.city} ainda</p>
                    <p className="text-gray-400 text-sm mt-1">Confira a agenda completa em Shows & Eventos</p>
                    <a
                      href="/anunciar?tipo=evento"
                      className="inline-block mt-4 bg-purple-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-purple-700 transition-colors"
                    >
                      📣 Anunciar um evento aqui
                    </a>
                  </div>
                )
                : <p className="text-center text-xs text-gray-400 mt-2 py-4">Sem outros eventos em {destination.city}</p>
              : <div className="flex flex-col gap-2 stagger">
                  {allEvents.slice(eventsPage * 5, (eventsPage + 1) * 5).map((ev) => (
                    <EventItem
                      key={ev.id}
                      event={ev}
                      added={hasEvent(ev.id)}
                      onToggle={() => toggleEvent({ id: ev.id, name: ev.name, city: ev.city, venue: ev.venue || '', date: ev.date, category: ev.category, photoUrl: ev.photoUrl, mapsLink: ev.mapsLink })}
                      onDetail={() => setDetailEventId(ev.id)}
                    />
                  ))}
                  <Pagination page={eventsPage} totalPages={Math.ceil(allEvents.length / 5)} onPrev={() => setEventsPage((p) => p - 1)} onNext={() => setEventsPage((p) => p + 1)} />
                </div>
            }
          </>
        ) : tab === 'comer' ? (
          allEats.length === 0
            ? <EmptyTab city={destination.city} type="restaurantes" href="/sugerir?tipo=comer" />
            : (() => {
                const sortLat = originMode === 'me' && userCoords ? userCoords.lat : destination.lat
                const sortLng = originMode === 'me' && userCoords ? userCoords.lng : destination.lng
                const fromLat = originMode === 'destination' ? destination.lat : undefined
                const fromLng = originMode === 'destination' ? destination.lng : undefined
                return <>
                  <SectionLabel source={eatsSource} />
                  <OriginToggle mode={originMode} loading={geoLoading} onToggle={handleOriginMode} destName={destination.name} />
                  <SortBar sort={sort} onSort={(s) => { setSort(s); setEatsPage(0); setStaysPage(0) }} showPrice />
                  <div className="flex flex-col gap-2 stagger">
                    {sortItems(allEats, sort, sortLat, sortLng).slice(eatsPage * 5, (eatsPage + 1) * 5).map((e) => (
                      <EatItem key={e.id} eat={e} added={hasEat(e.id)} fromLat={fromLat} fromLng={fromLng}
                        onToggle={() => toggleEat({ id: e.id, name: e.name, city: e.city, category: e.category, priceRange: e.priceRange, googlePlaceId: e.googlePlaceId, address: e.address, photoUrl: e.photoUrl, lat: e.lat, lng: e.lng })}
                        onDetail={!e.googlePlaceId ? () => setDetailEatId(e.id) : () => setDetailPlaceId(e.googlePlaceId!)} />
                    ))}
                    <Pagination page={eatsPage} totalPages={Math.ceil(allEats.length / 5)} onPrev={() => setEatsPage((p) => p - 1)} onNext={() => setEatsPage((p) => p + 1)} />
                  </div>
                  <a href="/sugerir?tipo=comer" className="mt-4 flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-sm hover:shadow-md hover:from-orange-600 hover:to-orange-500 transition-all">
                    <span className="text-xl">🍽️</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold leading-tight">Conhece um bom restaurante aqui?</p>
                      <p className="text-xs text-orange-100">Sugira para a comunidade — é gratuito</p>
                    </div>
                    <span className="text-white/80 font-bold text-lg flex-shrink-0">›</span>
                  </a>
                </>
              })()
        ) : (
          allStays.length === 0
            ? <EmptyTab city={destination.city} type="hospedagens" href="/sugerir?tipo=hospedar" />
            : (() => {
                const sortLat = originMode === 'me' && userCoords ? userCoords.lat : destination.lat
                const sortLng = originMode === 'me' && userCoords ? userCoords.lng : destination.lng
                const fromLat = originMode === 'destination' ? destination.lat : undefined
                const fromLng = originMode === 'destination' ? destination.lng : undefined
                return <>
                  <SectionLabel source={staysSource} />
                  <OriginToggle mode={originMode} loading={geoLoading} onToggle={handleOriginMode} destName={destination.name} />
                  <SortBar sort={sort} onSort={(s) => { setSort(s); setEatsPage(0); setStaysPage(0) }} showPrice />
                  <div className="flex flex-col gap-2 stagger">
                    {sortItems(allStays, sort, sortLat, sortLng).slice(staysPage * 5, (staysPage + 1) * 5).map((s) => (
                      <StayItem key={s.id} stay={s} added={hasStay(s.id)} fromLat={fromLat} fromLng={fromLng}
                        onToggle={() => toggleStay({ id: s.id, name: s.name, city: s.city, category: s.category, priceFrom: s.priceFrom ?? undefined, bookingUrl: s.bookingUrl ?? undefined, googlePlaceId: s.googlePlaceId, address: s.address, photoUrl: s.photoUrl, lat: s.lat, lng: s.lng })}
                        onDetail={!s.googlePlaceId ? () => setDetailStayId(s.id) : () => setDetailPlaceId(s.googlePlaceId!)} />
                    ))}
                    <Pagination page={staysPage} totalPages={Math.ceil(allStays.length / 5)} onPrev={() => setStaysPage((p) => p - 1)} onNext={() => setStaysPage((p) => p + 1)} />
                  </div>
                  <a href="/sugerir?tipo=hospedar" className="mt-4 flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-green-600 to-green-500 text-white shadow-sm hover:shadow-md hover:from-green-700 hover:to-green-600 transition-all">
                    <span className="text-xl">🏡</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold leading-tight">Conhece uma boa hospedagem aqui?</p>
                      <p className="text-xs text-green-100">Sugira para a comunidade — é gratuito</p>
                    </div>
                    <span className="text-white/80 font-bold text-lg flex-shrink-0">›</span>
                  </a>
                </>
              })()
        )}
      </div>

      {/* ── Modal de login ── */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="bg-white rounded-t-3xl w-full max-w-2xl p-6 text-center">
            <div className="text-4xl mb-3">🗓️</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Salvar roteiro</h3>
            <p className="text-gray-500 text-sm mb-5">Entre com Google para salvar e acessar de qualquer dispositivo.</p>
            <button
              onClick={async () => {
                try { await signInWithPopup(auth, googleProvider) } catch {}
                setShowLogin(false)
              }}
              className="w-full btn-primary mb-3"
            >
              Entrar com Google
            </button>
            <button onClick={() => setShowLogin(false)} className="text-sm text-gray-400">Cancelar</button>
          </div>
        </div>
      )}

      {/* ── Barra flutuante ── */}
      <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-2 pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-4 flex items-center gap-3">
            <div className="flex-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
              {events.length > 0 && <span className="text-gray-600">🎭 {events.length} evento{events.length !== 1 ? 's' : ''}</span>}
              {eats.length > 0 && <span className="text-gray-600">🍽️ {eats.length} lugar{eats.length !== 1 ? 'es' : ''}</span>}
              {stays.length > 0 && <span className="text-gray-600">🏡 {stays.length} hospedagem{stays.length !== 1 ? 's' : ''}</span>}
              {itemCount === 0 && <span className="text-gray-400 text-xs">Adicione itens ou salve só o destino</span>}
            </div>
            <div className="flex flex-col items-end gap-1">
              {saveError && (
                <p className="text-xs text-red-500 font-medium">Erro ao salvar. Tente novamente.</p>
              )}
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all flex-shrink-0 ${
                  saved ? 'bg-green-500' : saving ? 'bg-orange-300 cursor-not-allowed' : saveError ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {saved ? '✅ Atualizado!' : saving ? 'Salvando...' : saveError ? '↺ Tentar novamente' : updateId ? '✅ Atualizar roteiro' : '🗓️ Salvar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


export default function RoteiroPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-16 text-center"><div className="skeleton h-52 w-full rounded-none mb-4" /><div className="skeleton h-8 w-48 mx-auto" /></div>}>
      <RoteiroContent />
    </Suspense>
  )
}
