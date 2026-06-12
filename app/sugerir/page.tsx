'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { auth } from '@/lib/firebase'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { uploadToCloudinary } from '@/lib/cloudinary'

const LocationMap = dynamic(() => import('@/components/LocationMap'), { ssr: false, loading: () => <div className="w-full rounded-xl bg-gray-100 animate-pulse" style={{ height: 320 }} /> })

const DESTINATION_CATEGORIES = [
  { group: '🌿 Ao Ar Livre', items: [
    { value: 'praia',     emoji: '🏖️', label: 'Praia' },
    { value: 'cachoeira', emoji: '💧', label: 'Cachoeira' },
    { value: 'trilha',    emoji: '🥾', label: 'Trilha' },
    { value: 'serra',     emoji: '⛰️', label: 'Serra' },
  ]},
  { group: '🎉 Lazer', items: [
    { value: 'parque',    emoji: '🌳', label: 'Parque' },
    { value: 'zoo',       emoji: '🦁', label: 'Zoo & Aquário' },
    { value: 'diversoes', emoji: '🎡', label: 'Diversões' },
    { value: 'mirante',   emoji: '🔭', label: 'Mirante' },
  ]},
  { group: '🎭 Cultura', items: [
    { value: 'museu',  emoji: '🏛️', label: 'Museu' },
    { value: 'teatro', emoji: '🎨', label: 'Teatro & Arte' },
  ]},
]

const COMER_CATEGORIES = [
  { value: 'restaurante', emoji: '🍽️', label: 'Restaurante' },
  { value: 'bar',         emoji: '🍺', label: 'Bar / Boteco' },
  { value: 'cafe',        emoji: '☕', label: 'Café' },
  { value: 'padaria',     emoji: '🥐', label: 'Padaria' },
  { value: 'lanchonete',  emoji: '🥪', label: 'Lanchonete' },
  { value: 'outro',       emoji: '🍴', label: 'Outro' },
]

const HOSPEDAR_CATEGORIES = [
  { value: 'pousada',  emoji: '🏡', label: 'Pousada' },
  { value: 'hotel',    emoji: '🏨', label: 'Hotel' },
  { value: 'hostel',   emoji: '🛏️', label: 'Hostel' },
  { value: 'camping',  emoji: '⛺', label: 'Camping' },
  { value: 'chale',    emoji: '🪵', label: 'Chalé / Cabana' },
]

interface CityPrediction {
  place_id: string
  description: string
  lat: number
  lng: number
  cityName: string
  stateCode: string
}

const MAX_PHOTOS = 3

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match?.[1] || null
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`rounded-full transition-all ${
          i < current ? 'w-6 h-2 bg-green-700' : i === current ? 'w-8 h-2 bg-green-700' : 'w-2 h-2 bg-gray-200'
        }`} />
      ))}
    </div>
  )
}

function SugerirContent() {
  const searchParams = useSearchParams()
  const tipo = searchParams.get('tipo') // 'comer' | 'hospedar' | null

  const { user } = useAuth()
  const [showLogin, setShowLogin] = useState(false)

  const isComer    = tipo === 'comer'
  const isHospedar = tipo === 'hospedar'
  const isDestino  = !isComer && !isHospedar

  // Para comer/hospedar: 'free' = sugestão, 'paid' = destaque
  const [plan, setPlan] = useState<'free' | 'paid' | null>(isDestino ? 'free' : null)

  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    name: '', city: '', state: '', lat: 0, lng: 0,
    category: '', description: '', mapsLink: '', videoUrl: '',
    priceRange: '💲💲', socialLink: '', priceFrom: '', bookingUrl: '',
    contactName: '', contactEmail: '', contactPhone: '',
  })
  const [cityInput, setCityInput] = useState('')
  const [cityPredictions, setCityPredictions] = useState<CityPrediction[]>([])
  const [citySelected, setCitySelected] = useState(false)
  const cityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [resolvedCoords, setResolvedCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (cityInput.length < 3 || citySelected) { setCityPredictions([]); return }
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current)
    cityDebounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(cityInput)}`)
      const data = await res.json()
      setCityPredictions(data.predictions || [])
    }, 400)
  }, [cityInput, citySelected])

  function selectCity(p: CityPrediction) {
    setCityInput(p.description)
    setForm((f) => ({ ...f, city: p.cityName || p.description, state: p.stateCode, lat: p.lat, lng: p.lng }))
    setCityPredictions([])
    setCitySelected(true)
  }

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || photos.length >= MAX_PHOTOS) return
    if (file.size > 5 * 1024 * 1024) { alert('Foto muito grande! Máximo 5 MB.'); if (fileRef.current) fileRef.current.value = ''; return }
    const idx = photos.length
    setPreviews((p) => [...p, URL.createObjectURL(file)])
    setUploadingIdx(idx)
    setUploadProgress(0)
    try {
      const url = await uploadToCloudinary(file, setUploadProgress)
      setPhotos((p) => [...p, url])
    } catch {
      setPreviews((p) => p.filter((_, i) => i !== idx))
      alert('Deu ruim no upload. Tenta mais uma vez!')
    } finally {
      setUploadingIdx(null)
      setUploadProgress(0)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function removePhoto(idx: number) {
    setPhotos((p) => p.filter((_, i) => i !== idx))
    setPreviews((p) => p.filter((_, i) => i !== idx))
  }

  const videoId = extractYouTubeId(form.videoUrl)
  const minDesc = 30

  async function handleSubmit() {
    if (!user) { setShowLogin(true); return }
    if (form.description.length < minDesc) {
      alert(`Conta mais sobre o lugar! Mínimo ${minDesc} caracteres.`)
      return
    }
    setStatus('sending')
    try {
      // comer/hospedar sempre vão para advertiser_requests (admin publica em eats/stays)
      // destinos (praias, trilhas) vão para suggestions
      const col = tipo ? 'advertiser_requests' : 'suggestions'
      await addDoc(collection(db, col), {
        tipo: tipo || 'destino',
        type: tipo || 'destino', // campo esperado pelo admin em advertiser_requests
        plan: plan || 'free',
        name: form.name,
        city: form.city,
        state: form.state,
        lat: resolvedCoords?.lat ?? form.lat,
        lng: resolvedCoords?.lng ?? form.lng,
        category: form.category,
        description: form.description,
        mapsLink: resolvedCoords
          ? `https://www.google.com/maps?q=${resolvedCoords.lat},${resolvedCoords.lng}`
          : null,
        photos: photos.length ? photos : null,
        videoUrl: (isDestino && videoId) ? `https://www.youtube.com/watch?v=${videoId}` : null,
        priceRange: isComer ? form.priceRange : null,
        priceFrom: isHospedar && form.priceFrom ? Number(form.priceFrom) : null,
        bookingUrl: isHospedar ? form.bookingUrl || null : null,
        socialLink: (isComer || isHospedar) ? form.socialLink || null : null,
        contactName: form.contactName || null,
        contactEmail: form.contactEmail || null,
        contactPhone: form.contactPhone || null,
        suggestedBy: user?.uid || 'anon',
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  function reset() {
    setStep(0)
    setStatus('idle')
    setPlan(isDestino ? 'free' : null)
    setForm({ name: '', city: '', state: '', lat: 0, lng: 0, category: '', description: '', mapsLink: '', videoUrl: '', priceRange: '💲💲', socialLink: '', priceFrom: '', bookingUrl: '', contactName: '', contactEmail: '', contactPhone: '' })
    setCityInput('')
    setCitySelected(false)
    setResolvedCoords(null)
    setPhotos([])
    setPreviews([])
  }

  const headerEmoji  = isComer ? '🍽️' : isHospedar ? '🏡' : '🗺️'
  const categoryItems = isComer ? COMER_CATEGORIES : isHospedar ? HOSPEDAR_CATEGORIES : null

  if (status === 'success') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-7xl mb-4">🙌</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {plan === 'paid' ? 'Pedido de destaque enviado!' : isComer ? 'Restaurante sugerido!' : isHospedar ? 'Hospedagem sugerida!' : 'Chegou! Valeu demais!'}
        </h2>
        <p className="text-gray-500 mb-6">
          {plan === 'paid' ? 'Nossa equipe vai revisar e entrar em contato em breve.' : 'Nossa equipe vai revisar e publicar em breve. Obrigado!'}
        </p>
        <button onClick={reset} className="w-full py-3.5 rounded-xl font-bold text-sm border border-gray-200 text-gray-600 bg-white">
          {isComer ? 'Sugerir outro restaurante' : isHospedar ? 'Sugerir outra hospedagem' : 'Sugerir outro rolê'}
        </button>
      </div>
    )
  }

  const loginModal = showLogin && (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="bg-white rounded-t-3xl w-full max-w-2xl p-6 text-center">
        <div className="text-4xl mb-3">🙌</div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Entre para enviar sua sugestão</h3>
        <p className="text-gray-500 text-sm mb-5">É rapidinho — login com Google e pronto.</p>
        <button
          onClick={async () => {
            const { googleProvider } = await import('@/lib/firebase')
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
  )

  // Escolha de plano — só para comer/hospedar, antes de começar
  if (tipo && plan === null) {
    const gradientColor = isComer ? 'from-orange-500 to-orange-400' : 'from-green-600 to-green-500'
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <Link href="/" className="text-sm text-gray-400 mb-6 inline-block">← Início</Link>
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">{headerEmoji}</div>
          <h1 className="text-2xl font-bold text-gray-900">{isComer ? 'Adicionar restaurante' : 'Adicionar hospedagem'}</h1>
          <p className="text-gray-500 mt-1 text-sm">Como você quer aparecer no LetsApp?</p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => setPlan('free')}
            className="w-full text-left px-5 py-4 rounded-2xl border-2 border-gray-100 bg-white hover:border-gray-200 transition-all"
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">🙌</span>
              <div className="flex-1">
                <p className="font-bold text-gray-900">Sugestão gratuita</p>
                <p className="text-xs text-gray-500 mt-0.5">Nossa equipe revisa e publica na listagem normal. Sem custo.</p>
              </div>
              <span className="text-gray-300 text-xl flex-shrink-0">›</span>
            </div>
          </button>

          <button
            onClick={() => setPlan('paid')}
            className={`w-full text-left px-5 py-4 rounded-2xl bg-gradient-to-r ${gradientColor} hover:opacity-90 transition-all`}
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">⭐</span>
              <div className="flex-1">
                <p className="font-bold text-white">Destaque pago</p>
                <p className="text-xs text-white/80 mt-0.5">Aparece em posição privilegiada nos resultados.</p>
              </div>
              <span className="text-white/60 text-xl flex-shrink-0">›</span>
            </div>
          </button>
        </div>
      </div>
    )
  }

  const totalSteps = (tipo && plan === 'paid') ? 4 : 3

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link href="/" className="text-sm text-gray-400 mb-6 inline-block">← Início</Link>
      {loginModal}
      <StepDots current={step} total={totalSteps} />

      {/* Badge do plano escolhido */}
      {tipo && plan && (
        <div className="flex justify-center mb-4">
          <button
            onClick={() => { setPlan(null); setStep(0) }}
            className={`text-xs font-semibold px-3 py-1 rounded-full ${plan === 'paid' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}
          >
            {plan === 'paid' ? '⭐ Destaque pago' : '🙌 Sugestão gratuita'} · trocar
          </button>
        </div>
      )}

      {/* ── PASSO 0 — O que é? ──────────────────────────────── */}
      {step === 0 && (
        <div>
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">{headerEmoji}</div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isComer ? 'Qual é o restaurante?' : isHospedar ? 'Qual é a hospedagem?' : 'Qual é o destino?'}
            </h1>
          </div>

          <div className="flex flex-col gap-4">
            {isDestino ? (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de lugar *</label>
                <div className="flex flex-col gap-3">
                  {DESTINATION_CATEGORIES.map(({ group, items }) => (
                    <div key={group}>
                      <p className="text-xs font-semibold text-gray-400 mb-1.5">{group}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {items.map(({ value, emoji, label }) => (
                          <button key={value} type="button" onClick={() => update('category', value)}
                            className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all flex items-center gap-2 ${
                              form.category === value ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-600 border-gray-200 hover:border-green-200'
                            }`}>
                            <span>{emoji}</span><span>{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo *</label>
                <div className="grid grid-cols-2 gap-2">
                  {categoryItems!.map(({ value, emoji, label }) => (
                    <button key={value} type="button" onClick={() => update('category', value)}
                      className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all flex items-center gap-2 ${
                        form.category === value ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-200'
                      }`}>
                      <span>{emoji}</span><span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome *</label>
              <input
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder={isComer ? 'Ex: Restaurante do João, Bar da Serra...' : isHospedar ? 'Ex: Pousada das Araucárias...' : 'Ex: Praia do Rosa, Parque da Serra...'}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500"
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cidade *</label>
              <input
                value={cityInput}
                onChange={(e) => { setCityInput(e.target.value); setCitySelected(false) }}
                placeholder="Ex: Siderópolis, SC"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500"
              />
              {citySelected && form.state && (
                <p className="text-xs text-green-600 font-medium mt-1.5">📍 {form.city}, {form.state}</p>
              )}
              {cityPredictions.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {cityPredictions.map((p) => (
                    <button key={p.place_id} type="button" onClick={() => selectCity(p)}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-green-50 border-b border-gray-100 last:border-0">
                      📍 {p.description}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isHospedar && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Diária a partir de (R$) <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="number"
                    value={form.priceFrom}
                    onChange={(e) => update('priceFrom', e.target.value)}
                    placeholder="Ex: 250"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Link de reservas <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="url"
                    value={form.bookingUrl}
                    onChange={(e) => update('bookingUrl', e.target.value)}
                    placeholder="https://booking.com/..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Rede social <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="url"
                    value={form.socialLink}
                    onChange={(e) => update('socialLink', e.target.value)}
                    placeholder="https://instagram.com/suahospedagem"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500"
                  />
                </div>
              </>
            )}

            {isComer && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Faixa de preço</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['💲', '💲💲', '💲💲💲'] as const).map((v) => (
                      <button key={v} type="button" onClick={() => update('priceRange', v)}
                        className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                          form.priceRange === v ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-200'
                        }`}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Rede social <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="url"
                    value={form.socialLink}
                    onChange={(e) => update('socialLink', e.target.value)}
                    placeholder="https://instagram.com/seurestaurante"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500"
                  />
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setStep(1)}
            disabled={!form.category || !form.name.trim() || !citySelected}
            className="w-full mt-8 py-4 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-40"
            style={{ background: '#15803d' }}
          >
            Próximo → Onde fica?
          </button>
        </div>
      )}

      {/* ── PASSO 1 — Onde fica? ──────────────────────────── */}
      {step === 1 && (
        <div>
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">📍</div>
            <h1 className="text-2xl font-bold text-gray-900">Onde fica?</h1>
            <p className="text-sm font-semibold text-green-700 mt-1">{form.name}</p>
          </div>

          <LocationMap
            center={form.lat && form.lng ? [form.lat, form.lng] : [-15.8, -47.9]}
            zoom={form.lat && form.lng ? 13 : 4}
            selected={resolvedCoords}
            onSelect={(lat, lng) => setResolvedCoords({ lat, lng })}
          />

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(0)} className="flex-1 py-4 rounded-xl font-bold text-gray-500 text-sm border border-gray-200 bg-white">← Voltar</button>
            <button
              onClick={() => setStep(2)}
              disabled={!resolvedCoords}
              className="flex-[2] py-4 rounded-xl font-bold text-white text-sm disabled:opacity-40"
              style={{ background: '#15803d' }}
            >
              Próximo → Fotos e descrição
            </button>
          </div>
        </div>
      )}

      {/* ── PASSO 2 — Fotos e descrição ─────────────────── */}
      {step === 2 && (
        <div>
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🤩</div>
            <h1 className="text-2xl font-bold text-gray-900">Convence a galera!</h1>
            <p className="text-gray-500 mt-1 text-sm">Fotos e uma boa descrição fazem o lugar ganhar vida</p>
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Fotos <span className="text-gray-400 font-normal">(até {MAX_PHOTOS} · opcional)</span>
                <span className="ml-2 text-xs text-green-600 font-normal">{photos.length}/{MAX_PHOTOS}</span>
              </label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              <div className="grid grid-cols-3 gap-2">
                {previews.map((src, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                    <Image src={src} alt={`Foto ${idx + 1}`} fill className="object-cover" />
                    {uploadingIdx === idx && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                        <div className="w-3/4 h-1.5 bg-white/30 rounded-full overflow-hidden">
                          <div className="h-full bg-green-400 transition-all" style={{ width: `${uploadProgress}%` }} />
                        </div>
                        <span className="text-white text-xs mt-1">{uploadProgress}%</span>
                      </div>
                    )}
                    {uploadingIdx !== idx && (
                      <button type="button" onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">✕</button>
                    )}
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && uploadingIdx === null && (
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-green-300 hover:text-green-600 transition-colors">
                    <span className="text-2xl">📷</span>
                    <span className="text-xs font-medium">Adicionar</span>
                  </button>
                )}
              </div>
            </div>

            {isDestino && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Vídeo do YouTube <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  value={form.videoUrl}
                  onChange={(e) => update('videoUrl', e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500"
                />
                {videoId && (
                  <div className="mt-2 rounded-xl overflow-hidden aspect-video">
                    <iframe src={`https://www.youtube.com/embed/${videoId}`} className="w-full h-full" allowFullScreen title="Preview" />
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Descrição *
                <span className={`ml-2 text-xs font-normal ${form.description.length >= minDesc ? 'text-green-500' : 'text-gray-400'}`}>
                  {form.description.length >= minDesc ? '✓ Ótimo!' : `${form.description.length}/${minDesc} mín.`}
                </span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                rows={4}
                placeholder={isComer ? 'O que tem de especial? Qual o prato que não pode faltar?' : isHospedar ? 'Como é a hospedagem? O que tem de especial?' : 'O que tem de especial? Vale o rolê? Como é o acesso?'}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button onClick={() => setStep(1)} className="flex-1 py-4 rounded-xl font-bold text-gray-500 text-sm border border-gray-200 bg-white">← Voltar</button>
            <button
              onClick={() => plan === 'paid' ? setStep(3) : handleSubmit()}
              disabled={form.description.length < minDesc || uploadingIdx !== null || status === 'sending'}
              className="flex-[2] py-4 rounded-xl font-bold text-white text-sm disabled:opacity-40"
              style={{ background: '#15803d' }}
            >
              {plan === 'paid' ? 'Próximo → Contato' : status === 'sending' ? 'Enviando...' : '🙌 Enviar sugestão!'}
            </button>
          </div>
          {status === 'error' && <p className="text-red-500 text-sm text-center mt-3">Deu ruim no envio. Tenta de novo!</p>}
        </div>
      )}

      {/* ── PASSO 3 — Contato (só destaque pago) ──────── */}
      {step === 3 && plan === 'paid' && (
        <div>
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">📞</div>
            <h1 className="text-2xl font-bold text-gray-900">Seu contato</h1>
            <p className="text-gray-500 mt-1 text-sm">Para finalizar o destaque, nossa equipe vai entrar em contato</p>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome *</label>
              <input
                value={form.contactName}
                onChange={(e) => update('contactName', e.target.value)}
                placeholder="Seu nome completo"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">E-mail *</label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => update('contactEmail', e.target.value)}
                placeholder="seu@email.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">WhatsApp <span className="text-gray-400 font-normal">(opcional)</span></label>
              <input
                type="tel"
                value={form.contactPhone}
                onChange={(e) => update('contactPhone', e.target.value)}
                placeholder="(48) 99999-9999"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button onClick={() => setStep(2)} className="flex-1 py-4 rounded-xl font-bold text-gray-500 text-sm border border-gray-200 bg-white">← Voltar</button>
            <button
              onClick={handleSubmit}
              disabled={!form.contactName.trim() || !form.contactEmail.trim() || status === 'sending'}
              className="flex-[2] py-4 rounded-xl font-bold text-white text-sm disabled:opacity-40 bg-gradient-to-r from-orange-500 to-orange-400"
            >
              {status === 'sending' ? 'Enviando...' : '⭐ Solicitar destaque!'}
            </button>
          </div>
          {status === 'error' && <p className="text-red-500 text-sm text-center mt-3">Deu ruim no envio. Tenta de novo!</p>}
        </div>
      )}
    </div>
  )
}

export default function SugerirPage() {
  return <Suspense><SugerirContent /></Suspense>
}
