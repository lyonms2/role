'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { auth } from '@/lib/firebase'
import { addAdvertiserRequest } from '@/lib/firestore'
import { uploadToCloudinary } from '@/lib/cloudinary'
import type { EventCategory } from '@/types'
import { EVENT_CATEGORY_LABELS } from '@/types'

const CATEGORIES = Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[]

const ESTADOS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

type Plan = 'free' | 'paid'
type RecurrenceOpt = '' | 'weekly' | 'monthly_date' | 'monthly_weekday'

const ACCENT = '#9333ea'
const ACCENT_LIGHT = '#c4b5fd'

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`rounded-full transition-all ${
          i < current   ? 'w-6 h-2 bg-purple-600'
          : i === current ? 'w-8 h-2 bg-purple-600'
          : 'w-2 h-2 bg-gray-200'
        }`} />
      ))}
    </div>
  )
}

export default function SugerirEventoPage() {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [step, setStep] = useState(0)

  const [name, setName]           = useState('')
  const [city, setCity]           = useState('')
  const [state, setState]         = useState('SC')
  const [category, setCategory]   = useState<EventCategory | ''>('')

  const [date, setDate]           = useState('')
  const [time, setTime]           = useState('')
  const [recurrence, setRecurrence] = useState<RecurrenceOpt>('')
  const [endDate, setEndDate]     = useState('')
  const [endTime, setEndTime]     = useState('')

  const [venue, setVenue]         = useState('')
  const [locMode, setLocMode]     = useState<'link' | 'coords' | 'pluscode'>('link')
  const [mapsLink, setMapsLink]   = useState('')
  const [coordsInput, setCoordsInput]     = useState('')
  const [plusCodeInput, setPlusCodeInput] = useState('')
  const [plusCodeError, setPlusCodeError] = useState('')
  const [coordsResolved, setCoordsResolved] = useState(false)
  const [locResolving, setLocResolving]   = useState(false)

  const [price, setPrice]           = useState('')
  const [ticketUrl, setTicketUrl]   = useState('')
  const [description, setDescription] = useState('')
  const [photo, setPhoto]           = useState('')
  const [photoPreview, setPhotoPreview] = useState('')
  const [uploading, setUploading]   = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [contactName, setContactName]   = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const fileRef = useRef<HTMLInputElement>(null)

  const totalSteps = plan === 'paid' ? 4 : 3

  function parseCoords(input: string): { lat: number; lng: number } | null {
    const match = input.trim().match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/)
    if (!match) return null
    const lat = parseFloat(match[1])
    const lng = parseFloat(match[2])
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
    return { lat, lng }
  }

  async function resolvePlusCode(code: string) {
    if (!code.trim()) return
    setLocResolving(true); setPlusCodeError(''); setCoordsResolved(false)
    try {
      const res = await fetch(`/api/resolve-pluscode?code=${encodeURIComponent(code.trim())}`)
      const d = await res.json()
      if (d.lat && d.lng) { setMapsLink(`https://www.google.com/maps?q=${d.lat},${d.lng}`); setCoordsResolved(true) }
      else setPlusCodeError('Plus Code inválido ou não encontrado.')
    } catch { setPlusCodeError('Erro ao resolver o Plus Code.') }
    finally { setLocResolving(false) }
  }

  function resetLocMode(mode: 'link' | 'coords' | 'pluscode') {
    setLocMode(mode); setMapsLink(''); setCoordsInput(''); setPlusCodeInput(''); setPlusCodeError(''); setCoordsResolved(false)
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Foto muito grande! Máximo 5 MB.'); return }
    setPhotoPreview(URL.createObjectURL(file)); setUploading(true); setUploadProgress(0)
    try { const url = await uploadToCloudinary(file, setUploadProgress); setPhoto(url) }
    catch { setPhotoPreview(''); alert('Deu ruim no upload. Tenta de novo!') }
    finally { setUploading(false); setUploadProgress(0) }
  }

  async function handleSubmit() {
    if (description.length < 30) { alert('Conta mais sobre o evento! Mínimo 30 caracteres.'); return }
    setStatus('sending')
    try {
      const user = auth.currentUser
      await addAdvertiserRequest({
        type: 'evento',
        name, city, state, description,
        category,
        venue: venue || undefined,
        date: date || undefined,
        time: time || undefined,
        endDate: recurrence ? undefined : (endDate || undefined),
        endTime: recurrence ? undefined : (endTime || undefined),
        recurrence: recurrence || undefined,
        price: price || undefined,
        ticketUrl: ticketUrl || undefined,
        mapsLink: mapsLink || undefined,
        photoUrl: photo || undefined,
        contactName: plan === 'paid' ? contactName : 'Sugestão gratuita',
        contactEmail: plan === 'paid' ? contactEmail : '',
        contactPhone: plan === 'paid' ? (contactPhone || undefined) : undefined,
        userId: user?.uid,
      })
      setStatus('success')
    } catch { setStatus('error') }
  }

  function reset() {
    setPlan(null); setStep(0)
    setName(''); setCity(''); setState('SC'); setCategory('')
    setDate(''); setTime(''); setRecurrence(''); setEndDate(''); setEndTime('')
    setVenue(''); setMapsLink(''); setCoordsInput(''); setPlusCodeInput('')
    setPlusCodeError(''); setCoordsResolved(false); setLocMode('link')
    setPrice(''); setTicketUrl(''); setDescription('')
    setPhoto(''); setPhotoPreview('')
    setContactName(''); setContactEmail(''); setContactPhone('')
    setStatus('idle')
  }

  if (status === 'success') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-7xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {plan === 'paid' ? 'Pedido enviado!' : 'Evento indicado!'}
        </h2>
        <p className="text-gray-500 mb-6">
          {plan === 'paid'
            ? 'Nossa equipe vai analisar e entrar em contato. Obrigado pelo interesse!'
            : 'A gente analisa e publica em breve. Valeu por divulgar o rolê da sua região!'}
        </p>
        <div className="flex flex-col gap-3">
          <button onClick={reset} className="w-full py-4 rounded-xl font-bold text-white text-sm" style={{ background: ACCENT }}>
            Indicar outro evento
          </button>
          <Link href="/eventos" className="text-sm text-gray-400 text-center block">← Ver eventos</Link>
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <Link href="/eventos" className="text-sm text-gray-400 mb-6 inline-block">← Eventos</Link>
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎭</div>
          <h1 className="text-2xl font-bold text-gray-900">Divulgar um evento</h1>
          <p className="text-gray-500 mt-1 text-sm">Como você quer aparecer no LetsApp?</p>
        </div>
        <div className="flex flex-col gap-3">
          <button onClick={() => { setPlan('free'); setStep(0) }}
            className="w-full rounded-2xl border-2 border-purple-100 bg-purple-50 p-5 text-left hover:border-purple-300 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">📢</span>
              <div>
                <p className="font-bold text-gray-900">Sugestão gratuita</p>
                <p className="text-xs text-purple-600 font-semibold">Sempre grátis</p>
              </div>
            </div>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>✓ Aparece na listagem de eventos</li>
              <li>✓ Revisado e publicado pela equipe</li>
              <li>✓ Recebe avaliações da comunidade</li>
            </ul>
          </button>

          <button onClick={() => { setPlan('paid'); setStep(0) }}
            className="w-full rounded-2xl border-2 border-purple-400 bg-white p-5 text-left hover:bg-purple-50 transition-colors relative overflow-hidden">
            <div className="absolute top-3 right-3 bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">Destaque</div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">⭐</span>
              <div>
                <p className="font-bold text-gray-900">Evento em destaque</p>
                <p className="text-xs text-purple-600 font-semibold">Entre em contato para valores</p>
              </div>
            </div>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>✓ Posição privilegiada na listagem</li>
              <li>✓ Aparece na tela inicial de descoberta</li>
              <li>✓ Suporte da equipe para divulgação</li>
              <li>✓ Folder/flyer em destaque</li>
            </ul>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link href="/eventos" className="text-sm text-gray-400 mb-6 inline-block">← Eventos</Link>
      <StepDots current={step} total={totalSteps} />

      {/* PASSO 0 — O que é o evento? */}
      {step === 0 && (
        <div>
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🎭</div>
            <h1 className="text-2xl font-bold text-gray-900">O que é o evento?</h1>
            <p className="text-gray-500 mt-1 text-sm">Conta o básico pra gente começar</p>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de evento *</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button key={cat} type="button" onClick={() => setCategory(cat)}
                    className={`py-3 px-4 rounded-xl text-sm font-medium border transition-all text-left ${
                      category === cat ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-200'
                    }`}>
                    {EVENT_CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome do evento *</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Festival de Inverno de Urubici"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cidade *</label>
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex: Urubici"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400" />
              </div>
              <div className="w-24">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estado *</label>
                <select value={state} onChange={(e) => setState(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-purple-400 bg-white">
                  {ESTADOS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
          <button onClick={() => setStep(1)} disabled={!category || !name.trim() || !city.trim()}
            className="w-full mt-8 py-4 rounded-xl font-bold text-white text-sm transition-all"
            style={{ background: (!category || !name.trim() || !city.trim()) ? ACCENT_LIGHT : ACCENT }}>
            Próximo → Quando acontece
          </button>
        </div>
      )}

      {/* PASSO 1 — Quando e onde? */}
      {step === 1 && (
        <div>
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">📅</div>
            <h1 className="text-2xl font-bold text-gray-900">Quando e onde?</h1>
            <p className="text-purple-600 font-semibold text-sm mt-1">{name}</p>
          </div>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data de início *</label>
                <input type="date" value={date}
                  onChange={(e) => { setDate(e.target.value); if (endDate && e.target.value > endDate) { setEndDate(''); setEndTime('') } }}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-purple-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Horário *</label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-purple-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Repetição</label>
              <div className="flex flex-wrap gap-2">
                {([
                  { value: '', label: 'Não se repete' },
                  { value: 'weekly', label: '🔁 Toda semana' },
                  { value: 'monthly_date', label: '📅 Todo mês, mesmo dia' },
                  { value: 'monthly_weekday', label: '📅 Mesmo dia da semana' },
                ] as const).map(({ value, label }) => (
                  <button key={value} type="button"
                    onClick={() => { setRecurrence(value as RecurrenceOpt); if (value) { setEndDate(''); setEndTime('') } }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${recurrence === value ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-500 border-gray-200 hover:border-purple-300'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {!recurrence && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data de fim *</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                    min={date || new Date().toISOString().split('T')[0]}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-purple-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Horário de fim *</label>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-purple-400" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Local / Venue</label>
              <input value={venue} onChange={(e) => setVenue(e.target.value)}
                placeholder="Ex: Parque da Maçã, Teatro Municipal"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700">Localização <span className="text-gray-400 font-normal">(opcional)</span></label>
                <a href={`https://www.google.com/maps/search/${encodeURIComponent(`${name} ${city} Brasil`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 px-2.5 py-1.5 rounded-lg transition-colors">
                  🗺️ Abrir Maps
                </a>
              </div>
              <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-3">
                {([['link', '🔗 Link Maps'], ['coords', '🌐 Coordenadas'], ['pluscode', '📍 Plus Code']] as const).map(([mode, label]) => (
                  <button key={mode} type="button" onClick={() => resetLocMode(mode)}
                    className={`flex-1 py-2 text-xs font-semibold transition-colors ${locMode === mode ? 'bg-purple-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                    {label}
                  </button>
                ))}
              </div>
              {locMode === 'link' && (
                <>
                  <input value={mapsLink} onChange={(e) => setMapsLink(e.target.value)} placeholder="https://maps.google.com/..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400" />
                  {mapsLink.includes('maps') && <p className="text-xs text-purple-500 font-medium mt-1.5">📍 Link detectado</p>}
                </>
              )}
              {locMode === 'coords' && (
                <>
                  <input value={coordsInput} onChange={(e) => {
                    setCoordsInput(e.target.value)
                    const p = parseCoords(e.target.value)
                    if (p) { setMapsLink(`https://www.google.com/maps?q=${p.lat},${p.lng}`); setCoordsResolved(true) }
                    else { setMapsLink(''); setCoordsResolved(false) }
                  }} placeholder="-27.1234, -48.5678"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 font-mono" />
                  {coordsInput && !coordsResolved && <p className="text-xs text-red-400 mt-1.5">Formato inválido. Ex: -27.1234, -48.5678</p>}
                  {coordsResolved && <p className="text-xs text-purple-500 font-medium mt-1.5">📍 Localização detectada!</p>}
                </>
              )}
              {locMode === 'pluscode' && (
                <>
                  <div className="flex gap-2">
                    <input value={plusCodeInput}
                      onChange={(e) => { setPlusCodeInput(e.target.value); setPlusCodeError(''); setCoordsResolved(false) }}
                      onKeyDown={(e) => e.key === 'Enter' && resolvePlusCode(plusCodeInput)}
                      placeholder="Ex: 7RXJ+GH Urubici"
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 font-mono" />
                    <button type="button" onClick={() => resolvePlusCode(plusCodeInput)}
                      disabled={!plusCodeInput.trim() || locResolving}
                      className="px-4 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-40 whitespace-nowrap"
                      style={{ background: ACCENT }}>
                      {locResolving ? '...' : 'Buscar'}
                    </button>
                  </div>
                  {plusCodeError && <p className="text-xs text-red-400 mt-1.5">{plusCodeError}</p>}
                  {coordsResolved && <p className="text-xs text-purple-500 font-medium mt-1.5">📍 Localização detectada!</p>}
                </>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button onClick={() => setStep(0)} className="flex-1 py-4 rounded-xl font-bold text-gray-500 text-sm border border-gray-200 bg-white">← Voltar</button>
            <button onClick={() => setStep(2)}
              disabled={!date || !time || (!recurrence && (!endDate || !endTime))}
              className="flex-[2] py-4 rounded-xl font-bold text-white text-sm transition-all"
              style={{ background: (!date || !time || (!recurrence && (!endDate || !endTime))) ? ACCENT_LIGHT : ACCENT }}>
              Próximo → Imagem e detalhes
            </button>
          </div>
        </div>
      )}

      {/* PASSO 2 — Imagem e detalhes */}
      {step === 2 && (
        <div>
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🖼️</div>
            <h1 className="text-2xl font-bold text-gray-900">Imagem e detalhes</h1>
            <p className="text-gray-500 mt-1 text-sm">Uma boa foto chama muito mais atenção!</p>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Folder / cartaz <span className="text-gray-400 font-normal">(muito recomendado!)</span>
              </label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              {photoPreview ? (
                <div className="relative rounded-xl overflow-hidden aspect-video bg-gray-100">
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                      <div className="w-3/4 h-1.5 bg-white/30 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-400 transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <span className="text-white text-xs mt-1">{uploadProgress}%</span>
                    </div>
                  )}
                  {!uploading && (
                    <button type="button" onClick={() => { setPhoto(''); setPhotoPreview(''); if (fileRef.current) fileRef.current.value = '' }}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs">✕</button>
                  )}
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-purple-300 hover:text-purple-400 transition-colors">
                  <span className="text-3xl">🖼️</span>
                  <span className="text-sm font-medium">Adicionar folder/cartaz</span>
                  <span className="text-xs">JPG, PNG — máx 5 MB</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Preço do ingresso</label>
                <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ex: R$ 40 / Grátis"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Link de ingressos</label>
                <input type="url" value={ticketUrl} onChange={(e) => setTicketUrl(e.target.value)} placeholder="sympla.com.br/..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Descrição *
                <span className={`ml-2 text-xs font-normal ${description.length >= 30 ? 'text-green-500' : 'text-gray-400'}`}>
                  {description.length >= 30 ? '✓ Ótimo!' : `${description.length}/30 mín.`}
                </span>
              </label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
                placeholder="O que vai rolar? Atrações, programação, público esperado..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 resize-none" />
            </div>

            {status === 'error' && <p className="text-red-500 text-sm text-center">Poxa, deu ruim ao enviar. Tenta de novo!</p>}
          </div>

          <div className="flex gap-3 mt-8">
            <button onClick={() => setStep(1)} className="flex-1 py-4 rounded-xl font-bold text-gray-500 text-sm border border-gray-200 bg-white">← Voltar</button>
            {plan === 'free' ? (
              <button onClick={handleSubmit} disabled={status === 'sending' || description.length < 30 || uploading}
                className="flex-[2] py-4 rounded-xl font-bold text-white text-sm transition-all"
                style={{ background: (description.length < 30 || uploading) ? ACCENT_LIGHT : ACCENT }}>
                {status === 'sending' ? 'Enviando...' : '🎭 Indicar esse evento!'}
              </button>
            ) : (
              <button onClick={() => setStep(3)} disabled={description.length < 30 || uploading}
                className="flex-[2] py-4 rounded-xl font-bold text-white text-sm transition-all"
                style={{ background: (description.length < 30 || uploading) ? ACCENT_LIGHT : ACCENT }}>
                Próximo → Seus dados
              </button>
            )}
          </div>
        </div>
      )}

      {/* PASSO 3 — Contato (paid only) */}
      {step === 3 && plan === 'paid' && (
        <div>
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">📞</div>
            <h1 className="text-2xl font-bold text-gray-900">Seus dados</h1>
            <p className="text-gray-500 mt-1 text-sm">Para entrarmos em contato sobre o destaque</p>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome completo *</label>
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Seu nome"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">E-mail *</label>
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="seu@email.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">WhatsApp <span className="text-gray-400 font-normal">(opcional)</span></label>
              <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="(48) 99999-9999"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400" />
            </div>
            {status === 'error' && <p className="text-red-500 text-sm text-center">Poxa, deu ruim ao enviar. Tenta de novo!</p>}
          </div>
          <div className="flex gap-3 mt-8">
            <button onClick={() => setStep(2)} className="flex-1 py-4 rounded-xl font-bold text-gray-500 text-sm border border-gray-200 bg-white">← Voltar</button>
            <button onClick={handleSubmit} disabled={status === 'sending' || !contactName.trim() || !contactEmail.trim()}
              className="flex-[2] py-4 rounded-xl font-bold text-white text-sm transition-all"
              style={{ background: (!contactName.trim() || !contactEmail.trim()) ? ACCENT_LIGHT : ACCENT }}>
              {status === 'sending' ? 'Enviando...' : '⭐ Solicitar destaque!'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
