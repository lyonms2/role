'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getSharedRoteiroById, copySharedRoteiroToProfile,
  getRoteiroReviews, addSharedRoteiroReview,
  reportReview, hasUserReportedReview,
  reportSharedRoteiro, hasUserReportedSharedRoteiro,
  hasUserReviewedRoteiro, getUserRankLabel,
  type SavedRoteiro, type SharedRoteiro,
} from '@/lib/firestore'
import { useAuth } from '@/lib/auth-context'
import { getOptimizedUrl } from '@/lib/cloudinary'
import type { RoteiroReview } from '@/types'
import PlaceDetailModal from '@/components/PlaceDetailModal'
import EventDetailModal from '@/components/EventDetailModal'
import EatDetailModal from '@/components/EatDetailModal'
import StayDetailModal from '@/components/StayDetailModal'

function formatDateStr(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// Normaliza SharedRoteiro para ter os mesmos campos usados na view
function adaptShared(r: SharedRoteiro): SavedRoteiro & { _isShared: true } {
  return {
    id: r.id,
    userId: r.authorId,
    name: r.name,
    destination: r.destination,
    events: r.events,
    eats: r.eats,
    stays: r.stays,
    createdAt: r.sharedAt,
    authorName: r.authorName,
    authorPhotoUrl: r.authorPhotoUrl,
    averageRating: r.averageRating,
    reviewCount: r.reviewCount,
    copyCount: r.copyCount,
    _isShared: true,
  } as any
}

export default function VerRoteiroPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { user } = useAuth()

  const [roteiro, setRoteiro] = useState<(SavedRoteiro & { _isShared?: boolean }) | null | 'loading'>('loading')
  const isOwner = !!(roteiro && roteiro !== 'loading' && user && roteiro.userId === user.uid)
  const isShared = !!(roteiro && roteiro !== 'loading' && (roteiro as any)._isShared)

  const [copied, setCopied] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copiedRoteiro, setCopiedRoteiro] = useState(false)
  const [showLogin, setShowLogin] = useState(false)

  const [reviews, setReviews] = useState<RoteiroReview[]>([])
  const [reportedReviewIds, setReportedReviewIds] = useState<Set<string>>(new Set())
  const [reportingReview, setReportingReview] = useState<RoteiroReview | null>(null)
  const [reportSubmitting, setReportSubmitting] = useState(false)

  // Avaliação inline
  const [hasReviewed, setHasReviewed] = useState(false)
  const [newRating, setNewRating] = useState(0)
  const [newReviewText, setNewReviewText] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewDone, setReviewDone] = useState(false)

  // Denúncia do roteiro
  const [reportingRoteiro, setReportingRoteiro] = useState(false)
  const [roteiroReported, setRoteiroReported] = useState(false)
  const [roteiroReportSubmitting, setRoteiroReportSubmitting] = useState(false)

  const [detailPlaceId, setDetailPlaceId] = useState<string | null>(null)
  const [detailEventId, setDetailEventId] = useState<string | null>(null)
  const [detailEatId, setDetailEatId] = useState<string | null>(null)
  const [detailStayId, setDetailStayId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const shared = await getSharedRoteiroById(id).catch(() => null)
      setRoteiro(shared ? adaptShared(shared) : null)
      getRoteiroReviews(id).then(setReviews).catch(() => {})
    }
    load()
  }, [id])

  useEffect(() => {
    if (!user || reviews.length === 0) return
    Promise.all(reviews.map(r => hasUserReportedReview(user.uid, r.id))).then(results => {
      const ids = new Set<string>()
      results.forEach((reported, i) => { if (reported) ids.add(reviews[i].id) })
      setReportedReviewIds(ids)
    })
  }, [user, reviews])

  useEffect(() => {
    if (!user || !roteiro || roteiro === 'loading') return
    hasUserReviewedRoteiro(user.uid, id).then(setHasReviewed).catch(() => {})
    if (isShared) {
      hasUserReportedSharedRoteiro(user.uid, id).then(setRoteiroReported).catch(() => {})
    }
  }, [user, roteiro])

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleCopyRoteiro() {
    if (!roteiro || roteiro === 'loading') return
    if (!user) { setShowLogin(true); return }
    setCopying(true)
    try {
      const shared = await getSharedRoteiroById(id)
      if (shared) await copySharedRoteiroToProfile(shared, user.uid, user.displayName || 'Usuário', user.photoURL ?? undefined)
      setCopiedRoteiro(true)
      setTimeout(() => setCopiedRoteiro(false), 2500)
    } finally {
      setCopying(false)
    }
  }

  async function handleAddReview() {
    if (!user || newRating === 0 || submittingReview) return
    setSubmittingReview(true)
    try {
      const rankLabel = await getUserRankLabel(user.uid).catch(() => '🌱 Novato')
      const reviewData = {
        roteiroId: id,
        userId: user.uid,
        userName: user.displayName || 'Usuário',
        userPhoto: user.photoURL || undefined,
        rating: newRating,
        text: newReviewText.trim(),
        reviewerRank: rankLabel,
      }
      const newId = await addSharedRoteiroReview(reviewData)
      setReviews((prev) => [{
        id: newId,
        ...reviewData,
        createdAt: { toDate: () => new Date() } as any,
      }, ...prev])
      setHasReviewed(true)
      setReviewDone(true)
      setNewRating(0)
      setNewReviewText('')
    } finally {
      setSubmittingReview(false)
    }
  }

  async function handleReportReview() {
    if (!reportingReview || !user) return
    setReportSubmitting(true)
    try {
      await reportReview({
        reviewId: reportingReview.id,
        reviewType: 'roteiro',
        roteiroId: id,
        reviewRating: reportingReview.rating,
        reviewUserId: reportingReview.userId,
        reviewUserName: reportingReview.userName,
        reportedBy: user.uid,
        reportedByName: user.displayName || 'Usuário',
      })
      setReportedReviewIds(prev => new Set([...prev, reportingReview.id]))
    } finally {
      setReportSubmitting(false)
      setReportingReview(null)
    }
  }

  async function handleReportRoteiro() {
    if (!user || !roteiro || roteiro === 'loading') return
    setRoteiroReportSubmitting(true)
    try {
      await reportSharedRoteiro({
        roteiroId: id,
        roteiroName: roteiro.name,
        authorId: roteiro.userId,
        authorName: roteiro.authorName || 'Usuário',
        reportedBy: user.uid,
        reportedByName: user.displayName || 'Usuário',
      })
      setRoteiroReported(true)
    } finally {
      setRoteiroReportSubmitting(false)
      setReportingRoteiro(false)
    }
  }

  if (roteiro === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-2xl bg-orange-100 animate-pulse" />
      </div>
    )
  }

  if (!roteiro) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
        <span className="text-5xl">🔒</span>
        <h1 className="text-xl font-bold text-gray-800">Roteiro não encontrado</h1>
        <p className="text-sm text-gray-400">Este roteiro não existe ou foi removido.</p>
        <Link href="/" className="text-sm font-semibold text-orange-500 border border-orange-300 px-4 py-2 rounded-xl">
          Abrir LetsApp →
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {detailPlaceId && <PlaceDetailModal placeId={detailPlaceId} onClose={() => setDetailPlaceId(null)} />}
      {detailEventId && <EventDetailModal eventId={detailEventId} onClose={() => setDetailEventId(null)} />}
      {detailEatId && <EatDetailModal eatId={detailEatId} onClose={() => setDetailEatId(null)} />}
      {detailStayId && <StayDetailModal stayId={detailStayId} onClose={() => setDetailStayId(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        {user ? (
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900">
            ← Voltar
          </button>
        ) : (
          <Link href="/" className="text-base font-bold text-orange-500">LetsApp</Link>
        )}
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
          {roteiro.authorName ? `por ${roteiro.authorName}` : 'Roteiro compartilhado'}
        </span>
      </div>

      <h1 className="text-xl font-bold text-gray-900 mb-1">{roteiro.name}</h1>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <p className="text-sm text-gray-500">
          {roteiro.destination.city || roteiro.destination.name}, {roteiro.destination.state}
          {roteiro.scheduledDate && (
            <> · <span className="text-orange-500 font-semibold">{formatDateStr(roteiro.scheduledDate)}</span></>
          )}
        </p>
        {(roteiro.averageRating ?? 0) > 0 && (
          <span className="flex items-center gap-1 text-xs font-semibold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
            ⭐ {roteiro.averageRating!.toFixed(1)}
            <span className="text-yellow-500 font-normal">({roteiro.reviewCount} {roteiro.reviewCount === 1 ? 'avaliação' : 'avaliações'})</span>
          </span>
        )}
      </div>

      {/* CTAs */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={copyLink}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {copied ? '✅ Copiado!' : '🔗 Copiar link'}
        </button>
        {!user && (
          <Link
            href="/"
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-orange-500 text-white text-center hover:bg-orange-600 transition-colors"
          >
            Abrir LetsApp →
          </Link>
        )}
      </div>

      {!isOwner && (
        <button
          onClick={handleCopyRoteiro}
          disabled={copying}
          className={`w-full mb-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
            copiedRoteiro
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'
          }`}
        >
          {copiedRoteiro ? '✓ Roteiro copiado para o seu perfil!' : copying ? 'Copiando...' : '📋 Copiar este roteiro'}
        </button>
      )}

      {/* Denunciar roteiro — só para logados, não-donos, roteiros compartilhados */}
      {isShared && !isOwner && user && (
        <div className="flex justify-end mb-4">
          {roteiroReported ? (
            <span className="text-xs text-gray-400">🚩 Roteiro denunciado</span>
          ) : (
            <button
              onClick={() => setReportingRoteiro(true)}
              className="text-xs text-gray-400 hover:text-red-400 transition-colors"
            >
              🚩 Denunciar roteiro
            </button>
          )}
        </div>
      )}

      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="bg-white rounded-t-3xl w-full max-w-2xl p-6 pb-24 text-center">
            <div className="text-4xl mb-3">📋</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Copiar roteiro</h3>
            <p className="text-gray-500 text-sm mb-5">Entre com Google para salvar este roteiro no seu perfil.</p>
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

      {/* Destino */}
      {roteiro.destination.source !== 'event' && (
        <section className="mb-4">
          <h2 className="text-sm font-bold text-gray-800 mb-2">📍 Destino</h2>
          <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
            <div className="flex">
              {roteiro.destination.photoUrl ? (
                <img
                  src={getOptimizedUrl(roteiro.destination.photoUrl, 160)}
                  alt={roteiro.destination.name}
                  className="w-20 h-20 object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 flex-shrink-0 bg-orange-50 flex items-center justify-center text-2xl">🗺️</div>
              )}
              <div className="flex-1 p-3 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{roteiro.destination.name}</p>
                <p className="text-xs text-gray-400">{roteiro.destination.city || roteiro.destination.name}, {roteiro.destination.state}</p>
                {(roteiro.destination.googlePlaceId || roteiro.destination.id) && (
                  <button
                    onClick={() => setDetailPlaceId(roteiro.destination.googlePlaceId || roteiro.destination.id)}
                    className="text-xs text-orange-500 font-semibold mt-1 hover:underline"
                  >
                    Ver detalhes →
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Eventos */}
      {roteiro.events.length > 0 && (
        <section className="mb-4">
          <h2 className="text-sm font-bold text-gray-800 mb-2">
            🎭 Eventos <span className="text-xs font-normal text-gray-400">({roteiro.events.length})</span>
          </h2>
          <div className="flex flex-col gap-2">
            {roteiro.events.map((ev, i) => {
              let dateStr = ''
              try {
                const d = (ev.date as any)?.toDate ? (ev.date as any).toDate() : new Date(((ev.date as any)?.seconds ?? 0) * 1000)
                dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
              } catch {}
              return (
                <div key={i} className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                  <div className="flex">
                    {(ev as any).photoUrl ? (
                      <img src={getOptimizedUrl((ev as any).photoUrl, 160)} alt={ev.name} className="w-20 h-20 object-cover flex-shrink-0" loading="lazy" />
                    ) : (
                      <div className="w-20 h-20 flex-shrink-0 bg-purple-50 flex items-center justify-center text-2xl">🎭</div>
                    )}
                    <div className="flex-1 p-3 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{ev.name}</p>
                      <p className="text-xs text-gray-400">{ev.category}</p>
                      {ev.venue && <p className="text-xs text-gray-400 truncate">📍 {ev.venue}</p>}
                      {dateStr && <p className="text-xs font-semibold text-purple-600 mt-0.5">📅 {dateStr}</p>}
                      <button onClick={() => setDetailEventId(ev.id)} className="text-xs text-purple-600 font-semibold mt-1 hover:underline">
                        Ver detalhes →
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Onde comer */}
      {roteiro.eats.length > 0 && (
        <section className="mb-4">
          <h2 className="text-sm font-bold text-gray-800 mb-2">
            🍽️ Onde comer <span className="text-xs font-normal text-gray-400">({roteiro.eats.length})</span>
          </h2>
          <div className="flex flex-col gap-2">
            {roteiro.eats.map((e, i) => (
              <div key={i} className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                <div className="flex">
                  {e.photoUrl && (
                    <img src={getOptimizedUrl(e.photoUrl, 160)} alt={e.name} className="w-20 h-20 object-cover flex-shrink-0" loading="lazy" />
                  )}
                  <div className="flex-1 p-3 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{e.name}</p>
                    <p className="text-xs text-gray-400">{e.category} · {e.priceRange}</p>
                    {e.address && <p className="text-xs text-gray-400 truncate">📍 {e.address}</p>}
                    <button
                      onClick={() => e.googlePlaceId ? setDetailPlaceId(e.googlePlaceId) : setDetailEatId(e.id)}
                      className="text-xs text-orange-500 font-semibold mt-1 hover:underline"
                    >
                      Ver detalhes →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Onde dormir */}
      {roteiro.stays.length > 0 && (
        <section className="mb-4">
          <h2 className="text-sm font-bold text-gray-800 mb-2">
            🏡 Onde dormir <span className="text-xs font-normal text-gray-400">({roteiro.stays.length})</span>
          </h2>
          <div className="flex flex-col gap-2">
            {roteiro.stays.map((s, i) => (
              <div key={i} className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                <div className="flex">
                  {s.photoUrl && (
                    <img src={getOptimizedUrl(s.photoUrl, 160)} alt={s.name} className="w-20 h-20 object-cover flex-shrink-0" loading="lazy" />
                  )}
                  <div className="flex-1 p-3 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.category}{s.priceFrom ? ` · R$${s.priceFrom}/noite` : ''}</p>
                    {s.address && <p className="text-xs text-gray-400 truncate">📍 {s.address}</p>}
                    <div className="flex items-center gap-3 mt-1">
                      <button
                        onClick={() => s.googlePlaceId ? setDetailPlaceId(s.googlePlaceId) : setDetailStayId(s.id)}
                        className="text-xs text-green-700 font-semibold hover:underline"
                      >
                        Ver detalhes →
                      </button>
                      {s.bookingUrl && (
                        <a href={s.bookingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 font-semibold">
                          🔗 Reservar
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Avaliações */}
      <section className="mb-6">
        <h2 className="text-sm font-bold text-gray-800 mb-3">
          ⭐ Avaliações {reviews.length > 0 && <span className="text-xs font-normal text-gray-400">({reviews.length})</span>}
        </h2>

        {/* Form de avaliação */}
        {user && !isOwner && !hasReviewed && !reviewDone && (
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-4">
            <p className="text-xs font-semibold text-orange-700 mb-2">Avalie este roteiro</p>
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  onClick={() => setNewRating(i)}
                  className={`text-2xl transition-transform hover:scale-110 ${i <= newRating ? 'text-yellow-400' : 'text-gray-200'}`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={newReviewText}
              onChange={(e) => setNewReviewText(e.target.value)}
              placeholder="Comente sobre o roteiro (opcional)..."
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-orange-300 mb-2"
            />
            <button
              onClick={handleAddReview}
              disabled={newRating === 0 || submittingReview}
              className="w-full py-2 rounded-xl text-sm font-semibold bg-orange-500 text-white disabled:opacity-40 transition-opacity"
            >
              {submittingReview ? 'Enviando...' : 'Enviar avaliação'}
            </button>
          </div>
        )}

        {reviewDone && (
          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 mb-4 text-sm text-green-700 font-semibold text-center">
            ✅ Obrigado pela avaliação!
          </div>
        )}

        {reviews.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-2">
            {user && !isOwner ? 'Seja o primeiro a avaliar!' : 'Nenhuma avaliação ainda.'}
          </p>
        )}

        <div className="flex flex-col gap-3">
          {reviews.map(rv => (
            <div key={rv.id} className="rounded-xl border border-gray-100 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {rv.userPhoto ? (
                    <img src={rv.userPhoto} alt={rv.userName} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm flex-shrink-0">👤</div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800 truncate">{rv.userName}</p>
                      {rv.reviewerRank && (
                        <span className="bg-orange-50 text-orange-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">{rv.reviewerRank}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {rv.createdAt?.toDate?.().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) ?? ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-yellow-400 text-sm">{'★'.repeat(rv.rating)}{'☆'.repeat(5 - rv.rating)}</span>
                  {user && user.uid !== rv.userId && (
                    <button
                      onClick={() => { if (!reportedReviewIds.has(rv.id)) setReportingReview(rv) }}
                      disabled={reportedReviewIds.has(rv.id)}
                      className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                        reportedReviewIds.has(rv.id)
                          ? 'text-gray-300 cursor-default'
                          : 'text-gray-400 hover:text-red-400 hover:bg-red-50'
                      }`}
                    >
                      {reportedReviewIds.has(rv.id) ? '✓' : '🚩'}
                    </button>
                  )}
                </div>
              </div>
              {rv.text && <p className="text-sm text-gray-600 mt-2 leading-relaxed">{rv.text}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Modal denúncia de avaliação */}
      {reportingReview && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="bg-white rounded-t-3xl w-full max-w-2xl p-6 pb-24">
            <div className="text-3xl mb-2 text-center">🚩</div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-1">Denunciar avaliação</h3>
            <p className="text-sm text-gray-500 text-center mb-5">Tem certeza que deseja denunciar esta avaliação por conteúdo inapropriado?</p>
            <div className="flex gap-3">
              <button onClick={() => setReportingReview(null)} className="flex-1 py-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700">
                Cancelar
              </button>
              <button
                onClick={handleReportReview}
                disabled={reportSubmitting}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-500 text-white disabled:opacity-60"
              >
                {reportSubmitting ? 'Enviando...' : 'Denunciar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal denúncia do roteiro */}
      {reportingRoteiro && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="bg-white rounded-t-3xl w-full max-w-2xl p-6 pb-24">
            <div className="text-3xl mb-2 text-center">🚩</div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-1">Denunciar roteiro</h3>
            <p className="text-sm text-gray-500 text-center mb-5">Tem certeza que deseja denunciar este roteiro por conteúdo inapropriado?</p>
            <div className="flex gap-3">
              <button onClick={() => setReportingRoteiro(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700">
                Cancelar
              </button>
              <button
                onClick={handleReportRoteiro}
                disabled={roteiroReportSubmitting}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-500 text-white disabled:opacity-60"
              >
                {roteiroReportSubmitting ? 'Enviando...' : 'Denunciar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer CTA — só para visitantes não logados */}
      {!user && <div className="mt-6 p-4 bg-orange-50 rounded-2xl text-center border border-orange-100">
        <p className="text-sm font-semibold text-gray-800 mb-1">Quer montar seu próprio roteiro?</p>
        <p className="text-xs text-gray-500 mb-3">Descubra destinos incríveis de bate-volta no LetsApp.</p>
        <Link
          href="/"
          className="inline-block py-2.5 px-6 rounded-xl text-sm font-bold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
        >
          Entrar no LetsApp →
        </Link>
      </div>}
    </div>
  )
}
