'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { addAdvertiserRequest, type AdType } from '@/lib/firestore'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { useAuth } from '@/lib/auth-context'
import { EVENT_CATEGORY_LABELS, EAT_CATEGORY_LABELS, STAY_CATEGORY_LABELS } from '@/types'

type AdTab = AdType

interface CityPrediction {
  place_id: string
  description: string
  cityName: string
  stateCode: string
}

const TABS: { id: AdTab; emoji: string; label: string; color: string; gradient: string; desc: string }[] = [
  { id: 'evento',   emoji: '🎭', label: 'Evento',       color: 'purple', gradient: 'from-purple-500 to-purple-700', desc: 'Shows, festivais, feiras e eventos' },
  { id: 'comer',    emoji: '🍽️', label: 'Restaurante',  color: 'orange', gradient: 'from-orange-400 to-orange-600', desc: 'Restaurantes, bares, cafés e mais' },
  { id: 'hospedar', emoji: '🏡', label: 'Hospedagem',   color: 'green',  gradient: 'from-green-500 to-green-700',  desc: 'Pousadas, hotéis, camping e chalés' },
]

const TAB_RING: Record<AdTab, string> = {
  evento:   'ring-purple-400 bg-purple-50',
  comer:    'ring-orange-400 bg-orange-50',
  hospedar: 'ring-green-400  bg-green-50',
}
const BTN_COLOR: Record<AdTab, string> = {
  evento:   'bg-purple-600 hover:bg-purple-700',
  comer:    'bg-orange-500 hover:bg-orange-600',
  hospedar: 'bg-green-600  hover:bg-green-700',
}
const TAB_CIRCLE: Record<AdTab, string> = {
  evento:   'border-purple-500 bg-purple-500',
  comer:    'border-orange-500 bg-orange-500',
  hospedar: 'border-green-500 bg-green-500',
}

const DESC_PLACEHOLDER: Record<AdTab, string> = {
  evento:   'O que é o evento? Quem vai se apresentar? O que a galera vai encontrar lá? Por que não pode perder?',
  comer:    'Qual é o estilo do lugar? Qual o prato que não pode faltar? O que torna esse lugar especial?',
  hospedar: 'Como é a hospedagem? Quais as comodidades? O que tem de especial para quem visita a região?',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 bg-white'
const selectCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 bg-white'

export default function AnunciarPage() {
  return <Suspense><AnunciarContent /></Suspense>
}

function AnunciarContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const tipoParam = searchParams.get('tipo') as AdTab | null
  const [tab, setTab] = useState<AdTab>(tipoParam && ['evento', 'comer', 'hospedar'].includes(tipoParam) ? tipoParam : 'evento')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  // cidade autocomplete
  const [cityInput, setCityInput] = useState('')
  const [cityPredictions, setCityPredictions] = useState<CityPrediction[]>([])
  const [citySelected, setCitySelected] = useState(false)
  const cityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // campos comuns
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  // coords resolvidas do Maps link
  const [resolvedCoords, setResolvedCoords] = useState<{ lat: number; lng: number } | 'error' | null>(null)

  // evento
  const [eventMapsLink, setEventMapsLink] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [price, setPrice] = useState('')
  const [ticketUrl, setTicketUrl] = useState('')
  // folder / flyer do evento
  const [photo, setPhoto] = useState('')
  const [photoPreview, setPhotoPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  // comer
  const [priceRange, setPriceRange] = useState('💲💲')
  const [mapsLink, setMapsLink] = useState('')
  const [socialLink, setSocialLink] = useState('')
  const [comerPhotos, setComerPhotos] = useState<string[]>([])
  const [comerPreviews, setComerPreviews] = useState<string[]>([])
  const [comerUploadingIdx, setComerUploadingIdx] = useState<number | null>(null)
  const [comerUploadProgress, setComerUploadProgress] = useState(0)
  const comerFileRef = useRef<HTMLInputElement>(null)
  // location mode (compartilhado entre tabs, resetado no resetForm)
  const [locMode, setLocMode] = useState<'link' | 'coords' | 'pluscode'>('link')
  const [coordsInput, setCoordsInput] = useState('')
  const [plusCodeInput, setPlusCodeInput] = useState('')
  const [plusCodeError, setPlusCodeError] = useState('')
  const [coordsResolved, setCoordsResolved] = useState(false)
  const [locResolving, setLocResolving] = useState(false)

  // hospedar
  const [priceFrom, setPriceFrom] = useState('')
  const [bookingUrl, setBookingUrl] = useState('')
  const [hospedarSocialLink, setHospedarSocialLink] = useState('')
  const [hospedarPhotos, setHospedarPhotos] = useState<string[]>([])
  const [hospedarPreviews, setHospedarPreviews] = useState<string[]>([])
  const [hospedarUploadingIdx, setHospedarUploadingIdx] = useState<number | null>(null)
  const [hospedarUploadProgress, setHospedarUploadProgress] = useState(0)
  const hospedarFileRef = useRef<HTMLInputElement>(null)

  // resolve coords do Maps link ativo
  const activeMapsLink = tab === 'evento' ? eventMapsLink : mapsLink
  useEffect(() => {
    setResolvedCoords(null)
    if (!activeMapsLink || !activeMapsLink.includes('maps')) return
    const timer = setTimeout(() => {
      fetch(`/api/resolve-maps?url=${encodeURIComponent(activeMapsLink)}`)
        .then((r) => r.json())
        .then((data) => setResolvedCoords(data.lat && data.lng ? { lat: data.lat, lng: data.lng } : 'error'))
        .catch(() => setResolvedCoords('error'))
    }, 800)
    return () => clearTimeout(timer)
  }, [activeMapsLink])

  // autocomplete cidade
  useEffect(() => {
    if (cityInput.length < 3 || citySelected) { setCityPredictions([]); return }
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current)
    cityDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(cityInput)}`)
        const data = await res.json()
        setCityPredictions(data.predictions || [])
      } catch {
        setCityPredictions([])
      }
    }, 400)
  }, [cityInput, citySelected])

  function selectCity(p: CityPrediction) {
    setCityInput(p.description)
    setCity(p.cityName || p.description)
    setState(p.stateCode)
    setCityPredictions([])
    setCitySelected(true)
  }

  function parseCoords(input: string): { lat: number; lng: number } | null {
    const match = input.trim().match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/)
    if (!match) return null
    const lat = parseFloat(match[1])
    const lng = parseFloat(match[2])
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
    return { lat, lng }
  }

  function applyCoords(coords: { lat: number; lng: number }) {
    const url = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
    if (tab === 'evento') setEventMapsLink(url)
    else setMapsLink(url)
    setCoordsResolved(true)
  }

  async function resolvePlusCode(code: string) {
    if (!code.trim()) return
    setLocResolving(true)
    setPlusCodeError('')
    setCoordsResolved(false)
    try {
      const res = await fetch(`/api/resolve-pluscode?code=${encodeURIComponent(code.trim())}`)
      const d = await res.json()
      if (d.lat && d.lng) applyCoords({ lat: d.lat, lng: d.lng })
      else setPlusCodeError('Plus Code inválido ou não encontrado.')
    } catch {
      setPlusCodeError('Erro ao resolver o Plus Code.')
    } finally {
      setLocResolving(false)
    }
  }

  function resetForm() {
    setName(''); setCity(''); setState(''); setDescription(''); setCategory('')
    setContactName(''); setContactEmail(''); setContactPhone('')
    setCityInput(''); setCitySelected(false); setCityPredictions([])
    setResolvedCoords(null)
    setLocMode('link'); setCoordsInput(''); setPlusCodeInput(''); setPlusCodeError(''); setCoordsResolved(false)
    setEventMapsLink(''); setDate(''); setTime(''); setEndDate(''); setEndTime(''); setPrice(''); setTicketUrl('')
    setPhoto(''); setPhotoPreview('')
    if (fileRef.current) fileRef.current.value = ''
    setPriceRange('💲💲'); setMapsLink(''); setSocialLink('')
    setComerPhotos([]); setComerPreviews([])
    if (comerFileRef.current) comerFileRef.current.value = ''
    setPriceFrom(''); setBookingUrl(''); setHospedarSocialLink('')
    setHospedarPhotos([]); setHospedarPreviews([])
    if (hospedarFileRef.current) hospedarFileRef.current.value = ''
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Foto muito grande! Máximo 5 MB.'); return }
    setPhotoPreview(URL.createObjectURL(file))
    setUploading(true)
    setUploadProgress(0)
    try {
      const url = await uploadToCloudinary(file, setUploadProgress)
      setPhoto(url)
    } catch {
      setPhotoPreview('')
      alert('Erro no upload. Tenta novamente!')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  async function handleComerPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || comerPhotos.length >= 3) return
    const idx = comerPreviews.length
    setComerPreviews((p) => [...p, URL.createObjectURL(file)])
    setComerUploadingIdx(idx)
    setComerUploadProgress(0)
    try {
      const url = await uploadToCloudinary(file, setComerUploadProgress)
      setComerPhotos((p) => [...p, url])
    } catch {
      setComerPreviews((p) => p.filter((_, i) => i !== idx))
      alert('Erro no upload. Tenta novamente!')
    } finally {
      setComerUploadingIdx(null)
      setComerUploadProgress(0)
      if (comerFileRef.current) comerFileRef.current.value = ''
    }
  }

  function removeComerPhoto(idx: number) {
    setComerPhotos((p) => p.filter((_, i) => i !== idx))
    setComerPreviews((p) => p.filter((_, i) => i !== idx))
  }

  async function handleHospedarPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || hospedarPhotos.length >= 3) return
    const idx = hospedarPreviews.length
    setHospedarPreviews((p) => [...p, URL.createObjectURL(file)])
    setHospedarUploadingIdx(idx)
    setHospedarUploadProgress(0)
    try {
      const url = await uploadToCloudinary(file, setHospedarUploadProgress)
      setHospedarPhotos((p) => [...p, url])
    } catch {
      setHospedarPreviews((p) => p.filter((_, i) => i !== idx))
      alert('Erro no upload. Tenta novamente!')
    } finally {
      setHospedarUploadingIdx(null)
      setHospedarUploadProgress(0)
      if (hospedarFileRef.current) hospedarFileRef.current.value = ''
    }
  }

  function removeHospedarPhoto(idx: number) {
    setHospedarPhotos((p) => p.filter((_, i) => i !== idx))
    setHospedarPreviews((p) => p.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !city || !state || !description || !contactName || !contactEmail) return
    if (tab === 'evento' && (!eventMapsLink || !date || !time || !endDate || !endTime || !price)) return
    if (tab === 'comer' && !mapsLink) return
    if (tab === 'hospedar' && !mapsLink) return
    setSending(true)
    try {
      await addAdvertiserRequest({
        type: tab,
        name, city, state, description,
        category: category || (tab === 'evento' ? 'cultural' : tab === 'comer' ? 'restaurante' : 'pousada'),
        contactName, contactEmail,
        contactPhone: contactPhone || undefined,
        userId: user!.uid,
        ...(tab === 'evento' ? {
          mapsLink: eventMapsLink,
          date: date || undefined,
          time: time || undefined,
          endDate: endDate || undefined,
          endTime: endTime || undefined,
          price: price || undefined,
          ticketUrl: ticketUrl || undefined,
          photoUrl: photo || undefined,
          ...(resolvedCoords && resolvedCoords !== 'error' ? { lat: resolvedCoords.lat, lng: resolvedCoords.lng } : {}),
        } : {}),
        ...(tab === 'comer'  ? {
          priceRange,
          mapsLink: mapsLink || undefined,
          socialLink: socialLink || undefined,
          photos: comerPhotos.length ? comerPhotos : undefined,
          ...(resolvedCoords && resolvedCoords !== 'error' ? { lat: resolvedCoords.lat, lng: resolvedCoords.lng } : {}),
        } : {}),
        ...(tab === 'hospedar' ? {
          priceFrom: priceFrom ? Number(priceFrom) : undefined,
          bookingUrl: bookingUrl || undefined,
          mapsLink: mapsLink || undefined,
          socialLink: hospedarSocialLink || undefined,
          photos: hospedarPhotos.length ? hospedarPhotos : undefined,
          ...(resolvedCoords && resolvedCoords !== 'error' ? { lat: resolvedCoords.lat, lng: resolvedCoords.lng } : {}),
        } : {}),
      })
      setSent(true)
      resetForm()
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center fade-in">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Recebemos seu pedido!</h2>
        <p className="text-gray-500 text-sm mb-6">Nossa equipe vai revisar e entrar em contato em breve pelo e-mail informado.</p>
        <div className="flex flex-col gap-3">
          <button onClick={() => setSent(false)} className={`w-full py-3.5 rounded-xl font-bold text-white text-sm ${BTN_COLOR[tab]}`}>Enviar outro anúncio</button>
          <button onClick={() => router.back()} className="text-sm text-gray-400">← Voltar</button>
        </div>
      </div>
    )
  }

  function getMapsSearchUrl() {
    const q = [name, city].filter(Boolean).join(' ')
    return q ? `https://www.google.com/maps/search/${encodeURIComponent(q)}` : 'https://maps.google.com'
  }

  const activeMapsLinkValue = tab === 'evento' ? eventMapsLink : mapsLink
  function activeSetMapsLink(v: string) { if (tab === 'evento') setEventMapsLink(v); else setMapsLink(v) }
  const tabActiveClass = tab === 'evento' ? 'bg-purple-600 text-white' : tab === 'comer' ? 'bg-orange-500 text-white' : 'bg-green-600 text-white'
  const focusBorderClass = tab === 'evento' ? 'focus:border-purple-400' : tab === 'comer' ? 'focus:border-orange-400' : 'focus:border-green-400'
  const successTextClass = tab === 'evento' ? 'text-purple-600' : tab === 'comer' ? 'text-orange-500' : 'text-green-600'

  const locationPicker = (
    <div>
      <div className="flex justify-end mb-2">
        <a href={getMapsSearchUrl()} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-semibold text-white px-2.5 py-1.5 rounded-lg transition-colors"
          style={{ background: tab === 'evento' ? '#7c3aed' : tab === 'comer' ? '#f97316' : '#16a34a' }}>
          🗺️ Abrir Maps
        </a>
      </div>
      <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-3">
        {([['link', '🔗 Link Maps'], ['coords', '🌐 Coordenadas'], ['pluscode', '📍 Plus Code']] as const).map(([mode, label]) => (
          <button key={mode} type="button"
            onClick={() => { setLocMode(mode); activeSetMapsLink(''); setCoordsInput(''); setPlusCodeInput(''); setPlusCodeError(''); setCoordsResolved(false) }}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${locMode === mode ? tabActiveClass : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {locMode === 'link' && (
        <>
          <input type="url" value={activeMapsLinkValue} onChange={(e) => activeSetMapsLink(e.target.value)}
            placeholder="https://maps.google.com/..."
            className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none ${focusBorderClass} bg-white`} />
          {resolvedCoords === 'error' && <p className="text-xs text-amber-600 mt-0.5">⚠️ Não foi possível extrair a localização exata — tente copiar o link direto do Maps</p>}
          {resolvedCoords && resolvedCoords !== 'error' && <p className={`text-xs ${successTextClass} mt-0.5`}>📍 Localização detectada! ({resolvedCoords.lat.toFixed(5)}, {resolvedCoords.lng.toFixed(5)})</p>}
          {!resolvedCoords && activeMapsLinkValue?.includes('maps') && <p className="text-xs text-gray-400 mt-0.5">🔍 Verificando localização...</p>}
          {!activeMapsLinkValue?.includes('maps') && <p className="text-xs text-gray-400 mt-0.5">Abra o Maps, encontre o local e cole o link aqui</p>}
        </>
      )}

      {locMode === 'coords' && (
        <>
          <input value={coordsInput} onChange={(e) => {
              setCoordsInput(e.target.value)
              const p = parseCoords(e.target.value)
              if (p) { activeSetMapsLink(`https://www.google.com/maps?q=${p.lat},${p.lng}`); setCoordsResolved(true) }
              else { activeSetMapsLink(''); setCoordsResolved(false) }
            }}
            placeholder="-27.1234, -48.5678"
            className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none ${focusBorderClass} bg-white font-mono`} />
          {coordsInput && !coordsResolved && <p className="text-xs text-red-400 mt-0.5">Formato inválido. Ex: -27.1234, -48.5678</p>}
          {coordsResolved && <p className={`text-xs ${successTextClass} font-medium mt-0.5`}>📍 Localização detectada!</p>}
          <p className="text-xs text-gray-400 mt-0.5">No Maps, toque e segure em qualquer ponto para ver as coordenadas no topo da tela.</p>
        </>
      )}

      {locMode === 'pluscode' && (
        <>
          <div className="flex gap-2">
            <input value={plusCodeInput}
              onChange={(e) => { setPlusCodeInput(e.target.value); setPlusCodeError(''); setCoordsResolved(false) }}
              onKeyDown={(e) => e.key === 'Enter' && resolvePlusCode(plusCodeInput)}
              placeholder="Ex: 7RXJ+GH São Paulo"
              className={`flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none ${focusBorderClass} bg-white font-mono`} />
            <button type="button" onClick={() => resolvePlusCode(plusCodeInput)}
              disabled={!plusCodeInput.trim() || locResolving}
              className={`px-4 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-40 whitespace-nowrap ${tab === 'evento' ? 'bg-purple-600' : tab === 'comer' ? 'bg-orange-500' : 'bg-green-600'}`}>
              {locResolving ? '...' : 'Buscar'}
            </button>
          </div>
          {plusCodeError && <p className="text-xs text-red-400 mt-0.5">{plusCodeError}</p>}
          {coordsResolved && <p className={`text-xs ${successTextClass} font-medium mt-0.5`}>📍 Localização detectada!</p>}
          <p className="text-xs text-gray-400 mt-0.5">No Maps, toque sobre o lugar — o Plus Code aparece na parte de baixo da tela.</p>
        </>
      )}
    </div>
  )

  const t = TABS.find((t) => t.id === tab)!
  const cityReady     = citySelected && !!city && !!state
  const eventoReady   = tab !== 'evento'   || (!!eventMapsLink && !!date && !!time && !!endDate && !!endTime && !!price && !!photo)
  const comerReady    = tab !== 'comer'    || !!mapsLink
  const hospedarReady = tab !== 'hospedar' || !!mapsLink
  const anyUploading  = uploading || comerUploadingIdx !== null || hospedarUploadingIdx !== null

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <button onClick={() => router.back()} className="text-sm text-gray-400 mb-5 inline-block">← Voltar</button>

      <div className="text-center mb-6">
        <div className="text-5xl mb-2">📣</div>
        <h1 className="text-2xl font-bold text-gray-900">Anuncie no LetsApp</h1>
        <p className="text-gray-500 text-sm mt-1">Apareça para milhares de viajantes que buscam destinos incríveis</p>
      </div>

      {/* Tipo fixo quando vem via ?tipo= */}
      {tipoParam && (() => {
        const t = TABS.find((x) => x.id === tipoParam)!
        return (
          <div className={`card overflow-hidden mb-6`}>
            <div className={`h-1.5 bg-gradient-to-r ${t.gradient}`} />
            <div className="px-4 py-3 flex items-center gap-4">
              <span className="text-3xl">{t.emoji}</span>
              <div>
                <p className="font-bold text-gray-900">{t.label}</p>
                <p className="text-xs text-gray-500">{t.desc}</p>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Seletor de tipo — oculto quando vem com ?tipo= da página de perfil */}
      {!tipoParam && <div className="flex flex-col gap-3 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); resetForm() }}
            className={`card overflow-hidden text-left transition-all ${tab === t.id ? `ring-2 ${TAB_RING[t.id]}` : 'opacity-70 hover:opacity-100'}`}
          >
            <div className={`h-1.5 bg-gradient-to-r ${t.gradient}`} />
            <div className="px-4 py-3 flex items-center gap-4">
              <span className="text-3xl">{t.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900">{t.label}</p>
                <p className="text-xs text-gray-500">{t.desc}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                tab === t.id ? TAB_CIRCLE[t.id] : 'border-gray-300'
              }`}>
                {tab === t.id && <span className="text-white text-xs">✓</span>}
              </div>
            </div>
          </button>
        ))}
      </div>}

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 fade-in" key={tab}>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Dados do negócio</p>

        <Field label="Nome *">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={`Nome do ${t.label.toLowerCase()}`} className={inputCls} />
        </Field>

        {/* Cidade com autocomplete */}
        <Field label="Cidade *">
          <div className="relative">
            <input
              required
              value={cityInput}
              onChange={(e) => { setCityInput(e.target.value); setCitySelected(false); setCity(''); setState('') }}
              placeholder="Digite a cidade..."
              className={inputCls}
              autoComplete="off"
            />
            {cityPredictions.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {cityPredictions.map((p) => (
                  <button
                    key={p.place_id}
                    type="button"
                    onClick={() => selectCity(p)}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-purple-50 border-b border-gray-50 last:border-0 transition-colors"
                  >
                    📍 {p.description}
                  </button>
                ))}
              </div>
            )}
          </div>
          {citySelected && state && (
            <p className="text-xs text-purple-600 font-medium mt-0.5">
              ✓ {city} — {state}
              <button type="button" onClick={() => { setCityInput(''); setCitySelected(false); setCity(''); setState('') }} className="ml-2 text-gray-400 hover:text-red-400">
                trocar
              </button>
            </p>
          )}
        </Field>

        {/* Categoria */}
        {tab === 'evento' && (
          <Field label="Categoria *">
            <select required value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
              <option value="">Selecione...</option>
              {Object.entries(EVENT_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        )}
        {tab === 'comer' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
                {Object.entries(EAT_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Faixa de preço">
              <select value={priceRange} onChange={(e) => setPriceRange(e.target.value)} className={selectCls}>
                <option value="💲">💲 Econômico</option>
                <option value="💲💲">💲💲 Moderado</option>
                <option value="💲💲💲">💲💲💲 Premium</option>
              </select>
            </Field>
          </div>
        )}
        {tab === 'hospedar' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
                {Object.entries(STAY_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Diária a partir de (R$)">
              <input type="number" value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} placeholder="Ex: 250" className={inputCls} />
            </Field>
          </div>
        )}

        <Field label="Descrição *">
          <textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder={DESC_PLACEHOLDER[tab]} className={inputCls + ' resize-none'} />
        </Field>

        {/* Campos específicos por tipo */}
        {tab === 'evento' && (
          <>
            <Field label="Localização *">
              {locationPicker}
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Data de início *">
                <input
                  required
                  type="date"
                  value={date}
                  onChange={(e) => { setDate(e.target.value); if (endDate && e.target.value > endDate) { setEndDate(''); setEndTime('') } }}
                  min={new Date().toISOString().split('T')[0]}
                  className={inputCls}
                />
              </Field>
              <Field label="Horário de início *">
                <input
                  required
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data de fim *">
                <input
                  required
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={date || new Date().toISOString().split('T')[0]}
                  className={inputCls}
                />
              </Field>
              <Field label="Horário de fim *">
                <input
                  required
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Preço do ingresso *">
              <input
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Ex: R$ 80 / Grátis"
                className={inputCls}
              />
            </Field>

            <Field label="Link de ingressos (opcional)">
              <input type="url" value={ticketUrl} onChange={(e) => setTicketUrl(e.target.value)} placeholder="https://sympla.com.br/..." className={inputCls} />
            </Field>

            {/* Folder / flyer */}
            <Field label="Imagem do evento (folder / cartaz) *">
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              {photoPreview ? (
                <div className="relative rounded-xl overflow-hidden aspect-video bg-gray-100">
                  <img src={photoPreview} alt="Preview do folder" className="w-full h-full object-cover" />
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                      <div className="w-3/4 h-1.5 bg-white/30 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-400 transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <span className="text-white text-xs mt-1">{uploadProgress}%</span>
                    </div>
                  )}
                  {!uploading && (
                    <button
                      type="button"
                      onClick={() => { setPhoto(''); setPhotoPreview(''); if (fileRef.current) fileRef.current.value = '' }}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">
                      ✕
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-purple-300 hover:text-purple-400 transition-colors">
                  <span className="text-3xl">🖼️</span>
                  <span className="text-sm font-medium">Adicionar folder / cartaz</span>
                  <span className="text-xs">Flyer, banner ou foto do evento</span>
                </button>
              )}
            </Field>
          </>
        )}

        {tab === 'comer' && (
          <>
            <Field label="Localização *">
              {locationPicker}
            </Field>

            <Field label="Rede social (opcional)">
              <input
                type="url"
                value={socialLink}
                onChange={(e) => setSocialLink(e.target.value)}
                placeholder="https://instagram.com/seurestaurante"
                className={inputCls}
              />
            </Field>

            {/* Fotos do local */}
            <Field label={`Fotos do local ${comerPhotos.length}/3`}>
              <input ref={comerFileRef} type="file" accept="image/*" onChange={handleComerPhoto} className="hidden" />
              <div className="grid grid-cols-3 gap-2">
                {comerPreviews.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    {comerUploadingIdx === i && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                        <div className="w-3/4 h-1 bg-white/30 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-400 transition-all" style={{ width: `${comerUploadProgress}%` }} />
                        </div>
                        <span className="text-white text-xs mt-1">{comerUploadProgress}%</span>
                      </div>
                    )}
                    {comerUploadingIdx !== i && (
                      <button
                        type="button"
                        onClick={() => removeComerPhoto(i)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {comerPhotos.length < 3 && (
                  <button
                    type="button"
                    onClick={() => comerFileRef.current?.click()}
                    disabled={comerUploadingIdx !== null}
                    className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-orange-300 hover:text-orange-400 transition-colors disabled:opacity-40">
                    <span className="text-2xl">📷</span>
                    <span className="text-xs font-medium">Adicionar</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400">Ambiente, pratos, fachada... até 3 fotos</p>
            </Field>
          </>
        )}
        {tab === 'hospedar' && (
          <>
            <Field label="Localização *">
              {locationPicker}
            </Field>

            <Field label="Link de reservas (opcional)">
              <input type="url" value={bookingUrl} onChange={(e) => setBookingUrl(e.target.value)} placeholder="https://booking.com/..." className={inputCls} />
            </Field>

            <Field label="Rede social (opcional)">
              <input
                type="url"
                value={hospedarSocialLink}
                onChange={(e) => setHospedarSocialLink(e.target.value)}
                placeholder="https://instagram.com/suahospedagem"
                className={inputCls}
              />
            </Field>

            {/* Fotos */}
            <Field label={`Fotos do local ${hospedarPhotos.length}/3`}>
              <input ref={hospedarFileRef} type="file" accept="image/*" onChange={handleHospedarPhoto} className="hidden" />
              <div className="grid grid-cols-3 gap-2">
                {hospedarPreviews.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    {hospedarUploadingIdx === i && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                        <div className="w-3/4 h-1 bg-white/30 rounded-full overflow-hidden">
                          <div className="h-full bg-green-400 transition-all" style={{ width: `${hospedarUploadProgress}%` }} />
                        </div>
                        <span className="text-white text-xs mt-1">{hospedarUploadProgress}%</span>
                      </div>
                    )}
                    {hospedarUploadingIdx !== i && (
                      <button
                        type="button"
                        onClick={() => removeHospedarPhoto(i)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {hospedarPhotos.length < 3 && (
                  <button
                    type="button"
                    onClick={() => hospedarFileRef.current?.click()}
                    disabled={hospedarUploadingIdx !== null}
                    className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-green-300 hover:text-green-500 transition-colors disabled:opacity-40">
                    <span className="text-2xl">📷</span>
                    <span className="text-xs font-medium">Adicionar</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400">Quartos, área comum, vista... até 3 fotos</p>
            </Field>
          </>
        )}

        {/* Contato */}
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Seu contato</p>
        <Field label="Seu nome *">
          <input required value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nome completo" className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="E-mail *">
            <input required type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="seu@email.com" className={inputCls} />
          </Field>
          <Field label="WhatsApp (opcional)">
            <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="(48) 99999-9999" className={inputCls} />
          </Field>
        </div>

        <button
          type="submit"
          disabled={sending || anyUploading || !cityReady || !eventoReady || !comerReady || !hospedarReady}
          className={`w-full py-3.5 rounded-xl font-bold text-white text-sm transition-colors disabled:opacity-60 ${BTN_COLOR[tab]}`}
        >
          {sending ? 'Enviando...' : anyUploading ? 'Aguardando upload...' : `${t.emoji} Solicitar espaço como ${t.label}`}
        </button>

        <p className="text-xs text-gray-400 text-center">Nossa equipe analisa e entra em contato em até 2 dias úteis.</p>
      </form>
    </div>
  )
}
