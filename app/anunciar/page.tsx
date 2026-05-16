'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addAdvertiserRequest, type AdType } from '@/lib/firestore'
import { EVENT_CATEGORY_LABELS, EAT_CATEGORY_LABELS, STAY_CATEGORY_LABELS } from '@/types'

type AdTab = AdType

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 bg-white'
const selectCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 bg-white'

export default function AnunciarPage() {
  const router = useRouter()
  const [tab, setTab] = useState<AdTab>('evento')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  // campos comuns
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  // evento
  const [venue, setVenue] = useState('')
  const [date, setDate] = useState('')
  const [price, setPrice] = useState('')
  const [ticketUrl, setTicketUrl] = useState('')
  // comer
  const [priceRange, setPriceRange] = useState('💲💲')
  const [mapsLink, setMapsLink] = useState('')
  // hospedar
  const [priceFrom, setPriceFrom] = useState('')
  const [bookingUrl, setBookingUrl] = useState('')

  function resetForm() {
    setName(''); setCity(''); setState(''); setDescription(''); setCategory('')
    setContactName(''); setContactEmail(''); setContactPhone('')
    setVenue(''); setDate(''); setPrice(''); setTicketUrl('')
    setPriceRange('💲💲'); setMapsLink('')
    setPriceFrom(''); setBookingUrl('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !city || !state || !description || !contactName || !contactEmail) return
    setSending(true)
    try {
      await addAdvertiserRequest({
        type: tab,
        name, city, state, description,
        category: category || (tab === 'evento' ? 'cultural' : tab === 'comer' ? 'restaurante' : 'pousada'),
        contactName, contactEmail,
        contactPhone: contactPhone || undefined,
        ...(tab === 'evento' ? { venue, date: date || undefined, price: price || undefined, ticketUrl: ticketUrl || undefined } : {}),
        ...(tab === 'comer'  ? { priceRange, mapsLink: mapsLink || undefined } : {}),
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
          <button onClick={() => setSent(false)} className="btn-primary">Enviar outro anúncio</button>
          <button onClick={() => router.back()} className="text-sm text-gray-400">← Voltar</button>
        </div>
      </div>
    )
  }

  const t = TABS.find((t) => t.id === tab)!

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
            onClick={() => setTab(t.id)}
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
                tab === t.id ? `border-${t.color}-500 bg-${t.color}-500` : 'border-gray-300'
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

        <Field label="Nome">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={`Nome do ${t.label.toLowerCase()}`} className={inputCls} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Cidade">
            <input required value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex: Florianópolis" className={inputCls} />
          </Field>
          <Field label="Estado (UF)">
            <input required value={state} onChange={(e) => setState(e.target.value)} placeholder="SC" maxLength={2} className={inputCls} style={{ textTransform: 'uppercase' }} />
          </Field>
        </div>

        {/* Categoria */}
        {tab === 'evento' && (
          <Field label="Categoria">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
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

        <Field label="Descrição">
          <textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Conte sobre o seu negócio..." className={inputCls + ' resize-none'} />
        </Field>

        {/* Campos específicos por tipo */}
        {tab === 'evento' && (
          <>
            <Field label="Local / Venue">
              <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Ex: Arena XP, Parque das Nações..." className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data do evento">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Preço do ingresso">
                <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ex: R$ 80 / Grátis" className={inputCls} />
              </Field>
            </div>
            <Field label="Link de ingressos (opcional)">
              <input type="url" value={ticketUrl} onChange={(e) => setTicketUrl(e.target.value)} placeholder="https://..." className={inputCls} />
            </Field>
          </>
        )}
        {(tab === 'comer' || tab === 'hospedar') && (
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
        <Field label="Seu nome">
          <input required value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nome completo" className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="E-mail">
            <input required type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="seu@email.com" className={inputCls} />
          </Field>
          <Field label="WhatsApp (opcional)">
            <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="(48) 99999-9999" className={inputCls} />
          </Field>
        </div>

        <button
          type="submit"
          disabled={sending}
          className={`w-full py-3.5 rounded-xl font-bold text-white text-sm mt-2 transition-colors disabled:opacity-60 ${BTN_COLOR[tab]}`}
        >
          {sending ? 'Enviando...' : `${t.emoji} Solicitar espaço como ${t.label}`}
        </button>

        <p className="text-xs text-gray-400 text-center">Nossa equipe analisa e entra em contato em até 2 dias úteis.</p>
      </form>
    </div>
  )
}
