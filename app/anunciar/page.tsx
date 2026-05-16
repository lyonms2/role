'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { addAdvertiserRequest, type AdType } from '@/lib/firestore'
import { uploadToCloudinary } from '@/lib/cloudinary'
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
  const router = useRouter()
  const [tab, setTab] = useState<AdTab>('evento')
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

  // evento
  const [eventMapsLink, setEventMapsLink] = useState('')
  const [date, setDate] = useState('')
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
  // hospedar
  const [priceFrom, setPriceFrom] = useState('')
  const [bookingUrl, setBookingUrl] = useState('')

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

  function resetForm() {
    setName(''); setCity(''); setState(''); setDescription(''); setCategory('')
    setContactName(''); setContactEmail(''); setContactPhone('')
    setCityInput(''); setCitySelected(false); setCityPredictions([])
    setEventMapsLink(''); setDate(''); setPrice(''); setTicketUrl('')
    setPhoto(''); setPhotoPreview('')
    if (fileRef.current) fileRef.current.value = ''
    setPriceRange('💲💲'); setMapsLink(''); setSocialLink('')
    setComerPhotos([]); setComerPreviews([])
    if (comerFileRef.current) comerFileRef.current.value = ''
    setPriceFrom(''); setBookingUrl('')
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !city || !state || !description || !contactName || !contactEmail) return
    if (tab === 'evento' && (!eventMapsLink || !date || !price)) return
    if (tab === 'comer' && !mapsLink) return
    setSending(true)
    try {
      await addAdvertiserRequest({
        type: tab,
        name, city, state, description,
        category: category || (tab === 'evento' ? 'cultural' : tab === 'comer' ? 'restaurante' : 'pousada'),
        contactName, contactEmail,
        contactPhone: contactPhone || undefined,
        ...(tab === 'evento' ? {
          mapsLink: eventMapsLink,
          date: date || undefined,
          price: price || undefined,
          ticketUrl: ticketUrl || undefined,
          photoUrl: photo || undefined,
        } : {}),
        ...(tab === 'comer'  ? {
          priceRange,
          mapsLink: mapsLink || undefined,
          socialLink: socialLink || undefined,
          photos: comerPhotos.length ? comerPhotos : undefined,
        } : {}),
        ...(tab === 'hospedar' ? { priceFrom: priceFrom ? Number(priceFrom) : undefined, bookingUrl: bookingUrl || undefined, mapsLink: mapsLink || undefined } : {}),
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

  const t = TABS.find((t) => t.id === tab)!
  const eventoReady = tab !== 'evento' || (!!eventMapsLink && !!date && !!price)
  const comerReady  = tab !== 'comer'  || !!mapsLink
  const anyUploading = uploading || comerUploadingIdx !== null

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <button onClick={() => router.back()} className="text-sm text-gray-400 mb-5 inline-block">← Voltar</button>

      <div className="text-center mb-6">
        <div className="text-5xl mb-2">📣</div>
        <h1 className="text-2xl font-bold text-gray-900">Anuncie no Rolê</h1>
        <p className="text-gray-500 text-sm mt-1">Apareça para milhares de viajantes que buscam destinos incríveis</p>
      </div>

      {/* Seletor de tipo */}
      <div className="flex flex-col gap-3 mb-6">
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
      </div>

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
            <Field label="Link do Google Maps *">
              <input
                required
                type="url"
                value={eventMapsLink}
                onChange={(e) => setEventMapsLink(e.target.value)}
                placeholder="https://maps.google.com/..."
                className={inputCls}
              />
              <p className="text-xs text-gray-400 mt-0.5">Cole o link do Maps para o local do evento</p>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Data do evento *">
                <input
                  required
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={inputCls}
                />
              </Field>
              <Field label="Preço do ingresso *">
                <input
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Ex: R$ 80 / Grátis"
                  className={inputCls}
                />
              </Field>
            </div>

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
            <Field label="Link do Google Maps *">
              <input
                required
                type="url"
                value={mapsLink}
                onChange={(e) => setMapsLink(e.target.value)}
                placeholder="https://maps.google.com/..."
                className={inputCls}
              />
              <p className="text-xs text-gray-400 mt-0.5">Cole o link do Maps do seu restaurante</p>
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
          <Field label="Link Google Maps (opcional)">
            <input type="url" value={mapsLink} onChange={(e) => setMapsLink(e.target.value)} placeholder="https://maps.google.com/..." className={inputCls} />
          </Field>
        )}
        {tab === 'hospedar' && (
          <Field label="Link de reservas (opcional)">
            <input type="url" value={bookingUrl} onChange={(e) => setBookingUrl(e.target.value)} placeholder="https://booking.com/..." className={inputCls} />
          </Field>
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
          disabled={sending || anyUploading || !eventoReady || !comerReady}
          className={`w-full py-3.5 rounded-xl font-bold text-white text-sm mt-2 transition-colors disabled:opacity-60 ${BTN_COLOR[tab]}`}
        >
          {sending ? 'Enviando...' : anyUploading ? 'Aguardando upload...' : `${t.emoji} Solicitar espaço como ${t.label}`}
        </button>

        <p className="text-xs text-gray-400 text-center">Nossa equipe analisa e entra em contato em até 2 dias úteis.</p>
      </form>
    </div>
  )
}
