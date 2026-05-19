'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { getReviewsByUser, getEventReviewsByUser, getEatReviewsByUser, getStayReviewsByUser } from '@/lib/firestore'
import type { Review, EventReview, EatReview, StayReview } from '@/types'

interface UserProfile {
  name: string
  photo?: string
}

function inferProfile(
  reviews: Review[],
  eventReviews: EventReview[],
  eatReviews: EatReview[],
  stayReviews: StayReview[],
): UserProfile | null {
  const all = [
    reviews[0] && { name: reviews[0].userName, photo: reviews[0].userPhoto },
    eventReviews[0] && { name: eventReviews[0].userName, photo: eventReviews[0].userPhoto },
    eatReviews[0] && { name: eatReviews[0].userName, photo: eatReviews[0].userPhoto },
    stayReviews[0] && { name: stayReviews[0].userName, photo: stayReviews[0].userPhoto },
  ].filter(Boolean) as UserProfile[]
  return all[0] ?? null
}

export default function PublicProfilePage() {
  return <Suspense><PublicProfile /></Suspense>
}

function PublicProfile() {
  const { userId } = useParams<{ userId: string }>()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [placeReviews, setPlaceReviews] = useState<Review[]>([])
  const [eventReviews, setEventReviews] = useState<EventReview[]>([])
  const [eatReviews, setEatReviews] = useState<EatReview[]>([])
  const [stayReviews, setStayReviews] = useState<StayReview[]>([])

  useEffect(() => {
    Promise.all([
      getReviewsByUser(userId),
      getEventReviewsByUser(userId),
      getEatReviewsByUser(userId),
      getStayReviewsByUser(userId),
    ]).then(([p, e, eat, stay]) => {
      setPlaceReviews(p)
      setEventReviews(e)
      setEatReviews(eat)
      setStayReviews(stay)
      setProfile(inferProfile(p, e, eat, stay))
      setLoading(false)
    })
  }, [userId])

  const totalReviews = placeReviews.length + eventReviews.length + eatReviews.length + stayReviews.length

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-8 flex flex-col gap-4">
        <div className="skeleton h-20 w-full rounded-2xl" />
        <div className="skeleton h-40 w-full rounded-2xl" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-3">👤</div>
        <p className="font-bold text-gray-800">Perfil não encontrado</p>
        <button onClick={() => router.back()} className="text-sm text-orange-500 mt-3 inline-block">← Voltar</button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto pb-24">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          ← Voltar
        </button>
      </div>

      <div className="px-4 flex flex-col gap-5">
        {/* Header do perfil */}
        <div className="flex items-center gap-4 bg-gray-50 rounded-2xl p-4">
          {profile.photo ? (
            <Image src={profile.photo} alt={profile.name} width={64} height={64} className="rounded-full object-cover" unoptimized />
          ) : (
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-2xl font-bold">
              {profile.name[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-gray-900">{profile.name}</h1>
            <p className="text-sm text-gray-400">{totalReviews} avaliação{totalReviews !== 1 ? 'ões' : ''}</p>
          </div>
        </div>

        {/* Avaliações de destinos */}
        {placeReviews.length > 0 && (
          <section>
            <h2 className="font-bold text-gray-800 mb-2">🗺️ Destinos</h2>
            <div className="flex flex-col gap-2">
              {placeReviews.map((r) => (
                <ReviewCard
                  key={r.id}
                  name={r.placeName ?? '—'}
                  rating={r.rating}
                  text={r.text}
                  date={r.createdAt?.toDate?.()}
                  accent="orange"
                />
              ))}
            </div>
          </section>
        )}

        {/* Avaliações de eventos */}
        {eventReviews.length > 0 && (
          <section>
            <h2 className="font-bold text-gray-800 mb-2">🎪 Eventos</h2>
            <div className="flex flex-col gap-2">
              {eventReviews.map((r) => (
                <ReviewCard
                  key={r.id}
                  name={r.eventName ?? '—'}
                  rating={r.rating}
                  text={r.text}
                  date={r.createdAt?.toDate?.()}
                  accent="purple"
                />
              ))}
            </div>
          </section>
        )}

        {/* Avaliações de restaurantes */}
        {eatReviews.length > 0 && (
          <section>
            <h2 className="font-bold text-gray-800 mb-2">🍽️ Onde Comer</h2>
            <div className="flex flex-col gap-2">
              {eatReviews.map((r) => (
                <ReviewCard
                  key={r.id}
                  name={r.eatName ?? '—'}
                  rating={r.rating}
                  text={r.text}
                  date={r.createdAt?.toDate?.()}
                  accent="orange"
                  extra={r.priceRange}
                />
              ))}
            </div>
          </section>
        )}

        {/* Avaliações de hospedagens */}
        {stayReviews.length > 0 && (
          <section>
            <h2 className="font-bold text-gray-800 mb-2">🏡 Onde Dormir</h2>
            <div className="flex flex-col gap-2">
              {stayReviews.map((r) => (
                <ReviewCard
                  key={r.id}
                  name={r.stayName ?? '—'}
                  rating={r.rating}
                  text={r.text}
                  date={r.createdAt?.toDate?.()}
                  accent="blue"
                />
              ))}
            </div>
          </section>
        )}

        {totalReviews === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">Nenhuma avaliação ainda.</p>
        )}
      </div>
    </div>
  )
}

function ReviewCard({
  name, rating, text, date, accent, extra,
}: {
  name: string
  rating: number
  text?: string
  date?: Date
  accent: 'orange' | 'purple' | 'blue'
  extra?: string
}) {
  const star = accent === 'purple' ? 'text-purple-400' : accent === 'blue' ? 'text-blue-400' : 'text-yellow-400'
  return (
    <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800 truncate">{name}</p>
        <div className="flex gap-0.5 flex-shrink-0">
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={`text-xs ${i <= rating ? star : 'text-gray-200'}`}>★</span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {extra && <span className="text-xs text-gray-500">{extra}</span>}
        {date && <span className="text-xs text-gray-400">{date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
      </div>
      {text && <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{text}</p>}
    </div>
  )
}
