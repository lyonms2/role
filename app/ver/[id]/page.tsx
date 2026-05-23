'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getRoteiroById, copyRoteiroToProfile, getRoteiroReviews, reportReview, hasUserReportedReview, type SavedRoteiro } from '@/lib/firestore'
import { useAuth } from '@/lib/auth-context'
import { getOptimizedUrl } from '@/lib/cloudinary'
import type { RoteiroReview } from '@/types'

function formatDateStr(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function VerRoteiroPage() {
  const params = useParams()
  const id = params.id as string
  const { user } = useAuth()
  const [roteiro, setRoteiro] = useState<SavedRoteiro | null | 'loading'>('loading')
  const [copied, setCopied] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copiedRoteiro, setCopiedRoteiro] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [reviews, setReviews] = useState<RoteiroReview[]>([])
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set())
  const [reportingReview, setReportingReview] = useState<RoteiroReview | null>(null)
  const [reportSubmitting, setReportSubmitting] = useState(false)

  useEffect(() => {
    getRoteiroById(id)
      .then((r) => setRoteiro(r ?? null))
      .catch(() => setRoteiro(null))
    getRoteiroReviews(id).then(setReviews).catch(() => {})
  }, [id])

  useEffect(() => {
    if (!user || reviews.length === 0) return
    Promise.all(reviews.map(r => hasUserReportedReview(user.uid, r.id))).then(results => {
      const ids = new Set<string>()
      results.forEach((reported, i) => { if (reported) ids.add(reviews[i].id) })
      setReportedIds(ids)
    })
  }, [user, reviews])

  async function handleReport() {
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
      setReportedIds(prev => new Set([...prev, reportingReview.id]))
    } finally {
      setReportSubmitting(false)
      setReportingReview(null)
    }
  }

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
      await copyRoteiroToProfile(roteiro, user.uid, user.displayName || 'Usuário', user.photoURL ?? undefined)
      setCopiedRoteiro(true)
      setTimeout(() => setCopiedRoteiro(false), 2500)
    } finally {
      setCopying(false)
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
        <p className="text-sm text-gray-400">Este roteiro não existe ou não está compartilhado.</p>
        <Link href="/" className="text-sm font-semibold text-orange-500 border border-orange-300 px-4 py-2 rounded-xl">
          Abrir LetsApp →
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Link href="/" className="text-base font-bold text-orange-500">LetsApp</Link>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Roteiro compartilhado</span>
      </div>

      <h1 className="text-xl font-bold text-gray-900 mb-1">{roteiro.name}</h1>
      <p className="text-sm text-gray-500 mb-4">
        {roteiro.destination.city}, {roteiro.destination.state}
        {roteiro.scheduledDate && (
          <> · <span className="text-orange-500 font-semibold">{formatDateStr(roteiro.scheduledDate)}</span></>
        )}
      </p>

      {/* CTAs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={copyLink}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {copied ? '✅ Copiado!' : '🔗 Copiar link'}
        </button>
        <Link
          href="/"
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-orange-500 text-white text-center hover:bg-orange-600 transition-colors"
        >
          Abrir LetsApp →
        </Link>
      </div>
      <button
        onClick={handleCopyRoteiro}
        disabled={copying}
        className={`w-full mb-6 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
          copiedRoteiro
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'
        }`}
      >
        {copiedRoteiro ? '✓ Roteiro copiado para o seu perfil!' : copying ? 'Copiando...' : '📋 Copiar este roteiro'}
      </button>

      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="bg-white rounded-t-3xl w-full max-w-2xl p-6 text-center">
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
                <p className="text-xs text-gray-400">{roteiro.destination.city}, {roteiro.destination.state}</p>
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
                    {s.bookingUrl && (
                      <a href={s.bookingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 font-semibold">
                        🔗 Reservar
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Avaliações */}
      {reviews.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-bold text-gray-800 mb-3">
            ⭐ Avaliações <span className="text-xs font-normal text-gray-400">({reviews.length})</span>
          </h2>
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
                      <p className="text-sm font-semibold text-gray-800 truncate">{rv.userName}</p>
                      <p className="text-xs text-gray-400">
                        {rv.createdAt?.toDate?.().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) ?? ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-yellow-400 text-sm">{'★'.repeat(rv.rating)}{'☆'.repeat(5 - rv.rating)}</span>
                  </div>
                </div>
                {rv.text && <p className="text-sm text-gray-600 mt-2 leading-relaxed">{rv.text}</p>}
                {user && user.uid !== rv.userId && (
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => { if (!reportedIds.has(rv.id)) setReportingReview(rv) }}
                      disabled={reportedIds.has(rv.id)}
                      className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                        reportedIds.has(rv.id)
                          ? 'text-gray-300 cursor-default'
                          : 'text-gray-400 hover:text-red-400 hover:bg-red-50'
                      }`}
                    >
                      {reportedIds.has(rv.id) ? 'Denunciado' : '🚩 Denunciar'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Modal de confirmação de denúncia */}
      {reportingReview && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="bg-white rounded-t-3xl w-full max-w-2xl p-6">
            <div className="text-3xl mb-2 text-center">🚩</div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-1">Denunciar avaliação</h3>
            <p className="text-sm text-gray-500 text-center mb-5">Tem certeza que deseja denunciar esta avaliação por conteúdo inapropriado?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setReportingReview(null)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleReport}
                disabled={reportSubmitting}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-500 text-white disabled:opacity-60"
              >
                {reportSubmitting ? 'Enviando...' : 'Denunciar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer CTA */}
      <div className="mt-6 p-4 bg-orange-50 rounded-2xl text-center border border-orange-100">
        <p className="text-sm font-semibold text-gray-800 mb-1">Quer montar seu próprio roteiro?</p>
        <p className="text-xs text-gray-500 mb-3">Descubra destinos incríveis de bate-volta no LetsApp.</p>
        <Link
          href="/"
          className="inline-block py-2.5 px-6 rounded-xl text-sm font-bold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
        >
          Entrar no LetsApp →
        </Link>
      </div>
    </div>
  )
}
