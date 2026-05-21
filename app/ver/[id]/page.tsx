'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getRoteiroById, type SavedRoteiro } from '@/lib/firestore'
import { getOptimizedUrl } from '@/lib/cloudinary'

function formatDateStr(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function VerRoteiroPage() {
  const params = useParams()
  const id = params.id as string
  const [roteiro, setRoteiro] = useState<SavedRoteiro | null | 'loading'>('loading')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getRoteiroById(id)
      .then((r) => setRoteiro(!r || !r.public ? null : r))
      .catch(() => setRoteiro(null))
  }, [id])

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
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
      <div className="flex gap-2 mb-6">
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
