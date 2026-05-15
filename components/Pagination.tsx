interface Props {
  page: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
}

export default function Pagination({ page, totalPages, onPrev, onNext }: Props) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between mt-4">
      <button
        onClick={onPrev}
        disabled={page === 0}
        className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
          page === 0
            ? 'text-gray-300 border-gray-100 cursor-not-allowed'
            : 'text-gray-600 border-gray-200 hover:border-orange-400 hover:text-orange-500'
        }`}
      >
        ← Anterior
      </button>
      <span className="text-sm text-gray-500">
        {page + 1} de {totalPages}
      </span>
      <button
        onClick={onNext}
        disabled={page === totalPages - 1}
        className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
          page === totalPages - 1
            ? 'text-gray-300 border-gray-100 cursor-not-allowed'
            : 'text-gray-600 border-gray-200 hover:border-orange-400 hover:text-orange-500'
        }`}
      >
        Próxima →
      </button>
    </div>
  )
}
