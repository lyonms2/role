'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getPlaceById, getReviewsByPlace, getTipsByPlace, addTip, hasUserReviewedPlace } from '@/lib/firestore'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged, User } from 'firebase/auth'
import type { Place, Review, Tip, WeatherData } from '@/types'
import { CATEGORY_EMOJIS } from '@/types'
import WeatherBadge from '@/components/WeatherBadge'
import ReviewForm from '@/components/ReviewForm'
import ReviewList from '@/components/ReviewList'
import TipCard from '@/components/TipCard'

export default function DestinoPage() {
  const { id } = useParams<{ id: string }>()
  const [place, setPlace] = useState<Place | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [tips, setTips] = useState<Tip[]>([])
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [showTipForm, setShowTipForm] = useState(false)
  const [tipText, setTipText] = useState('')
  const [hasReviewed, setHasReviewed] = useState(false)
  const [distance, setDistance] = useState<{ km: number; min: number } | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser)
    return unsub
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [p, revs, tps] = await Promise.all([
        getPlaceById(id),
        getReviewsByPlace(id),
        getTipsByPlace(id),
      ])
      setPlace(p)
      setReviews(revs)
      setTips(tps)

      if (p) {
        fetch(`/api/weather?lat=${p.lat}&lng=${p.lng}`)
          .then((r) => r.json())
          .then(setWeather)
          .catch(() => {})
      }
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    if (!user || !id) return
    hasUserReviewedPlace(user.uid, id).then(setHasReviewed)
  }, [user, id])

  async function handleAddTip(e: React.FormEvent) {
    e.preventDefault()
    if (!tipText.trim() || !user) return
    await addTip({ placeId: id, userId: user.uid, userName: user.displayName || 'Anônimo', text: tipText.trim() })
    setTipText('')
    setShowTipForm(false)
    const updated = await getTipsByPlace(id)
    setTips(updated)
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="skeleton h-64 w-full rounded-xl mb-4" />
        <div className="skeleton h-8 w-2/3 mb-2" />
        <div className="skeleton h-5 w-1/2" />
      </div>
    )
  }

  if (!place) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-3">🔍</div>
        <p className="font-semibold text-gray-700">Esse rolê sumiu no mapa!</p>
        <Link href="/" className="text-orange-500 text-sm mt-2 inline-block">Voltar ao início</Link>
      </div>
    )
  }

  const emoji = CATEGORY_EMOJIS[place.category] || '📍'
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`

  return (
    <div className="max-w-2xl mx-auto">
      {/* Foto */}
      <div className="relative h-72 bg-gray-100">
        {place.photoUrl ? (
          <Image src={place.photoUrl} alt={place.name} fill className="object-cover" sizes="100vw" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-7xl bg-gradient-to-b from-orange-50 to-orange-100">
            {emoji}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
            {emoji} {place.category.replace('_', ' ')}
          </span>
          {place.verifiedReviewCount > 0 && (
            <span className="ml-2 bg-green-600/90 text-white text-xs px-2 py-1 rounded-full">
              ✅ Verificado por quem foi
            </span>
          )}
        </div>
        <Link href="/resultados" className="absolute top-4 left-4 bg-white/90 rounded-full w-9 h-9 flex items-center justify-center text-gray-700 shadow">
          ←
        </Link>
      </div>

      <div className="px-4 py-5 flex flex-col gap-5">
        {/* Título */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{place.name}</h1>
          <p className="text-gray-500 mt-0.5">{place.city}, {place.state}</p>
          {place.reviewCount > 0 && (
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={`${i <= Math.round(place.averageRating) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
              ))}
              <span className="text-sm text-gray-500 ml-1">{place.averageRating.toFixed(1)} ({place.reviewCount} avaliações)</span>
            </div>
          )}
        </div>

        {/* Clima */}
        {weather && <WeatherBadge weather={weather} />}

        {/* Descrição */}
        <p className="text-gray-700 leading-relaxed">{place.description}</p>

        {/* Botão Maps */}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary text-center block"
        >
          Ver como chegar 🗺️
        </a>

        {/* Dicas */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Dicas da galera 💡</h2>
            {user && (
              <button onClick={() => setShowTipForm((v) => !v)} className="text-sm text-orange-500 font-semibold">
                + Jogar uma dica
              </button>
            )}
          </div>
          {showTipForm && (
            <form onSubmit={handleAddTip} className="mb-3 flex flex-col gap-2">
              <textarea
                value={tipText}
                onChange={(e) => setTipText(e.target.value)}
                rows={2}
                placeholder="Cola uma dica boa pra quem tá planejando o rolê..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none"
                required
              />
              <button type="submit" className="btn-primary text-sm py-2">Mandar dica 💡</button>
            </form>
          )}
          {tips.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-3">Ninguém jogou uma dica ainda. Bora ser o primeiro? 💡</p>
          ) : (
            <div className="flex flex-col gap-3">
              {tips.map((t) => <TipCard key={t.id} tip={t} />)}
            </div>
          )}
        </section>

        {/* Planejando o rolê */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Planejando o rolê? 🗓️</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: `/eventos?city=${place.city}&state=${place.state}`, emoji: '🎭', label: 'Shows & Eventos', color: 'bg-purple-50 border-purple-100' },
              { href: `/comer?city=${place.city}&state=${place.state}`, emoji: '🍽️', label: 'Onde Comer', color: 'bg-orange-50 border-orange-100' },
              { href: `/hospedar?city=${place.city}&state=${place.state}`, emoji: '🏡', label: 'Onde Dormir', color: 'bg-green-50 border-green-100' },
              { href: `/veiculos?city=${place.city}&state=${place.state}`, emoji: '🚗', label: 'Alugar Veículo', color: 'bg-blue-50 border-blue-100' },
            ].map((item) => (
              <a key={item.href} href={item.href}
                className={`${item.color} border rounded-xl p-3 flex items-center gap-2 hover:shadow-sm transition-shadow`}>
                <span className="text-2xl">{item.emoji}</span>
                <span className="text-sm font-semibold text-gray-700 leading-tight">{item.label}</span>
              </a>
            ))}
          </div>
        </section>

        {/* Reviews */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Reviews verificadas ✅</h2>
            <span className="text-xs text-gray-400">{place.verifiedReviewCount} verificadas</span>
          </div>

          {!hasReviewed && !showReviewForm && (
            <button
              onClick={() => setShowReviewForm(true)}
              className="btn-primary w-full mb-4"
            >
              ⭐ Fui nesse rolê — avaliar
            </button>
          )}

          {showReviewForm && (
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <ReviewForm
                placeId={id}
                placeLat={place.lat}
                placeLng={place.lng}
                onSuccess={async () => {
                  setShowReviewForm(false)
                  setHasReviewed(true)
                  const updated = await getReviewsByPlace(id)
                  setReviews(updated)
                }}
              />
            </div>
          )}

          <ReviewList reviews={reviews} />
        </section>
      </div>
    </div>
  )
}
