'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { auth } from '@/lib/firebase'
import { addStay } from '@/lib/firestore'
import { uploadToCloudinary } from '@/lib/cloudinary'
import type { StayCategory } from '@/types'
import { STAY_CATEGORY_LABELS } from '@/types'

const CATEGORIES = Object.keys(STAY_CATEGORY_LABELS) as StayCategory[]

const ESTADOS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`rounded-full transition-all ${
          i < current
            ? 'w-6 h-2 bg-green-600'
            : i === current
            ? 'w-8 h-2 bg-green-600'
            : 'w-2 h-2 bg-gray-200'
        }`} />
      ))}
    </div>
  )
}

export default function SugerirHospedarPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    name: '',
    city: '',
    state: 'SC',
    category: '' as StayCategory | '',
    priceFrom: '',
    description: '',
    bookingUrl: '',
    mapsLink: '',
  })
  const [photo, setPhoto] = useState('')
  const [photoPreview, setPhotoPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const fileRef = useRef<HTMLInputElement>(null)

  function update(field: string, value: string) {
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

  async function handleSubmit() {
    if (form.description.length < 30) {
      alert('Conta mais sobre o lugar! Mínimo 30 caracteres.')
      return
    }
    setStatus('sending')
    try {
      const user = auth.currentUser
      await addStay({
        name: form.name,
        city: form.city,
        state: form.state,
        category: form.category as StayCategory,
        priceFrom: form.priceFrom ? Number(form.priceFrom) : undefined,
        description: form.description,
        bookingUrl: form.bookingUrl || undefined,
        mapsLink: form.mapsLink || undefined,
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
    setForm({ name: '', city: '', state: 'SC', category: '', priceFrom: '', description: '', bookingUrl: '', mapsLink: '' })
    setPhoto('')
    setPhotoPreview('')
  }

  // ── Sucesso ───────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-7xl mb-4">🛌</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Hospedagem indicada!</h2>
        <p className="text-gray-500 mb-6">A gente analisa e publica em breve. Valeu por ajudar a galera a dormir bem no rolê!</p>
        <div className="flex flex-col gap-3">
          <button onClick={reset} className="btn-primary w-full" style={{ background: '#16a34a' }}>
            Indicar outra hospedagem
          </button>
          <Link href="/hospedar" className="text-sm text-gray-400 text-center block">← Ver onde dormir</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link href="/hospedar" className="text-sm text-gray-400 mb-6 inline-block">← Onde Dormir</Link>

      <StepDots current={step} total={3} />

      {/* ── PASSO 0 — Que hospedagem é essa? ─────────────── */}
      {step === 0 && (
        <div>
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🏡</div>
            <h1 className="text-2xl font-bold text-gray-900">Que hospedagem é essa?</h1>
            <p className="text-gray-500 mt-1 text-sm">Conhece um lugar incrível pra descansar? Indica pra galera!</p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Tipo */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de hospedagem *</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button key={cat} type="button" onClick={() => update('category', cat)}
                    className={`py-3 px-4 rounded-xl text-sm font-medium border transition-all text-left ${
                      form.category === cat
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-green-200'
                    }`}>
                    {STAY_CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            {/* Nome */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome da hospedagem *</label>
              <input
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Ex: Pousada do Vale Verde"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400"
              />
            </div>

            {/* Cidade + Estado */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cidade *</label>
                <input
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                  placeholder="Ex: Urubici"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400"
                />
              </div>
              <div className="w-24">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estado *</label>
                <select
                  value={form.state}
                  onChange={(e) => update('state', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-green-400 bg-white"
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
            style={{ background: (!form.category || !form.name.trim() || !form.city.trim()) ? '#86efac' : '#16a34a' }}
          >
            Próximo → Valores e reserva
          </button>
        </div>
      )}

      {/* ── PASSO 1 — Valores e como reservar ────────────── */}
      {step === 1 && (
        <div>
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">💳</div>
            <h1 className="text-2xl font-bold text-gray-900">Valores e reserva</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {form.name && <span className="font-semibold text-green-600">{form.name}</span>}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Preço */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Diária a partir de <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-semibold">R$</span>
                <input
                  type="number"
                  min="0"
                  value={form.priceFrom}
                  onChange={(e) => update('priceFrom', e.target.value)}
                  placeholder="Ex: 180"
                  className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-green-400"
                />
              </div>
              {form.priceFrom && (
                <p className="text-xs text-green-600 font-medium mt-1.5">
                  💰 A partir de R$ {form.priceFrom}/noite
                </p>
              )}
            </div>

            {/* Site de reserva */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Site ou link de reserva <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                value={form.bookingUrl}
                onChange={(e) => update('bookingUrl', e.target.value)}
                placeholder="https://pousadadovale.com.br ou link do Airbnb..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400"
              />
              {form.bookingUrl.includes('airbnb') && (
                <p className="text-xs text-green-600 font-medium mt-1.5">🏠 Link do Airbnb detectado</p>
              )}
              {form.bookingUrl.includes('booking') && (
                <p className="text-xs text-green-600 font-medium mt-1.5">🏨 Link do Booking.com detectado</p>
              )}
            </div>

            {/* Google Maps */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Link do Google Maps <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                value={form.mapsLink}
                onChange={(e) => update('mapsLink', e.target.value)}
                placeholder="https://maps.google.com/..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400"
              />
              {form.mapsLink.includes('maps') && (
                <p className="text-xs text-green-600 font-medium mt-1.5">📍 Link do Maps detectado</p>
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
              className="flex-[2] py-4 rounded-xl font-bold text-white text-sm"
              style={{ background: '#16a34a' }}
            >
              Próximo → Convence a galera
            </button>
          </div>
        </div>
      )}

      {/* ── PASSO 2 — Convence a galera! ─────────────────── */}
      {step === 2 && (
        <div>
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">😍</div>
            <h1 className="text-2xl font-bold text-gray-900">Convence a galera!</h1>
            <p className="text-gray-500 mt-1 text-sm">Uma boa foto e uma descrição caprichada fazem toda diferença</p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Foto */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Foto da hospedagem <span className="text-gray-400 font-normal">(vale muito!)</span>
              </label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              {photoPreview ? (
                <div className="relative rounded-xl overflow-hidden aspect-video bg-gray-100">
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                      <div className="w-3/4 h-1.5 bg-white/30 rounded-full overflow-hidden">
                        <div className="h-full bg-green-400 transition-all" style={{ width: `${uploadProgress}%` }} />
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
                  className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-green-300 hover:text-green-500 transition-colors">
                  <span className="text-3xl">🖼️</span>
                  <span className="text-sm font-medium">Adicionar foto</span>
                  <span className="text-xs">Quarto, área comum, vista...</span>
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
                placeholder="O que tem de especial? Café da manhã incrível? Vista de tirar o fôlego? Fica pertinho do centro? Conta tudo!"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400 resize-none"
              />
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
              style={{ background: (form.description.length < 30 || uploading) ? '#86efac' : '#16a34a' }}
            >
              {status === 'sending' ? 'Enviando...' : '🏡 Indicar essa hospedagem!'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
