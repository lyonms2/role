'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getStayById, getStayReviews, hasUserReviewedStay, deleteStayReview, reportReview, hasUserReportedReview } from '@/lib/firestore'
import { useAuth } from '@/lib/auth-context'
import { auth } from '@/lib/firebase'
import { useRoteiro } from '@/lib/roteiro-context'
import type { Stay, StayReview } from '@/types'
import { STAY_CATEGORY_LABELS } from '@/types'
import Lightbox from '@/components/Lightbox'
import StayReviewForm from '@/components/StayReviewForm'
import RouteModal from '@/components/RouteModal'
import { getOptimizedUrl } from '@/lib/cloudinary'
import FavoriteButton from '@/components/FavoriteButton'

function avgRating(reviews: StayReview[]): string {
  if (!reviews.length) return ''
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
  return avg.toFixed(1)
}

export default function HospedarDetailPage() {
  return <Suspense><HospedarDetail /></Suspense>
}

function HospedarDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const fromRoteiro = useSearchParams().get('from') === 'roteiro'
  const { user: currentUser } = useAuth()
  const { toggleStay } = useRoteiro()
  const [stay, setStay] = useState<Stay | null>(null)
  const [loading, setLoading] = useState(true)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [showRoute, setShowRoute] = useState(false)
  const [durationMin, setDurationMin] = useState<number | null>(null)
  const [reviews, setReviews] = useState<StayReview[]>([])
  const [alreadyReviewed, setAlreadyReviewed] = useState(false)
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null)
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null)
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    getStayById(id).then((s) => { setStay(s); setLoading(false) })
    getStayReviews(id).then(setReviews)
  }, [id])

  useEffect(() => {
    const user = auth.currentUser
    if (user) hasUserReviewedStay(user.uid, id).then(setAlreadyReviewed)
  }, [id])

  useEffect(() => {
    if (!stay?.lat || !stay?.lng) return
    navigator.geolocation?.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(`/api/distance?origin=${pos.coords.latitude},${pos.coords.longitude}&destinations=${stay.lat},${stay.lng}`)
        const data = await res.json()
        if (data.results?.[0]?.durationMin) setDurationMin(data.results[0].durationMin)
      } catch {}
    }, () => {}, { timeout: 10000, enableHighAccuracy: false })
  }, [stay])

  function handleReviewSuccess() {
    getStayReviews(id).then(setReviews)
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

  if (!stay) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-3">🏨</div>
        <p className="font-bold text-gray-800">Hospedagem não encontrada</p>
        <button onClick={() => router.back()} className="text-sm text-blue-500 mt-3 inline-block">← Voltar</button>
      </div>
    )
  }

  const label = STAY_CATEGORY_LABELS[stay.category] || stay.category
  const rating = avgRating(reviews)
  const allPhotos = Array.from(new Set([stay.photoUrl, ...(stay.photos || [])].filter(Boolean))) as string[]

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

      {showRoute && stay.lat && stay.lng && (
        <RouteModal
          destLat={stay.lat}
          destLng={stay.lng}
          destName={stay.name}
          mapsUrl={stay.mapsLink || `https://www.google.com/maps?q=${stay.lat},${stay.lng}`}
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
        <div className="flex items-center gap-2">
          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">{label}</span>
          <FavoriteButton item={{ type: 'stay', name: stay.name, photoUrl: stay.photoUrl ?? '', city: stay.city, state: stay.state, category: label, originalId: stay.id, href: `/hospedar/${stay.id}` }} />
        </div>
      </div>

      <div className="px-4 flex flex-col gap-5">

        {/* Nome */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{stay.name}</h1>
          {reviews.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-yellow-400 text-sm">★</span>
              <span className="text-sm font-semibold text-gray-700">{rating}</span>
              <span className="text-xs text-gray-400">({reviews.length} avaliação{reviews.length !== 1 ? 'ões' : ''})</span>
            </div>
          )}
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
                  alt={stay.name}
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
          <div className="h-36 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center text-6xl">🏨</div>
        )}

        {/* Card de detalhes */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4 flex flex-col gap-3">

          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5">📍</span>
            <div>
              {(stay.lat && stay.lng) ? (
                <button onClick={() => setShowRoute(true)}
                  className="text-sm font-semibold text-gray-800 hover:text-blue-600 transition-colors text-left">
                  {stay.city}, {stay.state}
                </button>
              ) : (
                <p className="text-sm font-semibold text-gray-800">{stay.city}, {stay.state}</p>
              )}
            </div>
          </div>

          {stay.priceFrom != null && (
            <div className="flex items-center gap-3">
              <span className="text-lg">💰</span>
              <p className="text-sm text-gray-700">
                A partir de <span className="font-bold">R$ {stay.priceFrom.toLocaleString('pt-BR')}</span>/noite
              </p>
            </div>
          )}

          {stay.socialLink && (
            <div className="flex items-center gap-3">
              <span className="text-lg">📱</span>
              <a href={stay.socialLink} target="_blank" rel="noopener noreferrer"
                className="text-sm font-semibold text-blue-600 hover:underline truncate">
                Ver nas redes sociais
              </a>
            </div>
          )}
        </div>

        {/* Descrição */}
        {stay.description && (
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{stay.description}</p>
        )}

        {/* Ações */}
        <div className="flex flex-col gap-2.5">
          {stay.bookingUrl && (
            <a
              href={stay.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm text-center bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
            >
              🛏️ Reservar agora
            </a>
          )}

          {(stay.mapsLink || (stay.lat && stay.lng)) && (
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
                toggleStay({
                  id: stay.id,
                  name: stay.name,
                  city: stay.city,
                  category: stay.category,
                  ...(stay.priceFrom != null ? { priceFrom: stay.priceFrom } : {}),
                  ...(stay.bookingUrl ? { bookingUrl: stay.bookingUrl } : {}),
                  ...(stay.photoUrl ? { photoUrl: stay.photoUrl } : {}),
                  ...(stay.lat ? { lat: stay.lat } : {}),
                  ...(stay.lng ? { lng: stay.lng } : {}),
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
              <StayReviewForm stayId={stay.id} stayName={stay.name} placeLat={stay.lat} placeLng={stay.lng} onSuccess={handleReviewSuccess} />
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
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                          {r.userName[0]?.toUpperCase()}
                        </div>
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link href={`/perfil/${r.userId}`} className="text-sm font-semibold text-gray-800 hover:text-blue-600 truncate">{r.userName}</Link>
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
                                await deleteStayReview(r.id, stay.id, r.rating, r.photos)
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
                                if (!already) await reportReview({ reviewId: r.id, reviewType: 'stay', stayId: stay.id, reviewUserId: r.userId, reviewUserName: r.userName, reviewText: r.text, reviewRating: r.rating, placeName: stay.name, reportedBy: user.uid, reportedByName: user.displayName ?? 'Anônimo' })
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
                    {r.cleanliness && (
                      <span className="bg-white border border-gray-200 px-2 py-1 rounded-full text-gray-600">
                        {r.cleanliness === 'impecavel' ? '✨ Limpeza impecável' : r.cleanliness === 'boa' ? '🙂 Limpeza boa' : '😕 Limpeza ruim'}
                      </span>
                    )}
                    {r.service && (
                      <span className="bg-white border border-gray-200 px-2 py-1 rounded-full text-gray-600">
                        {r.service === 'excelente' ? '😊 Atendimento excelente' : r.service === 'bom' ? '🙂 Atendimento bom' : '😕 Atendimento ruim'}
                      </span>
                    )}
                    {r.priceRange && (
                      <span className="bg-white border border-gray-200 px-2 py-1 rounded-full text-gray-600">
                        {r.priceRange} {r.priceRange === '💲' ? 'Econômico' : r.priceRange === '💲💲' ? 'Moderado' : 'Premium'}
                      </span>
                    )}
                    <span className="bg-white border border-gray-200 px-2 py-1 rounded-full text-gray-600">
                      {r.familyFriendly ? '👨‍👩‍👧 Família OK' : '🔞 Adulto'}
                    </span>
                  </div>

                  {r.text && <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{r.text}</p>}

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
