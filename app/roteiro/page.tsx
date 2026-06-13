'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useRoteiro, type EatSnap, type StaySnap, type EventSnap, type NoteSnap, type NoteType } from '@/lib/roteiro-context'
import type { RoleEvent, RoteiroReview } from '@/types'
import { useAuth } from '@/lib/auth-context'
import { getApprovedEats, getApprovedStays, getApprovedEvents, saveRoteiro, updateRoteiroItems, getPublishedSharedRoteiros, getRoteirosByUser, copySharedRoteiroToProfile, addSharedRoteiroReview, getRoteiroReviews, hasUserReviewedRoteiro, reportReview, hasUserReportedReview, getUserRankLabel, shareRoteiro, type SavedRoteiro, type SharedRoteiro } from '@/lib/firestore'
import { auth, googleProvider } from '@/lib/firebase'
import { signInWithPopup } from 'firebase/auth'
import PlaceDetailModal from '@/components/PlaceDetailModal'
import EventDetailModal from '@/components/EventDetailModal'
import EatDetailModal from '@/components/EatDetailModal'
import StayDetailModal from '@/components/StayDetailModal'
import Pagination from '@/components/Pagination'
import ListItemSkeleton from '@/components/ListItemSkeleton'
import { haversineDistance } from '@/lib/geolocation'
import { getOptimizedUrl, uploadToCloudinary } from '@/lib/cloudinary'
import YouTubeEmbed from '@/components/YouTubeEmbed'
import RouteModal from '@/components/RouteModal'
import { useSuggestSheet, type SuggestType } from '@/lib/suggest-context'

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

const NOTE_META: Record<NoteType, { icon: string; label: string; pill: string }> = {
  dica:    { icon: '💡', label: 'Dica',    pill: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  atencao: { icon: '⚠️', label: 'Atenção', pill: 'bg-orange-50 text-orange-600 border-orange-200' },
  horario: { icon: '🕐', label: 'Horário', pill: 'bg-blue-50 text-blue-700 border-blue-200' },
  obs:     { icon: '📝', label: 'Obs.',    pill: 'bg-gray-50 text-gray-500 border-gray-200' },
}

function NotesEditor({ notes = [], onUpdate }: { notes?: NoteSnap[]; onUpdate: (n: NoteSnap[]) => void }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<NoteType>('dica')
  const [text, setText] = useState('')

  function add() {
    const t = text.trim()
    if (!t || notes.length >= 3) return
    onUpdate([...notes, { type, text: t }])
    setText('')
    setOpen(false)
  }

  return (
    <div className="border-t border-dashed border-gray-200 px-3 pt-2 pb-2.5">
      {notes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {notes.map((n, i) => {
            const m = NOTE_META[n.type]
            return (
              <span key={i} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${m.pill}`}>
                {m.icon} {n.text}
                <button
                  onClick={() => onUpdate(notes.filter((_, idx) => idx !== i))}
                  className="ml-0.5 opacity-50 hover:opacity-100 leading-none"
                >×</button>
              </span>
            )
          })}
        </div>
      )}
      {open ? (
        <div className="space-y-2">
          <div className="flex gap-1.5 flex-wrap">
            {(Object.keys(NOTE_META) as NoteType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`text-xs px-2.5 py-1 rounded-full border font-semibold transition-colors ${type === t ? NOTE_META[t].pill : 'bg-white text-gray-400 border-gray-200'}`}
              >
                {NOTE_META[t].icon} {NOTE_META[t].label}
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex: Reservar com antecedência"
            rows={2}
            maxLength={100}
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-orange-300"
          />
          <div className="flex gap-2 items-center">
            <button
              onClick={add}
              disabled={!text.trim()}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-orange-500 text-white disabled:opacity-40 transition-opacity"
            >
              Salvar
            </button>
            <button onClick={() => { setOpen(false); setText('') }} className="text-xs text-gray-400">
              Cancelar
            </button>
          </div>
        </div>
      ) : notes.length < 3 && (
        <button onClick={() => setOpen(true)} className="text-xs text-orange-500 font-semibold">
          + Adicionar nota
        </button>
      )}
    </div>
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

function EventItem({ event, added, onToggle, onDetail, notes, onUpdateNotes }: { event: RoleEvent; added: boolean; onToggle: () => void; onDetail: () => void; notes?: NoteSnap[]; onUpdateNotes?: (n: NoteSnap[]) => void }) {
  let dateStr = ''
  let timeStr = ''
  try {
    const d = (event.date as any)?.toDate ? (event.date as any).toDate() : new Date((event.date as any)?.seconds * 1000)
    dateStr = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
    timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {}
  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${added ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-white'}`}>
      <div className="flex">
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
      {added && onUpdateNotes && <NotesEditor notes={notes} onUpdate={onUpdateNotes} />}
    </div>
  )
}

function DirectionsBtn({ lat, lng, name, onRoute }: { lat?: number; lng?: number; name: string; onRoute: (lat: number, lng: number, name: string) => void }) {
  if (!lat || !lng) return null
  return (
    <button
      onClick={() => onRoute(lat, lng, name)}
      className="text-xs text-blue-500 font-medium mt-0.5 flex items-center gap-0.5 hover:underline"
    >
      🗺️ Como chegar
    </button>
  )
}

function EatItem({ eat, added, onToggle, onDetail, onRoute, fromLat, fromLng, notes, onUpdateNotes }: { eat: EatRow; added: boolean; onToggle: () => void; onDetail?: () => void; onRoute: (lat: number, lng: number, name: string) => void; fromLat?: number; fromLng?: number; notes?: NoteSnap[]; onUpdateNotes?: (n: NoteSnap[]) => void }) {
  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${added ? 'border-green-200 bg-green-50' : eat.isAdvertiser ? 'border-orange-300 bg-orange-50/40' : 'border-gray-100 bg-white'}`}>
      <div className="flex items-start gap-3 p-3">
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
            <DirectionsBtn lat={eat.lat} lng={eat.lng} name={eat.name} onRoute={onRoute} />
          </div>
        </div>
        <AddBtn added={added} onToggle={onToggle} />
      </div>
      {added && onUpdateNotes && <NotesEditor notes={notes} onUpdate={onUpdateNotes} />}
    </div>
  )
}

function StayItem({ stay, added, onToggle, onDetail, onRoute, fromLat, fromLng, notes, onUpdateNotes }: { stay: StayRow; added: boolean; onToggle: () => void; onDetail?: () => void; onRoute: (lat: number, lng: number, name: string) => void; fromLat?: number; fromLng?: number; notes?: NoteSnap[]; onUpdateNotes?: (n: NoteSnap[]) => void }) {
  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${added ? 'border-green-200 bg-green-50' : stay.isAdvertiser ? 'border-orange-300 bg-orange-50/40' : 'border-gray-100 bg-white'}`}>
      <div className="flex items-start gap-3 p-3">
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
            <DirectionsBtn lat={stay.lat} lng={stay.lng} name={stay.name} onRoute={onRoute} />
          </div>
        </div>
        <AddBtn added={added} onToggle={onToggle} />
      </div>
      {added && onUpdateNotes && <NotesEditor notes={notes} onUpdate={onUpdateNotes} />}
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

function EmptyTab({ city, type, suggestType }: { city: string; type: string; suggestType: SuggestType }) {
  const { openSheet } = useSuggestSheet()
  return (
    <div className="text-center py-10">
      <div className="text-4xl mb-3">🔍</div>
      <p className="text-gray-600 font-semibold">Sem {type} em {city} ainda</p>
      <p className="text-gray-400 text-sm mt-1 mb-4">Seja o primeiro a sugerir!</p>
      <button onClick={() => openSheet(suggestType)} className="text-sm font-semibold text-orange-500 border border-orange-300 px-4 py-2 rounded-xl">
        + Sugerir {type}
      </button>
    </div>
  )
}

const ROTEIRO_TAGS = [
  '🏖️ Praia', '💧 Cachoeira', '🥾 Trilha', '⛰️ Serra & Montanha',
  '🌳 Parque', '🔭 Mirante', '🏛️ Museu', '🎨 Teatro & Arte',
  '🍽️ Gastronomia', '👨‍👩‍👧 Família',
]

// ── Tela vazia com roteiros da comunidade ────────────────────

function RoteiroEmptyState() {
  const { user } = useAuth()
  const { loadState } = useRoteiro()
  const [roteiros, setRoteiros] = useState<SharedRoteiro[]>([])
  const [loading, setLoading] = useState(true)
  const [copyingId, setCopyingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showLogin, setShowLogin] = useState(false)
  const [cityFilter, setCityFilter] = useState('')
  const [sortByRating, setSortByRating] = useState(false)
  const [reviewTarget, setReviewTarget] = useState<SharedRoteiro | null>(null)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [reviewVideoUrl, setReviewVideoUrl] = useState('')
  const [reviewPhotos, setReviewPhotos] = useState<string[]>([])
  const [reviewPhotoPreviews, setReviewPhotoPreviews] = useState<string[]>([])
  const [reviewPhotoUploading, setReviewPhotoUploading] = useState(false)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set())
  const [alreadyCopiedIds, setAlreadyCopiedIds] = useState<Set<string>>(new Set())
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set())
  const [reviewsMap, setReviewsMap] = useState<Record<string, RoteiroReview[]>>({})
  const [reviewPageMap, setReviewPageMap] = useState<Record<string, number>>({})
  const [loadingReviews, setLoadingReviews] = useState<Set<string>>(new Set())
  const [tagFilter, setTagFilter] = useState<string | null>(null)

  useEffect(() => {
    getPublishedSharedRoteiros().then(setRoteiros).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!user) return
    getRoteirosByUser(user.uid).then((mine) => {
      const ids = new Set(
        mine
          .filter((r) => r.originalRoteiroId)
          .map((r) => r.originalRoteiroId as string)
      )
      setAlreadyCopiedIds(ids)
    }).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!user || roteiros.length === 0) return
    Promise.all(roteiros.map((r) => hasUserReviewedRoteiro(user.uid, r.id))).then((results) => {
      const ids = new Set(roteiros.filter((_, i) => results[i]).map((r) => r.id))
      setReviewedIds(ids)
    })
  }, [user, roteiros])

  async function handleCopy(r: SharedRoteiro) {
    if (!user) { setShowLogin(true); return }
    setCopyingId(r.id)
    try {
      await copySharedRoteiroToProfile(r, user.uid, user.displayName || 'Usuário', user.photoURL ?? undefined)
      setAlreadyCopiedIds((prev) => new Set([...prev, r.id]))
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

  async function handleReviewPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || reviewPhotos.length >= 3) return
    const localUrl = URL.createObjectURL(file)
    setReviewPhotoPreviews((p) => [...p, localUrl])
    setReviewPhotoUploading(true)
    try {
      const url = await uploadToCloudinary(file, () => {})
      setReviewPhotos((p) => [...p, url])
    } catch {
      setReviewPhotoPreviews((p) => p.slice(0, -1))
    } finally {
      setReviewPhotoUploading(false)
    }
  }

  function removeReviewPhoto(idx: number) {
    setReviewPhotoPreviews((p) => p.filter((_, i) => i !== idx))
    setReviewPhotos((p) => p.filter((_, i) => i !== idx))
  }

  async function handleSubmitReview() {
    if (!user || !reviewTarget || reviewRating === 0) return
    setSubmittingReview(true)
    try {
      const reviewerRank = await getUserRankLabel(user.uid).catch(() => '🌱 Novato')
      const ytMatch = reviewVideoUrl.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
      const ytId = ytMatch?.[1]
      await addSharedRoteiroReview({
        roteiroId: reviewTarget.id,
        roteiroName: reviewTarget.name,
        userId: user.uid,
        userName: user.displayName || 'Usuário',
        userPhoto: user.photoURL ?? undefined,
        rating: reviewRating,
        text: reviewText.trim(),
        ...(reviewPhotos.length ? { photos: reviewPhotos } : {}),
        ...(ytId ? { videoUrl: `https://www.youtube.com/watch?v=${ytId}` } : {}),
        reviewerRank,
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
        ...(reviewPhotos.length ? { photos: reviewPhotos } : {}),
        ...(ytId ? { videoUrl: `https://www.youtube.com/watch?v=${ytId}` } : {}),
        createdAt: { toDate: () => new Date() } as any,
      }
      setReviewsMap((prev) => ({
        ...prev,
        [reviewTarget.id]: [newReview, ...(prev[reviewTarget.id] || [])],
      }))
      setReviewTarget(null)
      setReviewRating(0)
      setReviewText('')
      setReviewVideoUrl('')
      setReviewPhotos([])
      setReviewPhotoPreviews([])
    } finally {
      setSubmittingReview(false)
    }
  }

  const filtered = roteiros
    .filter((r) =>
      (!cityFilter || (r.destination.city || r.destination.name).toLowerCase().includes(cityFilter.toLowerCase())) &&
      (!tagFilter || (r.tags || []).includes(tagFilter))
    )
    .sort((a, b) => sortByRating ? (b.averageRating || 0) - (a.averageRating || 0) : 0)

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-10">
      <div className="text-center mb-5">
        <div className="text-4xl mb-2">🗺️</div>
        <h1 className="text-base font-bold text-gray-900 mb-1">Monte seu roteiro de viagem</h1>
        <p className="text-gray-500 text-sm mb-4">Escolha um destino ou use um roteiro da comunidade como base.</p>
        <Link href="/" className="btn-primary inline-block text-sm">Descobrir destinos →</Link>
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
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setSortByRating((prev) => !prev)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              sortByRating
                ? 'bg-yellow-400 text-white border-yellow-400'
                : 'bg-white text-gray-500 border-gray-200 hover:border-yellow-300'
            }`}
          >
            ⭐ Mais avaliados
          </button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
          {ROTEIRO_TAGS.map((tag) => (
            <button key={tag}
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                tagFilter === tag
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-orange-200'
              }`}
            >{tag}</button>
          ))}
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
                  <div className="h-28 rounded-xl overflow-hidden bg-gray-100 mb-3">
                    <img
                      src={r.destination.photoUrl.startsWith('/api/photo') ? r.destination.photoUrl : getOptimizedUrl(r.destination.photoUrl, 640)}
                      alt={r.destination.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="h-28 rounded-xl bg-orange-50 flex items-center justify-center text-4xl mb-3">🗺️</div>
                )}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-gray-900 leading-tight">{r.name}</h3>
                  {r.copyCount ? (
                    <span className="text-xs bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                      📋 {r.copyCount}x copiado
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-gray-500 mb-2">📍 {r.destination.city || r.destination.name}, {r.destination.state}</p>
                <div className="flex items-center gap-1.5 mb-3">
                  {r.authorPhotoUrl ? (
                    <img src={r.authorPhotoUrl} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-orange-100 flex-shrink-0 flex items-center justify-center text-[9px] text-orange-600 font-bold">
                      {r.authorName?.charAt(0).toUpperCase() || '?'}
                    </span>
                  )}
                  <p className="text-xs text-gray-500 truncate">{r.authorName || 'Anônimo'}</p>
                </div>
                <div className="flex items-center gap-1 mb-2">
                  {[1,2,3,4,5].map((s) => (
                    <span key={s} className={`text-sm ${s <= Math.round(r.averageRating || 0) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                  ))}
                  {(r.averageRating || 0) > 0 ? (
                    <span className="text-xs text-gray-500 ml-1">{r.averageRating!.toFixed(1)} ({r.reviewCount})</span>
                  ) : (
                    <span className="text-xs text-gray-400 ml-1">Sem avaliações</span>
                  )}
                </div>
                {(r.events.length > 0 || r.eats.length > 0 || r.stays.length > 0) && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {r.events.length > 0 && (
                      <span className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-full font-medium">
                        🎭 {r.events.length} evento{r.events.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {r.eats.length > 0 && (
                      <span className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded-full font-medium">
                        🍽️ {r.eats.length} restaurante{r.eats.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {r.stays.length > 0 && (
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">
                        🏡 {r.stays.length} hospedagem{r.stays.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                )}
                {r.authorId === user?.uid ? (
                  <div className="flex items-center gap-2">
                    <Link href={`/ver/${r.id}`} className="flex-1 py-2 rounded-xl text-sm font-semibold text-center border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                      Ver detalhes →
                    </Link>
                    <span className="flex-1 py-2 rounded-xl text-sm font-semibold text-center bg-orange-50 text-orange-600 border border-orange-100">
                      ✓ Publicado por você
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => loadState({ destination: r.destination, events: r.events, eats: r.eats, stays: r.stays })}
                      className="w-full py-2.5 rounded-xl text-sm font-bold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                    >
                      🗺️ Usar como base
                    </button>
                    <div className="flex items-center gap-2">
                      <Link href={`/ver/${r.id}`} className="flex-1 py-2 rounded-xl text-xs font-semibold text-center border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                        Ver →
                      </Link>
                      <button
                        onClick={() => handleCopy(r)}
                        disabled={copyingId === r.id || alreadyCopiedIds.has(r.id)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                          alreadyCopiedIds.has(r.id)
                            ? 'bg-gray-100 text-gray-400 cursor-default'
                            : copiedId === r.id
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {alreadyCopiedIds.has(r.id) ? '✓ Copiado' : copiedId === r.id ? '✓!' : copyingId === r.id ? '...' : '📋 Copiar'}
                      </button>
                      <button
                        onClick={() => { if (!user) { setShowLogin(true); return } setReviewTarget(r); setReviewRating(0); setReviewText('') }}
                        disabled={reviewedIds.has(r.id)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                          reviewedIds.has(r.id) ? 'bg-gray-100 text-gray-400' : 'bg-yellow-400 text-white hover:bg-yellow-500'
                        }`}
                      >
                        {reviewedIds.has(r.id) ? '✓ Avaliado' : '⭐ Avaliar'}
                      </button>
                    </div>
                  </div>
                )}

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
                                      {rv.reviewerRank && <span className="bg-orange-50 text-orange-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">{rv.reviewerRank}</span>}
                                      <span className="text-yellow-400 text-xs ml-auto flex-shrink-0">{'★'.repeat(rv.rating)}{'☆'.repeat(5 - rv.rating)}</span>
                                    </div>
                                    {rv.text && <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{rv.text}</p>}
                                    {rv.photos && rv.photos.length > 0 && (
                                      <div className="flex gap-1.5 overflow-x-auto mt-1">
                                        {rv.photos.map((url, pi) => (
                                          <img key={pi} src={url} alt="" className="h-16 w-16 flex-shrink-0 object-cover rounded-lg" loading="lazy" />
                                        ))}
                                      </div>
                                    )}
                                    {rv.videoUrl && <YouTubeEmbed videoUrl={rv.videoUrl} className="mt-2" />}
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
          <div className="bg-white rounded-t-3xl w-full max-w-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Avaliar roteiro</h3>
              <p className="text-sm text-gray-500">{reviewTarget.name}</p>
            </div>
            <div className="flex justify-center gap-3">
              {[1,2,3,4,5].map((s) => (
                <button key={s} onClick={() => setReviewRating(s)} className={`text-4xl transition-transform hover:scale-110 ${s <= reviewRating ? 'text-yellow-400' : 'text-gray-200'}`}>★</button>
              ))}
            </div>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Conte sua experiência com este roteiro (opcional)"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none"
            />
            {/* Fotos */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Fotos <span className="font-normal text-gray-400">(até 3)</span></label>
              <div className="flex gap-2 flex-wrap">
                {reviewPhotoPreviews.map((src, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    {reviewPhotoUploading && idx === reviewPhotoPreviews.length - 1 ? (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-xs">...</span>
                      </div>
                    ) : (
                      <button type="button" onClick={() => removeReviewPhoto(idx)} className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">✕</button>
                    )}
                  </div>
                ))}
                {reviewPhotoPreviews.length < 3 && !reviewPhotoUploading && (
                  <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:border-orange-400 hover:text-orange-400 transition-colors">
                    <span className="text-2xl leading-none">+</span>
                    <span className="text-[10px] mt-1">foto</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleReviewPhoto} />
                  </label>
                )}
              </div>
            </div>
            {/* Vídeo YouTube */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Vídeo no YouTube <span className="font-normal text-gray-400">(opcional)</span></label>
              <input
                type="url"
                value={reviewVideoUrl}
                onChange={(e) => setReviewVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
              />
              {reviewVideoUrl && !reviewVideoUrl.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/) && (
                <p className="text-xs text-red-500 mt-1">Link inválido — use um link do YouTube</p>
              )}
              {reviewVideoUrl && reviewVideoUrl.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/) && (
                <p className="text-xs text-green-600 mt-1">✓ Link válido</p>
              )}
            </div>
            <button
              onClick={handleSubmitReview}
              disabled={reviewRating === 0 || submittingReview || reviewPhotoUploading}
              className="w-full btn-primary disabled:opacity-50"
            >
              {submittingReview ? 'Enviando...' : 'Enviar avaliação'}
            </button>
            <button onClick={() => { setReviewTarget(null); setReviewRating(0); setReviewText(''); setReviewVideoUrl(''); setReviewPhotos([]); setReviewPhotoPreviews([]) }} className="w-full text-sm text-gray-400">Cancelar</button>
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
  const { destination, events, eats, stays, toggleEvent, toggleEat, toggleStay, hasEvent, hasEat, hasStay, updateNotes, clearRoteiro, itemCount } = useRoteiro()
  const { openSheet } = useSuggestSheet()

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
  const [detailEatGoogleId, setDetailEatGoogleId] = useState<string | null>(null)
  const [detailStayGoogleId, setDetailStayGoogleId] = useState<string | null>(null)
  const [detailEventId, setDetailEventId] = useState<string | null>(null)
  const [detailEatId, setDetailEatId] = useState<string | null>(null)
  const [detailStayId, setDetailStayId] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('rating')
  const [eatsPage, setEatsPage] = useState(0)
  const [staysPage, setStaysPage] = useState(0)
  const [originMode, setOriginMode] = useState<'destination' | 'me'>('destination')
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [routeTarget, setRouteTarget] = useState<{ lat: number; lng: number; name: string; originLat?: number; originLng?: number } | null>(null)
  const [showSharePrompt, setShowSharePrompt] = useState(false)
  const [shareTags, setShareTags] = useState<string[]>([])
  const [pendingRoteiro, setPendingRoteiro] = useState<SavedRoteiro | null>(null)
  const [sharing, setSharing] = useState(false)

  function handleRoute(lat: number, lng: number, name: string) {
    const oLat = originMode === 'destination' ? destination?.lat : userCoords?.lat
    const oLng = originMode === 'destination' ? destination?.lng : userCoords?.lng
    setRouteTarget({ lat, lng, name, ...(oLat && oLng ? { originLat: oLat, originLng: oLng } : {}) })
  }

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
    setRoteiroName(`Roteiro em ${destination.city || destination.name}`)
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

      async function fetchNearby(type: string) {
        const r1 = await fetch(`/api/nearby?lat=${lat}&lng=${lng}&type=${type}&radius=5000`).then((r) => r.json()).catch(() => ({ results: [] }))
        if ((r1.results || []).length >= 5) return r1.results || []
        const r2 = await fetch(`/api/nearby?lat=${lat}&lng=${lng}&type=${type}&radius=15000`).then((r) => r.json()).catch(() => ({ results: [] }))
        return r2.results || []
      }

      const [googleEatsResults, googleStaysResults] = await Promise.all([
        fetchNearby('eats'),
        fetchNearby('stays'),
      ])
      const googleEats = { results: googleEatsResults }
      const googleStays = { results: googleStaysResults }

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
      const name = roteiroName || `Roteiro em ${destination.city || destination.name}`
      if (updateId) {
        await updateRoteiroItems(updateId, { name, destination, events, eats, stays })
        setSaved(true)
        setTimeout(() => { clearRoteiro(); router.push('/perfil?tab=roteiros') }, 1800)
      } else {
        const savedId = await saveRoteiro({ userId: user.uid, name, destination, events, eats, stays })
        setPendingRoteiro({ id: savedId, userId: user.uid, name, destination, events, eats, stays, createdAt: null as any })
        setShareTags([])
        setSaved(true)
        setShowSharePrompt(true)
      }
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

      {routeTarget && (
        <RouteModal
          destLat={routeTarget.lat}
          destLng={routeTarget.lng}
          destName={routeTarget.name}
          originLat={routeTarget.originLat}
          originLng={routeTarget.originLng}
          mapsUrl={
            routeTarget.originLat && routeTarget.originLng
              ? `https://www.google.com/maps/dir/${routeTarget.originLat},${routeTarget.originLng}/${routeTarget.lat},${routeTarget.lng}`
              : `https://www.google.com/maps?q=${routeTarget.lat},${routeTarget.lng}`
          }
          onClose={() => setRouteTarget(null)}
        />
      )}
      {detailPlaceId && (
        <PlaceDetailModal placeId={detailPlaceId} onClose={() => setDetailPlaceId(null)} />
      )}
      {detailEatGoogleId && (
        <PlaceDetailModal placeId={detailEatGoogleId} type="eat" onClose={() => setDetailEatGoogleId(null)} />
      )}
      {detailStayGoogleId && (
        <PlaceDetailModal placeId={detailStayGoogleId} type="stay" onClose={() => setDetailStayGoogleId(null)} />
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
          <p className="text-white/80 text-sm">{destination.city || destination.name}, {destination.state}</p>
        </div>
      </div>

      {/* ── Rastrear grupo ── */}
      <div className="px-4 pt-3 flex justify-end">
        <Link href="/rastrear" className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1">
          📡 Rastrear grupo
        </Link>
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
                <div key={ev.id} className="bg-green-50 border border-green-200 rounded-xl mb-2 overflow-hidden">
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <span className="text-xl flex-shrink-0">🎭</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{ev.name}</p>
                      <p className="text-xs text-gray-500">{ev.city}{dateStr ? ` · ${dateStr}` : ''}</p>
                    </div>
                    <button onClick={() => toggleEvent(ev)} className="flex-shrink-0 text-xs font-bold text-green-700 bg-green-100 border border-green-200 px-2 py-1 rounded-xl hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors">✓ Adicionado</button>
                  </div>
                  <NotesEditor notes={ev.notes} onUpdate={(n) => updateNotes('events', ev.id, n)} />
                </div>
              )
            })}
            {/* Eventos da cidade */}
            {allEvents.length === 0
              ? events.filter((ev) => !allEvents.some((ae) => ae.id === ev.id)).length === 0
                ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">🎭</div>
                    <p className="text-gray-600 font-semibold">Sem eventos em {destination.city || destination.name} ainda</p>
                    <p className="text-gray-400 text-sm mt-1">Confira a agenda completa em Shows & Eventos</p>
                    <button
                      onClick={() => openSheet('evento')}
                      className="inline-block mt-4 bg-purple-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-purple-700 transition-colors"
                    >
                      📣 Anunciar um evento aqui
                    </button>
                  </div>
                )
                : <p className="text-center text-xs text-gray-400 mt-2 py-4">Sem outros eventos em {destination.city || destination.name}</p>
              : <div className="flex flex-col gap-2 stagger">
                  {allEvents.slice(eventsPage * 5, (eventsPage + 1) * 5).map((ev) => (
                    <EventItem
                      key={ev.id}
                      event={ev}
                      added={hasEvent(ev.id)}
                      onToggle={() => toggleEvent({ id: ev.id, name: ev.name, city: ev.city, venue: ev.venue || '', date: ev.date, category: ev.category, photoUrl: ev.photoUrl, mapsLink: ev.mapsLink, lat: ev.lat, lng: ev.lng })}
                      onDetail={() => setDetailEventId(ev.id)}
                      notes={events.find((e) => e.id === ev.id)?.notes}
                      onUpdateNotes={(n) => updateNotes('events', ev.id, n)}
                    />
                  ))}
                  <Pagination page={eventsPage} totalPages={Math.ceil(allEvents.length / 5)} onPrev={() => setEventsPage((p) => p - 1)} onNext={() => setEventsPage((p) => p + 1)} />
                </div>
            }
          </>
        ) : tab === 'comer' ? (
          (() => {
                const extraEats: EatRow[] = eats
                  .filter((e) => !allEats.some((a) => a.id === e.id))
                  .map((e) => ({ id: e.id, name: e.name, city: e.city, category: e.category, priceRange: e.priceRange ?? '', googlePlaceId: e.googlePlaceId, address: e.address, photoUrl: e.photoUrl, lat: e.lat, lng: e.lng }))
                const visibleEats = [...extraEats, ...allEats]
                if (visibleEats.length === 0) return <EmptyTab city={destination.city || destination.name} type="restaurantes" suggestType="restaurante" />
                const sortLat = originMode === 'me' && userCoords ? userCoords.lat : destination.lat
                const sortLng = originMode === 'me' && userCoords ? userCoords.lng : destination.lng
                const fromLat = originMode === 'destination' ? destination.lat : undefined
                const fromLng = originMode === 'destination' ? destination.lng : undefined
                return <>
                  <SectionLabel source={eatsSource} />
                  <OriginToggle mode={originMode} loading={geoLoading} onToggle={handleOriginMode} destName={destination.name} />
                  <SortBar sort={sort} onSort={(s) => { setSort(s); setEatsPage(0); setStaysPage(0) }} showPrice />
                  <div className="flex flex-col gap-2 stagger">
                    {sortItems(visibleEats, sort, sortLat, sortLng).slice(eatsPage * 5, (eatsPage + 1) * 5).map((e) => (
                      <EatItem key={e.id} eat={e} added={hasEat(e.id)} fromLat={fromLat} fromLng={fromLng}
                        onToggle={() => toggleEat({ id: e.id, name: e.name, city: e.city, category: e.category, priceRange: e.priceRange, googlePlaceId: e.googlePlaceId, address: e.address, photoUrl: e.photoUrl, lat: e.lat, lng: e.lng })}
                        onDetail={!e.googlePlaceId ? () => setDetailEatId(e.id) : () => setDetailEatGoogleId(e.googlePlaceId!)}
                        onRoute={handleRoute}
                        notes={eats.find((x) => x.id === e.id)?.notes}
                        onUpdateNotes={(n) => updateNotes('eats', e.id, n)} />
                    ))}
                    <Pagination page={eatsPage} totalPages={Math.ceil(visibleEats.length / 5)} onPrev={() => setEatsPage((p) => p - 1)} onNext={() => setEatsPage((p) => p + 1)} />
                  </div>
                  <button onClick={() => openSheet('restaurante')} className="mt-4 flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-sm hover:shadow-md hover:from-orange-600 hover:to-orange-500 transition-all w-full text-left">
                    <span className="text-xl">🍽️</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold leading-tight">Conhece um bom restaurante aqui?</p>
                      <p className="text-xs text-orange-100">Sugira para a comunidade — é gratuito</p>
                    </div>
                    <span className="text-white/80 font-bold text-lg flex-shrink-0">›</span>
                  </button>
                </>
              })()
        ) : (
          (() => {
                const extraStays: StayRow[] = stays
                  .filter((s) => !allStays.some((a) => a.id === s.id))
                  .map((s) => ({ id: s.id, name: s.name, city: s.city, category: s.category, priceFrom: s.priceFrom, bookingUrl: s.bookingUrl ?? undefined, googlePlaceId: s.googlePlaceId, address: s.address, photoUrl: s.photoUrl, lat: s.lat, lng: s.lng }))
                const visibleStays = [...extraStays, ...allStays]
                if (visibleStays.length === 0) return <EmptyTab city={destination.city || destination.name} type="hospedagens" suggestType="hospedagem" />
                const sortLat = originMode === 'me' && userCoords ? userCoords.lat : destination.lat
                const sortLng = originMode === 'me' && userCoords ? userCoords.lng : destination.lng
                const fromLat = originMode === 'destination' ? destination.lat : undefined
                const fromLng = originMode === 'destination' ? destination.lng : undefined
                return <>
                  <SectionLabel source={staysSource} />
                  <OriginToggle mode={originMode} loading={geoLoading} onToggle={handleOriginMode} destName={destination.name} />
                  <SortBar sort={sort} onSort={(s) => { setSort(s); setEatsPage(0); setStaysPage(0) }} showPrice />
                  <div className="flex flex-col gap-2 stagger">
                    {sortItems(visibleStays, sort, sortLat, sortLng).slice(staysPage * 5, (staysPage + 1) * 5).map((s) => (
                      <StayItem key={s.id} stay={s} added={hasStay(s.id)} fromLat={fromLat} fromLng={fromLng}
                        onToggle={() => toggleStay({ id: s.id, name: s.name, city: s.city, category: s.category, priceFrom: s.priceFrom ?? undefined, bookingUrl: s.bookingUrl ?? undefined, googlePlaceId: s.googlePlaceId, address: s.address, photoUrl: s.photoUrl, lat: s.lat, lng: s.lng })}
                        onDetail={!s.googlePlaceId ? () => setDetailStayId(s.id) : () => setDetailStayGoogleId(s.googlePlaceId!)}
                        onRoute={handleRoute}
                        notes={stays.find((x) => x.id === s.id)?.notes}
                        onUpdateNotes={(n) => updateNotes('stays', s.id, n)} />
                    ))}
                    <Pagination page={staysPage} totalPages={Math.ceil(visibleStays.length / 5)} onPrev={() => setStaysPage((p) => p - 1)} onNext={() => setStaysPage((p) => p + 1)} />
                  </div>
                  <button onClick={() => openSheet('hospedagem')} className="mt-4 flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-green-600 to-green-500 text-white shadow-sm hover:shadow-md hover:from-green-700 hover:to-green-600 transition-all w-full text-left">
                    <span className="text-xl">🏡</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold leading-tight">Conhece uma boa hospedagem aqui?</p>
                      <p className="text-xs text-green-100">Sugira para a comunidade — é gratuito</p>
                    </div>
                    <span className="text-white/80 font-bold text-lg flex-shrink-0">›</span>
                  </button>
                </>
              })()
        )}
      </div>

      {/* ── Modal de compartilhamento ── */}
      {showSharePrompt && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="bg-white rounded-t-3xl w-full max-w-2xl p-6 pb-24 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">✅ Roteiro salvo!</h3>
                <p className="text-sm text-gray-500">Quer compartilhar com a comunidade LetsApp?</p>
              </div>
              <button
                onClick={() => { clearRoteiro(); router.push('/perfil?tab=roteiros') }}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-xl leading-none mt-0.5"
              >✕</button>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Tags <span className="text-red-400">*</span></p>
              <div className="flex flex-wrap gap-2">
                {ROTEIRO_TAGS.map((tag) => (
                  <button key={tag}
                    onClick={() => setShareTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      shareTags.includes(tag) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-500 border-gray-200'
                    }`}
                  >{tag}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  if (!pendingRoteiro || !user) { clearRoteiro(); router.push('/perfil?tab=roteiros'); return }
                  setSharing(true)
                  try {
                    await shareRoteiro(pendingRoteiro, user.uid, user.displayName || 'Usuário', user.photoURL ?? undefined, shareTags.length > 0 ? shareTags : undefined)
                  } catch (e) {
                    console.error('[shareRoteiro]', e)
                  } finally {
                    setSharing(false)
                  }
                  clearRoteiro()
                  router.push('/perfil?tab=roteiros')
                }}
                disabled={sharing || shareTags.length === 0}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sharing ? 'Publicando...' : shareTags.length === 0 ? 'Selecione ao menos 1 tag' : '🌍 Compartilhar com a comunidade'}
              </button>
              <button
                onClick={() => { clearRoteiro(); router.push('/perfil?tab=roteiros') }}
                className="w-full py-3 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200"
              >
                Não agora → ir ao perfil
              </button>
            </div>
          </div>
        </div>
      )}

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
