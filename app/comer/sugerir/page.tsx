'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { auth } from '@/lib/firebase'
import { addEat } from '@/lib/firestore'
import { uploadToCloudinary } from '@/lib/cloudinary'
import type { EatCategory, Eat } from '@/types'
import { EAT_CATEGORY_LABELS } from '@/types'

const CATEGORIES = Object.keys(EAT_CATEGORY_LABELS) as EatCategory[]
const PRICE_RANGES: Eat['priceRange'][] = ['💲', '💲💲', '💲💲💲']
const PRICE_LABELS: Record<Eat['priceRange'], { emoji: string; label: string; sub: string }> = {
  '💲':     { emoji: '💲',     label: 'Baratinho',  sub: 'até R$ 30 por pessoa' },
  '💲💲':   { emoji: '💲💲',   label: 'Médio',      sub: 'R$ 30–80 por pessoa'  },
  '💲💲💲': { emoji: '💲💲💲', label: 'Caprichado', sub: 'acima de R$ 80'       },
}

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
            ? 'w-6 h-2 bg-orange-500'
            : i === current
            ? 'w-8 h-2 bg-orange-500'
            : 'w-2 h-2 bg-gray-200'
        }`} />
      ))}
    </div>
  )
}

export default function SugerirComerPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    name: '',
    city: '',
    state: 'SC',
    category: '' as EatCategory | '',
    priceRange: '' as Eat['priceRange'] | '',
    description: '',
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
      await addEat({
        name: form.name,
        city: form.city,
        state: form.state,
        category: form.category as EatCategory,
        priceRange: form.priceRange as Eat['priceRange'],
        description: form.description,
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
    setForm({ name: '', city: '', state: 'SC', category: '', priceRange: '', description: '', mapsLink: '' })
    setPhoto('')
    setPhotoPreview('')
  }

  // ── Sucesso ───────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-7xl mb-4">🤤</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dica enviada!</h2>
        <p className="text-gray-500 mb-6">A gente analisa e publica em breve. Valeu por ajudar a galera a comer bem no rolê!</p>
        <div className="flex flex-col gap-3">
          <button onClick={reset} className="btn-primary w-full" style={{ background: '#ea580c' }}>
            Indicar outro lugar
          </button>
          <Link href="/comer" className="text-sm text-gray-400 text-center block">← Ver onde comer</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link href="/comer" className="text-sm text-gray-400 mb-6 inline-block">← Onde Comer</Link>

      <StepDots current={step} total={3} />

      {/* ── PASSO 0 — Que lugar é esse? ──────────────────── */}
      {step === 0 && (
        <div>
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🍽️</div>
            <h1 className="text-2xl font-bold text-gray-900">Que lugar é esse?</h1>
            <p className="text-gray-500 mt-1 text-sm">Cola a dica pra galera não errar na hora de comer!</p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Tipo */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de lugar *</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button key={cat} type="button" onClick={() => update('category', cat)}
                    className={`py-3 px-4 rounded-xl text-sm font-medium border transition-all text-left ${
                      form.category === cat
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-orange-200'
                    }`}>
                    {EAT_CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            {/* Nome */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome do lugar *</label>
              <input
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Ex: Restaurante da Vó Maria"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
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
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
                />
              </div>
              <div className="w-24">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estado *</label>
                <select
                  value={form.state}
                  onChange={(e) => update('state', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400 bg-white"
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
            style={{ background: (!form.category || !form.name.trim() || !form.city.trim()) ? '#fdba74' : '#ea580c' }}
          >
            Próximo → Faixa de preço
          </button>
        </div>
      )}

      {/* ── PASSO 1 — Quanto custa e onde fica? ─────────── */}
      {step === 1 && (
        <div>
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">💰</div>
            <h1 className="text-2xl font-bold text-gray-900">Quanto custa?</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {form.name && <span className="font-semibold text-orange-500">{form.name}</span>}
            </p>
          </div>

          <div className="flex flex-col gap-5">
            {/* Faixa de preço */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Faixa de preço *</label>
              <div className="flex flex-col gap-2">
                {PRICE_RANGES.map((p) => (
                  <button key={p} type="button" onClick={() => update('priceRange', p)}
                    className={`w-full py-4 px-5 rounded-xl text-sm font-medium border transition-all flex items-center gap-4 ${
                      form.priceRange === p
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-orange-200'
                    }`}>
                    <span className="text-xl">{PRICE_LABELS[p].emoji}</span>
                    <div className="text-left">
                      <p className="font-bold">{PRICE_LABELS[p].label}</p>
                      <p className={`text-xs ${form.priceRange === p ? 'text-orange-100' : 'text-gray-400'}`}>
                        {PRICE_LABELS[p].sub}
                      </p>
                    </div>
                    {form.priceRange === p && <span className="ml-auto text-lg">✓</span>}
                  </button>
                ))}
              </div>
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
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
              />
              {form.mapsLink.includes('maps') && (
                <p className="text-xs text-orange-500 font-medium mt-1.5">📍 Link do Maps detectado</p>
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
              disabled={!form.priceRange}
              className="flex-[2] py-4 rounded-xl font-bold text-white text-sm transition-all"
              style={{ background: !form.priceRange ? '#fdba74' : '#ea580c' }}
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
            <div className="text-5xl mb-3">😋</div>
            <h1 className="text-2xl font-bold text-gray-900">Convence a galera!</h1>
            <p className="text-gray-500 mt-1 text-sm">Uma boa foto e uma descrição caprichada fazem toda diferença</p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Foto */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Foto do lugar <span className="text-gray-400 font-normal">(vale muito!)</span>
              </label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              {photoPreview ? (
                <div className="relative rounded-xl overflow-hidden aspect-video bg-gray-100">
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                      <div className="w-3/4 h-1.5 bg-white/30 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-400 transition-all" style={{ width: `${uploadProgress}%` }} />
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
                  className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-orange-300 hover:text-orange-400 transition-colors">
                  <span className="text-3xl">🖼️</span>
                  <span className="text-sm font-medium">Adicionar foto</span>
                  <span className="text-xs">Fachada, prato, ambiente...</span>
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
                placeholder="O que é especial aqui? Tem algum prato obrigatório? Atende até tarde? Pode falar tudo!"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none"
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
              style={{ background: (form.description.length < 30 || uploading) ? '#fdba74' : '#ea580c' }}
            >
              {status === 'sending' ? 'Enviando...' : '🍽️ Indicar esse lugar!'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
