'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getPublicFavoritesList, type PublicFavoritesList, type FavoriteItem } from '@/lib/firestore'

function FavCard({ fav }: { fav: Omit<FavoriteItem, 'id' | 'savedAt'> }) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
      {fav.photoUrl ? (
        <img src={fav.photoUrl} alt={fav.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" loading="lazy" />
      ) : (
        <div className="w-14 h-14 rounded-xl bg-gray-200 flex-shrink-0 flex items-center justify-center text-2xl">
          {fav.type.includes('eat') ? '🍽️' : fav.type.includes('stay') ? '🏡' : '📍'}
        </div>
      )}
      <div className="flex-1 min-w-0">
        {fav.href ? (
          <Link href={fav.href} className="font-semibold text-gray-900 text-sm truncate block hover:text-orange-500">
            {fav.name}
          </Link>
        ) : (
          <p className="font-semibold text-gray-900 text-sm truncate">{fav.name}</p>
        )}
        <p className="text-xs text-gray-500 truncate">{fav.category} · {fav.city}{fav.state ? `, ${fav.state}` : ''}</p>
      </div>
    </div>
  )
}

function ListaContent() {
  const { uid } = useParams<{ uid: string }>()
  const [data, setData] = useState<PublicFavoritesList | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPublicFavoritesList(uid).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [uid])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-3">
        {[1,2,3].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">♡</div>
        <p className="font-semibold text-gray-700">Lista não encontrada</p>
        <p className="text-sm text-gray-400 mt-1 mb-6">O usuário ainda não compartilhou uma lista de favoritos.</p>
        <Link href="/" className="bg-orange-500 text-white text-sm font-semibold px-6 py-3 rounded-xl inline-block">
          Explorar o LetsApp
        </Link>
      </div>
    )
  }

  const groups: { type: FavoriteItem['type']; label: string }[] = [
    { type: 'place',      label: '📍 Destinos' },
    { type: 'eat',        label: '🍽️ Onde Comer' },
    { type: 'stay',       label: '🏡 Onde Dormir' },
    { type: 'google_eat', label: '🔍 Restaurantes' },
    { type: 'google_stay',label: '🔍 Hospedagens' },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/" className="text-sm text-gray-400 mb-4 inline-block">← LetsApp</Link>

      <div className="flex items-center gap-3 mb-6">
        {data.photoURL ? (
          <img src={data.photoURL} alt="" className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-2xl">🧳</div>
        )}
        <div>
          <h1 className="font-bold text-gray-900 text-lg">Lista de {data.displayName}</h1>
          <p className="text-sm text-gray-500">{data.items.length} {data.items.length === 1 ? 'lugar salvo' : 'lugares salvos'}</p>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {groups.map(({ type, label }) => {
          const group = data.items.filter((f) => f.type === type)
          if (group.length === 0) return null
          return (
            <div key={type}>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{label}</h2>
              <div className="flex flex-col gap-2">
                {group.map((fav, i) => <FavCard key={i} fav={fav} />)}
              </div>
            </div>
          )
        })}
      </div>

      {/* CTA para quem não tem conta */}
      <div className="mt-10 bg-orange-50 border border-orange-100 rounded-2xl p-5 text-center">
        <div className="text-3xl mb-2">🗺️</div>
        <p className="font-bold text-gray-800 text-sm mb-1">Quer criar sua própria lista?</p>
        <p className="text-xs text-gray-500 mb-4">Salve destinos, restaurantes e hospedagens que você quer conhecer.</p>
        <Link href="/entrar" className="bg-orange-500 text-white text-sm font-semibold px-6 py-2.5 rounded-xl inline-block">
          Criar conta grátis
        </Link>
      </div>
    </div>
  )
}

export default function ListaPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-3">
        {[1,2,3].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
      </div>
    }>
      <ListaContent />
    </Suspense>
  )
}
