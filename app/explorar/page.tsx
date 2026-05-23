import Link from 'next/link'

const RENTCARS_AFFILIATE_ID = process.env.NEXT_PUBLIC_RENTCARS_AFFILIATE_ID

const SECTIONS = [
  {
    href: '/eventos',
    emoji: '🎭',
    title: 'Shows & Eventos',
    description: 'Shows, festivais, feiras e tudo que tá rolando perto de você',
    gradient: 'from-purple-500 to-purple-700',
    badge: 'Agenda da galera',
  },
  {
    href: '/comer',
    emoji: '🍽️',
    title: 'Onde Comer',
    description: 'Restaurantes, bares, cafés e pedidas da galera local',
    gradient: 'from-orange-400 to-orange-600',
    badge: 'Curadoria local',
  },
  {
    href: '/hospedar',
    emoji: '🏡',
    title: 'Onde Dormir',
    description: 'Pousadas, hotéis, camping e o lugar certo pra descansar',
    gradient: 'from-green-500 to-green-700',
    badge: 'Todas as opções',
  },
]

const ADS = [
  { href: '/anunciar?tipo=evento', emoji: '🎭', label: 'Anunciar evento', color: 'text-purple-600 bg-purple-50 border-purple-100' },
]

const SUGGESTIONS = [
  { href: '/sugerir?tipo=comer',    emoji: '🍽️', label: 'Sugerir restaurante', color: 'text-orange-600 bg-orange-50 border-orange-100' },
  { href: '/sugerir?tipo=hospedar', emoji: '🏡', label: 'Sugerir hospedagem',  color: 'text-green-700 bg-green-50 border-green-100'  },
]

export default function ExplorarPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">

      <div className="mb-6">
        <h1 className="text-lg font-bold text-gray-900">Explorar</h1>
        <p className="text-sm text-gray-500 mt-0.5">Tudo que você precisa pra montar o rolê perfeito</p>
      </div>

      {/* Seções principais */}
      <div className="flex flex-col gap-3 mb-8">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group block rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all"
          >
            <div className={`bg-gradient-to-r ${s.gradient} px-5 py-4 flex items-center gap-4`}>
              <span className="text-3xl">{s.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-base leading-tight">{s.title}</p>
                <p className="text-white/80 text-xs mt-0.5">{s.description}</p>
              </div>
              <span className="text-white/60 text-xl font-bold group-hover:translate-x-1 transition-transform flex-shrink-0">›</span>
            </div>
            <div className="px-5 py-2.5 flex items-center justify-between bg-white">
              <span className="text-xs font-semibold text-gray-400">{s.badge}</span>
              <span className="text-xs text-orange-500 font-semibold">Ver todos →</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Sugestões */}
      <div className="border-t border-gray-100 pt-6 mb-6">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Conhece um lugar bom?</p>
        <p className="text-xs text-gray-400 mb-3">Sugira gratuitamente — nossa equipe revisa e publica</p>
        <div className="flex flex-col gap-2">
          {SUGGESTIONS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors hover:opacity-80 ${item.color}`}
            >
              <span className="text-lg">{item.emoji}</span>
              {item.label}
              <span className="ml-auto text-xs font-normal opacity-60">→</span>
            </a>
          ))}
        </div>
      </div>

      {/* Anunciar */}
      <div className="border-t border-gray-100 pt-6 mb-6">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Tem um evento? Anuncie aqui</p>
        <div className="flex flex-col gap-2">
          {ADS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors hover:opacity-80 ${item.color}`}
            >
              <span className="text-lg">{item.emoji}</span>
              {item.label}
              <span className="ml-auto text-xs font-normal opacity-60">→</span>
            </a>
          ))}
        </div>
      </div>

      {/* Sugerir */}
      <Link
        href="/sugerir"
        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors mb-6"
      >
        <span className="text-lg">➕</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-orange-700">Conhece um lugar incrível?</p>
          <p className="text-xs text-orange-500">Sugira para a comunidade do LetsApp</p>
        </div>
        <span className="text-orange-400 font-bold flex-shrink-0">→</span>
      </Link>

      {/* Rentcars banner */}
      <a
        href={`https://www.rentcars.com/pt-br/${RENTCARS_AFFILIATE_ID ? `?partner=${RENTCARS_AFFILIATE_ID}` : ''}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-2xl overflow-hidden border border-blue-100 hover:shadow-lg transition-shadow"
      >
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-white font-extrabold text-xl tracking-tight">rentcars</p>
            <p className="text-blue-200 text-xs">Compare e economize no aluguel</p>
          </div>
          <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full">Parceiro oficial</span>
        </div>
        <div className="bg-white px-5 py-4">
          <div className="grid grid-cols-3 gap-3 mb-4 text-center">
            {[{ num: '350+', label: 'Locadoras' }, { num: '160', label: 'Países' }, { num: '4.5★', label: 'Trustpilot' }].map((s) => (
              <div key={s.label} className="bg-gray-50 rounded-xl py-2">
                <p className="font-bold text-blue-700 text-sm">{s.num}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 mb-4 text-sm text-gray-600">
            <p className="flex items-center gap-2">✅ Cancelamento gratuito na maioria das reservas</p>
            <p className="flex items-center gap-2">✅ Melhor preço garantido</p>
            <p className="flex items-center gap-2">✅ Localiza, Movida, Hertz, Avis e muito mais</p>
          </div>
          <div className="bg-blue-600 text-white text-center font-bold py-3 rounded-xl text-sm">
            🚗 Comparar preços agora →
          </div>
        </div>
      </a>

    </div>
  )
}
