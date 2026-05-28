'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getEatById, getEatReviews, hasUserReviewedEat, deleteEatReview, reportReview, hasUserReportedReview } from '@/lib/firestore'
import { useAuth } from '@/lib/auth-context'
import { auth } from '@/lib/firebase'
import { useRoteiro } from '@/lib/roteiro-context'
import type { Eat, EatReview } from '@/types'
import { EAT_CATEGORY_LABELS } from '@/types'
import Lightbox from '@/components/Lightbox'
import EatReviewForm from '@/components/EatReviewForm'
import RouteModal from '@/components/RouteModal'
import { getOptimizedUrl } from '@/lib/cloudinary'

function avgRating(reviews: EatReview[]): string {
  if (!reviews.length) return ''
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
  return avg.toFixed(1)
}

export default function ComerDetailPage() {
  return <Suspense><ComerDetail /></Suspense>
}

function ComerDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const fromRoteiro = useSearchParams().get('from') === 'roteiro'
  const { user: currentUser } = useAuth()
  const { toggleEat } = useRoteiro()
  const [eat, setEat] = useState<Eat | null>(null)
  const [loading, setLoading] = useState(true)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [showRoute, setShowRoute] = useState(false)
  const [durationMin, setDurationMin] = useState<number | null>(null)
  const [reviews, setReviews] = useState<EatReview[]>([])
  const [alreadyReviewed, setAlreadyReviewed] = useState(false)
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null)
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null)
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    getEatById(id).then((e) => { setEat(e); setLoading(false) })
    getEatReviews(id).then(setReviews)
  }, [id])

  useEffect(() => {
    const user = auth.currentUser
    if (user) hasUserReviewedEat(user.uid, id).then(setAlreadyReviewed)
  }, [id])

  useEffect(() => {
    if (!eat?.lat || !eat?.lng) return
    navigator.geolocation?.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(`/api/distance?origin=${pos.coords.latitude},${pos.coords.longitude}&destinations=${eat.lat},${eat.lng}`)
        const data = await res.json()
        if (data.results?.[0]?.durationMin) setDurationMin(data.results[0].durationMin)
      } catch {}
    }, () => {}, { timeout: 10000, enableHighAccuracy: false })
  }, [eat])

  function handleReviewSuccess() {
    getEatReviews(id).then(setReviews)
    setAlreadyReviewed(true)
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6 flex flex-col gap-4">
        <div className="skeleton h-8 w-2/3" />
        <div className="skeleton h-64 w-full rounded-2xl" />
        <div className="skeleton h-24 w-full rounded-2xl" />
        <div className="skeleton h-12 w-full rounded-xl" />
      </div>
    )
  }

  if (!eat) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-3">🍽️</div>
        <p className="font-bold text-gray-800">Local não encontrado</p>
        <button onClick={() => router.back()} className="text-sm text-orange-500 mt-3 inline-block">← Voltar</button>
      </div>
    )
  }

  const label = EAT_CATEGORY_LABELS[eat.category] || eat.category
  const rating = avgRating(reviews)
  const allPhotos = Array.from(new Set([eat.photoUrl, ...(eat.photos || [])].filter(Boolean))) as string[]

  function formatDuration(min: number) {
    if (min >= 60) return `${Math.floor(min / 60)}h${min % 60 > 0 ? `${min % 60}min` : ''}`
    return `${min}min`
  }

  return (
    <div className="max-w-lg mx-auto pb-24">

      {lightboxIdx !== null && allPhotos.length > 0 && (
        <Lightbox
          photos={allPhotos}
          startIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}

      {showRoute && eat.lat && eat.lng && (
        <RouteModal
          destLat={eat.lat}
          destLng={eat.lng}
          destName={eat.name}
          mapsUrl={eat.mapsLink || `https://www.google.com/maps?q=${eat.lat},${eat.lng}`}
          onClose={() => setShowRoute(false)}
        />
      )}

      {/* Navegação */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          ← Voltar
        </button>
        <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full">
          {label}
        </span>
      </div>

      <div className="px-4 flex flex-col gap-5">

        {/* Nome */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{eat.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {reviews.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-yellow-400 text-sm">★</span>
                <span className="text-sm font-semibold text-gray-700">{rating}</span>
                <span className="text-xs text-gray-400">({reviews.length} avaliação{reviews.length !== 1 ? 'ões' : ''})</span>
              </div>
            )}
            <span className="text-sm font-bold text-gray-500">{eat.priceRange}</span>
          </div>
        </div>

        {/* Galeria de fotos */}
        {allPhotos.length > 0 && (
          <div className={`grid gap-2 ${allPhotos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {allPhotos.slice(0, 4).map((url, i) => (
              <button
                key={i}
                onClick={() => setLightboxIdx(i)}
                className={`relative overflow-hidden rounded-2xl bg-gray-100 focus:outline-none cursor-zoom-in ${
                  allPhotos.length === 1 ? 'h-64' : i === 0 && allPhotos.length > 2 ? 'col-span-2 h-48' : 'h-36'
                }`}
              >
                <Image
                  src={getOptimizedUrl(url, 800)}
                  alt={eat.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
                {i === 3 && allPhotos.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">+{allPhotos.length - 4}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {allPhotos.length === 0 && (
          <div className="h-36 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-6xl">🍽️</div>
        )}

        {/* Card de detalhes */}
        <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-4 flex flex-col gap-3">

          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5">📍</span>
            <div>
              {eat.mapsLink ? (
                <a href={eat.mapsLink} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-semibold text-gray-800 hover:text-orange-600 transition-colors">
                  {eat.city}, {eat.state}
                </a>
              ) : (
                <p className="text-sm font-semibold text-gray-800">{eat.city}, {eat.state}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-lg">💰</span>
            <p className="text-sm text-gray-700">Faixa de preço: <span className="font-bold">{eat.priceRange}</span></p>
          </div>

          {eat.socialLink && (
            <div className="flex items-center gap-3">
              <span className="text-lg">📱</span>
              <a href={eat.socialLink} target="_blank" rel="noopener noreferrer"
                className="text-sm font-semibold text-orange-600 hover:underline truncate">
                Ver nas redes sociais
              </a>
            </div>
          )}
        </div>

        {/* Descrição */}
        {eat.description && (
          <p className="text-sm text-gray-600 leading-relaxed">{eat.description}</p>
        )}

        {/* Ações */}
        <div className="flex flex-col gap-2.5">
          {(eat.mapsLink || (eat.lat && eat.lng)) && (
            <button
              onClick={() => setShowRoute(true)}
              className="w-full py-3 rounded-xl font-bold text-sm text-center border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              🗺️ Como chegar{durationMin != null ? ` (~${formatDuration(durationMin)})` : ''}
            </button>
          )}

          {!fromRoteiro && (
            <button
              onClick={() => {
                toggleEat({
                  id: eat.id,
                  name: eat.name,
                  city: eat.city,
                  category: eat.category,
                  priceRange: eat.priceRange,
                  ...(eat.photoUrl ? { photoUrl: eat.photoUrl } : {}),
                  ...(eat.lat ? { lat: eat.lat } : {}),
                  ...(eat.lng ? { lng: eat.lng } : {}),
                })
                router.push('/roteiro')
              }}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm bg-orange-500 hover:bg-orange-600 transition-colors shadow-sm"
            >
              🗓️ Adicionar ao roteiro
            </button>
          )}
        </div>

        {/* Avaliações */}
        <div className="pt-1">
          <h2 className="font-bold text-gray-900 text-base mb-3">
            Avaliações {reviews.length > 0 && <span className="text-gray-400 font-normal text-sm">({reviews.length})</span>}
          </h2>

          {!alreadyReviewed && (
            <div className="mb-4">
              <EatReviewForm eatId={eat.id} eatName={eat.name} placeLat={eat.lat} placeLng={eat.lng} onSuccess={handleReviewSuccess} />
            </div>
          )}

          {reviews.length === 0 && alreadyReviewed && (
            <p className="text-sm text-gray-400 text-center py-4">Seja o primeiro a avaliar!</p>
          )}

          <div className="flex flex-col gap-3">
            {reviews.map((r) => {
              const currentUid = currentUser?.uid
              const isOwner = !!currentUid && currentUid === r.userId
              return (
                <div key={r.id} className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Link href={`/perfil/${r.userId}`} className="flex-shrink-0">
                      {r.userPhoto ? (
                        <Image src={r.userPhoto} alt={r.userName} width={32} height={32} className="rounded-full object-cover" unoptimized />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold">
                          {r.userName[0]?.toUpperCase()}
                        </div>
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link href={`/perfil/${r.userId}`} className="text-sm font-semibold text-gray-800 hover:text-orange-600 truncate">{r.userName}</Link>
                        {r.reviewerRank && <span className="bg-orange-50 text-orange-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">{r.reviewerRank}</span>}
                        {r.verified && <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">✅ Verificado</span>}
                      </div>
                      <p className="text-xs text-gray-400">
                        {r.createdAt?.toDate?.().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <span key={i} className={`text-sm ${i <= r.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                        ))}
                      </div>
                      {isOwner ? (
                        deletingReviewId === r.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={async () => {
                                await deleteEatReview(r.id, eat.id, r.rating, r.priceRange, r.photos)
                                setReviews((prev) => prev.filter((x) => x.id !== r.id))
                                setAlreadyReviewed(false)
                                setDeletingReviewId(null)
                              }}
                              className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-lg"
                            >
                              Confirmar
                            </button>
                            <button onClick={() => setDeletingReviewId(null)} className="text-xs text-gray-400 px-1">✕</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeletingReviewId(r.id)} className="text-gray-400 hover:text-red-500 transition-colors text-sm">🗑️</button>
                        )
                      ) : currentUid ? (
                        reportedIds.has(r.id) ? (
                          <span className="text-xs text-gray-400">Denunciado</span>
                        ) : reportingReviewId === r.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={async () => {
                                const user = auth.currentUser
                                if (!user) return
                                const already = await hasUserReportedReview(user.uid, r.id)
                                if (!already) await reportReview({ reviewId: r.id, reviewType: 'eat', eatId: eat.id, reviewUserId: r.userId, reviewUserName: r.userName, reviewText: r.text, reviewRating: r.rating, placeName: eat.name, reportedBy: user.uid, reportedByName: user.displayName ?? 'Anônimo' })
                                setReportedIds((s) => new Set(s).add(r.id))
                                setReportingReviewId(null)
                              }}
                              className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-1 rounded-lg"
                            >Confirmar</button>
                            <button onClick={() => setReportingReviewId(null)} className="text-xs text-gray-400 px-1">✕</button>
                          </div>
                        ) : (
                          <button onClick={() => setReportingReviewId(r.id)} className="text-gray-300 hover:text-orange-400 transition-colors text-sm" title="Denunciar">🚩</button>
                        )
                      ) : null}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap text-xs">
                    {r.foodQuality && (
                      <span className="bg-white border border-gray-200 px-2 py-1 rounded-full text-gray-600">
                        {r.foodQuality === 'otima' ? '😋 Comida excelente' : r.foodQuality === 'boa' ? '🙂 Comida boa' : '😕 Comida ruim'}
                      </span>
                    )}
                    <span className="bg-white border border-gray-200 px-2 py-1 rounded-full text-gray-600">
                      {r.crowded === 'tranquilo' ? '😌 Tranquilo' : r.crowded === 'moderado' ? '🙂 Moderado' : '🏃 Lotado'}
                    </span>
                    {r.priceRange && (
                      <span className="bg-white border border-gray-200 px-2 py-1 rounded-full text-gray-600">
                        {r.priceRange} {r.priceRange === '💲' ? 'Econômico' : r.priceRange === '💲💲' ? 'Moderado' : 'Premium'}
                      </span>
                    )}
                  </div>

                  {r.text && <p className="text-sm text-gray-700 leading-relaxed">{r.text}</p>}

                  {r.photos && r.photos.length > 0 && (
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {r.photos.map((url, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                          <Image src={getOptimizedUrl(url, 200)} alt="" fill className="object-cover" unoptimized />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
