import SearchForm from '@/components/SearchForm'

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-130px)] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🗺️</div>
          <h1 className="text-4xl font-extrabold mb-2" style={{ color: '#FF6B35' }}>Rolê</h1>
          <p className="text-gray-500 text-lg">Descobre o próximo rolê perto de você</p>
        </div>

        {/* Formulário */}
        <div className="card p-6">
          <SearchForm />
        </div>

        {/* Features rápidas */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            { icon: '✅', text: 'Reviews de quem realmente foi lá' },
            { icon: '☀️', text: 'Clima na hora, sem enrolação' },
            { icon: '🚗', text: 'Quanto tempo de carro até lá' },
          ].map((f) => (
            <div key={f.text} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="text-2xl mb-1">{f.icon}</div>
              <p className="text-xs text-gray-500 leading-tight">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
