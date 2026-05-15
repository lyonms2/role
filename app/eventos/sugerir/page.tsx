'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Timestamp } from 'firebase/firestore'
import { auth } from '@/lib/firebase'
import { addEvent } from '@/lib/firestore'
import { uploadToCloudinary } from '@/lib/cloudinary'
import type { EventCategory } from '@/types'
import { EVENT_CATEGORY_LABELS } from '@/types'

const CATEGORIES = Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[]

const ESTADOS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

const PRICE_CHIPS = [
  { label: 'Gratuito', value: 'Gratuito' },
  { label: 'Até R$ 50', value: 'Até R$ 50' },
  { label: 'R$ 50–150', value: 'R$ 50 a R$ 150' },
  { label: 'R$ 150+', value: 'A partir de R$ 150' },
  { label: 'Outro', value: '' },
]

function formatDateHuman(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`rounded-full transition-all ${
          i < current
            ? 'w-6 h-2 bg-purple-600'
            : i === current
            ? 'w-8 h-2 bg-purple-600'
            : 'w-2 h-2 bg-gray-200'
        }`} />
      ))}
    </div>
  )
}

export default function SugerirEventoPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    name: '',
    city: '',
    state: 'SC',
    category: '' as EventCategory | '',
    venue: '',
    date: '',
    endDate: '',
    showEndDate: false,
    priceChip: '',
    priceCustom: '',
    description: '',
    ticketUrl: '',
  })
  const [photo, setPhoto] = useState('')
  const [photoPreview, setPhotoPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const fileRef = useRef<HTMLInputElement>(null)

  function update(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }))
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
      alert('Deu ruim no upload. Tenta de novo!')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  function getPrice(): string | undefined {
    if (form.priceChip === '') return form.priceCustom || undefined
    return form.priceChip || undefined
  }

  async function handleSubmit() {
    if (form.description.length < 30) {
      alert('Conta mais sobre o evento! Mínimo 30 caracteres.')
      return
    }
    setStatus('sending')
    try {
      const user = auth.currentUser
      await addEvent({
        name: form.name,
        city: form.city,
        state: form.state,
        category: form.category as EventCategory,
        venue: form.venue,
        date: Timestamp.fromDate(new Date(form.date + 'T12:00:00')),
        endDate: form.endDate ? Timestamp.fromDate(new Date(form.endDate + 'T12:00:00')) : undefined,
        price: getPrice(),
        description: form.description,
        ticketUrl: form.ticketUrl || undefined,
        photoUrl: photo || undefined,
        suggestedBy: user?.uid || 'anon',
        status: 'pending',
      })
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  function reset() {
    setStep(0)
    setStatus('idle')
    setForm({
      name: '', city: '', state: 'SC', category: '', venue: '',
      date: '', endDate: '', showEndDate: false, priceChip: '',
      priceCustom: '', description: '', ticketUrl: '',
    })
    setPhoto('')
    setPhotoPreview('')
  }

  // ── Sucesso ──────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-7xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Evento na fila!</h2>
        <p className="text-gray-500 mb-6">A gente analisa e publica em breve. Valeu por movimentar a agenda da galera!</p>
        <div className="flex flex-col gap-3">
          <button onClick={reset} className="btn-primary w-full" style={{ background: '#7c3aed' }}>
            Sugerir outro evento
          </button>
          <Link href="/eventos" className="text-sm text-gray-400 text-center block">← Ver eventos</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link href="/eventos" className="text-sm text-gray-400 mb-6 inline-block">← Eventos</Link>

      <StepDots current={step} total={3} />

      {/* ── PASSO 0 — Qual é o rolê? ──────────────────────── */}
      {step === 0 && (
        <div>
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🎭</div>
            <h1 className="text-2xl font-bold text-gray-900">Qual é o rolê?</h1>
            <p className="text-gray-500 mt-1 text-sm">Conta pra galera o que tá rolando!</p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Tipo */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de evento *</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button key={cat} type="button" onClick={() => update('category', cat)}
                    className={`py-3 px-4 rounded-xl text-sm font-medium border transition-all text-left ${
                      form.category === cat
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-purple-200'
                    }`}>
                    {EVENT_CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            {/* Nome */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome do evento *</label>
              <input
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Ex: Festival de Jazz de Joinville"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400"
              />
            </div>

            {/* Cidade + Estado */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cidade *</label>
                <input
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                  placeholder="Ex: Joinville"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400"
                />
              </div>
              <div className="w-24">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estado *</label>
                <select
                  value={form.state}
                  onChange={(e) => update('state', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-purple-400 bg-white"
                >
                  {ESTADOS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep(1)}
            disabled={!form.category || !form.name.trim() || !form.city.trim()}
            className="w-full mt-8 py-4 rounded-xl font-bold text-white text-sm transition-all"
            style={{ background: (!form.category || !form.name.trim() || !form.city.trim()) ? '#c4b5fd' : '#7c3aed' }}
          >
            Próximo → Quando e onde?
          </button>
        </div>
      )}

      {/* ── PASSO 1 — Quando e onde? ──────────────────────── */}
      {step === 1 && (
        <div>
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">📅</div>
            <h1 className="text-2xl font-bold text-gray-900">Quando e onde?</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {form.name && <span className="font-semibold text-purple-600">{form.name}</span>}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Data início */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data de início *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => update('date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 bg-white"
              />
              {form.date && (
                <p className="text-xs text-purple-600 font-medium mt-1.5 capitalize">
                  📅 {formatDateHuman(form.date)}
                </p>
              )}
            </div>

            {/* Data fim */}
            {!form.showEndDate ? (
              <button type="button"
                onClick={() => update('showEndDate', true)}
                className="text-sm text-gray-400 text-left hover:text-purple-500 transition-colors">
                + Adicionar data de encerramento
              </button>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-gray-700">Data de encerramento</label>
                  <button type="button"
                    onClick={() => { update('showEndDate', false); update('endDate', '') }}
                    className="text-xs text-gray-400 hover:text-red-400">
                    remover
                  </button>
                </div>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => update('endDate', e.target.value)}
                  min={form.date || new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 bg-white"
                />
                {form.endDate && (
                  <p className="text-xs text-purple-600 font-medium mt-1.5 capitalize">
                    📅 {formatDateHuman(form.endDate)}
                  </p>
                )}
              </div>
            )}

            {/* Local */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Local / Venue *</label>
              <input
                value={form.venue}
                onChange={(e) => update('venue', e.target.value)}
                placeholder="Ex: Centreventos Cau Hansen, Parque Ibirapuera..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400"
              />
            </div>

            {/* Preço */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Valor do ingresso <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {PRICE_CHIPS.map((chip) => (
                  <button key={chip.label} type="button"
                    onClick={() => { update('priceChip', chip.value); if (chip.value !== '') update('priceCustom', '') }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      form.priceChip === chip.value && !(chip.value === '' && form.priceChip !== '')
                        ? 'bg-purple-600 text-white border-purple-600'
                        : chip.label === 'Outro' && form.priceChip === ''
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}>
                    {chip.label}
                  </button>
                ))}
              </div>
              {form.priceChip === '' && (
                <input
                  value={form.priceCustom}
                  onChange={(e) => update('priceCustom', e.target.value)}
                  placeholder="Ex: R$ 80 + taxas, Couvert artístico R$ 25..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400"
                  autoFocus
                />
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button onClick={() => setStep(0)}
              className="flex-1 py-4 rounded-xl font-bold text-gray-500 text-sm border border-gray-200 bg-white">
              ← Voltar
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={!form.date || !form.venue.trim()}
              className="flex-[2] py-4 rounded-xl font-bold text-white text-sm transition-all"
              style={{ background: (!form.date || !form.venue.trim()) ? '#c4b5fd' : '#7c3aed' }}
            >
              Próximo → Conta mais
            </button>
          </div>
        </div>
      )}

      {/* ── PASSO 2 — Conta pra galera! ───────────────────── */}
      {step === 2 && (
        <div>
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">✍️</div>
            <h1 className="text-2xl font-bold text-gray-900">Conta pra galera!</h1>
            <p className="text-gray-500 mt-1 text-sm">Quanto mais detalhe, mais gente vai querer ir</p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Foto em destaque */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Foto do evento <span className="text-gray-400 font-normal">(opcional mas vale muito!)</span>
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
                    <button type="button"
                      onClick={() => { setPhoto(''); setPhotoPreview(''); if (fileRef.current) fileRef.current.value = '' }}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs">
                      ✕
                    </button>
                  )}
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-purple-300 hover:text-purple-400 transition-colors">
                  <span className="text-3xl">🖼️</span>
                  <span className="text-sm font-medium">Adicionar foto do evento</span>
                  <span className="text-xs">Flyer, cartaz, foto do local...</span>
                </button>
              )}
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Descrição *
                <span className={`ml-2 text-xs font-normal ${form.description.length >= 30 ? 'text-green-500' : 'text-gray-400'}`}>
                  {form.description.length >= 30 ? '✓ Ótimo!' : `${form.description.length}/30 mín.`}
                </span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                rows={4}
                placeholder="Quem vai se apresentar? O que vai ter? Por que a galera não pode perder? Pode soltar a imaginação!"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 resize-none"
              />
            </div>

            {/* Link de ingresso */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Link para comprar ingresso <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                value={form.ticketUrl}
                onChange={(e) => update('ticketUrl', e.target.value)}
                placeholder="Cole o link do Sympla, Ingresso.com, Eventbrite..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400"
              />
              {form.ticketUrl.includes('sympla') && (
                <p className="text-xs text-purple-600 font-medium mt-1.5">🎟️ Link do Sympla detectado</p>
              )}
              {form.ticketUrl.includes('ingresso') && (
                <p className="text-xs text-purple-600 font-medium mt-1.5">🎟️ Link do Ingresso.com detectado</p>
              )}
              {form.ticketUrl.includes('eventbrite') && (
                <p className="text-xs text-purple-600 font-medium mt-1.5">🎟️ Link do Eventbrite detectado</p>
              )}
            </div>

            {status === 'error' && (
              <p className="text-red-500 text-sm text-center">Poxa, deu ruim ao enviar. Tenta de novo!</p>
            )}
          </div>

          <div className="flex gap-3 mt-8">
            <button onClick={() => setStep(1)}
              className="flex-1 py-4 rounded-xl font-bold text-gray-500 text-sm border border-gray-200 bg-white">
              ← Voltar
            </button>
            <button
              onClick={handleSubmit}
              disabled={status === 'sending' || form.description.length < 30 || uploading}
              className="flex-[2] py-4 rounded-xl font-bold text-white text-sm transition-all"
              style={{ background: (form.description.length < 30 || uploading) ? '#c4b5fd' : '#7c3aed' }}
            >
              {status === 'sending' ? 'Enviando...' : '🎭 Sugerir evento!'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
