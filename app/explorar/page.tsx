'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getPublishedRoteiros, copyRoteiroToProfile, type SavedRoteiro } from '@/lib/firestore'
import { useAuth } from '@/lib/auth-context'
import { getOptimizedUrl } from '@/lib/cloudinary'

const SECTIONS = [
  {
    href: '/eventos',
    emoji: '🎭',
    title: 'Shows & Eventos',
    description: 'Shows, festivais, feiras e tudo que tá rolando perto de você',
    gradient: 'from-purple-500 to-purple-700',
    badge: 'Agenda da galera',
  },
  {
    href: '/comer',
    emoji: '🍽️',
    title: 'Onde Comer',
    description: 'Restaurantes, bares, cafés e pedidas da galera local',
    gradient: 'from-orange-400 to-orange-600',
    badge: 'Curadoria local',
  },
  {
    href: '/hospedar',
    emoji: '🏡',
    title: 'Onde Dormir',
    description: 'Pousadas, hotéis, camping e o lugar certo pra descansar',
    gradient: 'from-green-500 to-green-700',
    badge: 'Todas as opções',
  },
  {
    href: '/veiculos',
    emoji: '🚗',
    title: 'Alugar Veículo',
    description: 'Carro, moto, van ou bike — chegue no rolê do seu jeito',
    gradient: 'from-blue-500 to-blue-700',
    badge: 'Locais e nacionais',
  },
]

const ADS = [
  { href: '/anunciar?tipo=evento',   emoji: '🎭', label: 'Anunciar evento',      color: 'text-purple-600 bg-purple-50 border-purple-100' },
  { href: '/anunciar?tipo=comer',    emoji: '🍽️', label: 'Anunciar restaurante', color: 'text-orange-600 bg-orange-50 border-orange-100' },
  { href: '/anunciar?tipo=hospedar', emoji: '🏡', label: 'Anunciar hospedagem',  color: 'text-green-700 bg-green-50 border-green-100'  },
]

function RoteiroCard({ r, onCopy, copying, copied }: { r: SavedRoteiro; onCopy: () => void; copying: boolean; copied: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex-shrink-0 w-52">
      {r.destination.photoUrl ? (
        <img
          src={r.destination.photoUrl.startsWith('/api/photo')
            ? r.destination.photoUrl
            : getOptimizedUrl(r.destination.photoUrl, 208)}
          alt={r.destination.name}
          className="w-full h-28 object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-28 bg-orange-50 flex items-center justify-center text-4xl">🗺️</div>
      )}
      <div className="p-3">
        <p className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">{r.name}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {r.destination.city}, {r.destination.state}</p>
        <div className="flex items-center gap-1 mt-1.5">
          {r.authorPhotoUrl ? (
            <img src={r.authorPhotoUrl} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
          ) : (
            <span className="w-4 h-4 rounded-full bg-orange-100 flex-shrink-0 flex items-center justify-center text-[9px] text-orange-600 font-bold">
              {r.authorName?.charAt(0).toUpperCase() || '?'}
            </span>
          )}
          <p className="text-xs text-gray-500 truncate flex-1">{r.authorName || 'Anônimo'}</p>
          {r.copyCount && r.copyCount > 0 ? (
            <span className="text-[10px] text-gray-400 flex-shrink-0">📋 {r.copyCount}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Link href={`/ver/${r.id}`} className="text-xs text-orange-500 font-semibold">Ver →</Link>
          <button
            onClick={onCopy}
            disabled={copying}
            className={`ml-auto px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
              copied
                ? 'bg-green-100 text-green-700'
                : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
          >
            {copied ? '✓' : copying ? '...' : '📋 Copiar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ExplorarPage() {
  const { user } = useAuth()
  const [roteiros, setRoteiros] = useState<SavedRoteiro[]>([])
  const [loadingRoteiros, setLoadingRoteiros] = useState(true)
  const [copyingId, setCopyingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showLogin, setShowLogin] = useState(false)

  useEffect(() => {
    getPublishedRoteiros()
      .then(setRoteiros)
      .catch(() => {})
      .finally(() => setLoadingRoteiros(false))
  }, [])

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

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">

      {/* ── Roteiros da comunidade ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">🗓️ Roteiros da comunidade</h2>
            <p className="text-xs text-gray-400 mt-0.5">Copiado por outros viajantes</p>
          </div>
        </div>

        {loadingRoteiros ? (
          <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-shrink-0 w-52 h-52 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : roteiros.length === 0 ? (
          <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-5 text-center">
            <p className="text-sm font-semibold text-gray-700">Nenhum roteiro publicado ainda</p>
            <p className="text-xs text-gray-400 mt-1">Crie um roteiro e publique no seu perfil.</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {roteiros.map((r) => (
              <RoteiroCard
                key={r.id}
                r={r}
                onCopy={() => handleCopy(r)}
                copying={copyingId === r.id}
                copied={copiedId === r.id}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mb-6">
        <h1 className="text-lg font-bold text-gray-900">Explorar</h1>
        <p className="text-sm text-gray-500 mt-0.5">Tudo que você precisa pra montar o rolê perfeito</p>
      </div>

      {/* Seções principais */}
      <div className="flex flex-col gap-3 mb-8">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group block rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all"
          >
            <div className={`bg-gradient-to-r ${s.gradient} px-5 py-4 flex items-center gap-4`}>
              <span className="text-3xl">{s.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-base leading-tight">{s.title}</p>
                <p className="text-white/80 text-xs mt-0.5">{s.description}</p>
              </div>
              <span className="text-white/60 text-xl font-bold group-hover:translate-x-1 transition-transform flex-shrink-0">›</span>
            </div>
            <div className="px-5 py-2.5 flex items-center justify-between bg-white">
              <span className="text-xs font-semibold text-gray-400">{s.badge}</span>
              <span className="text-xs text-orange-500 font-semibold">Ver todos →</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Anunciar */}
      <div className="border-t border-gray-100 pt-6 mb-6">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Tem um negócio? Anuncie aqui</p>
        <div className="flex flex-col gap-2">
          {ADS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors hover:opacity-80 ${item.color}`}
            >
              <span className="text-lg">{item.emoji}</span>
              {item.label}
              <span className="ml-auto text-xs font-normal opacity-60">→</span>
            </a>
          ))}
        </div>
      </div>

      {/* Sugerir */}
      <Link
        href="/sugerir"
        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors"
      >
        <span className="text-lg">➕</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-orange-700">Conhece um lugar incrível?</p>
          <p className="text-xs text-orange-500">Sugira para a comunidade do LetsApp</p>
        </div>
        <span className="text-orange-400 font-bold flex-shrink-0">→</span>
      </Link>

      {/* Modal de login */}
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
    </div>
  )
}
