export type Recurrence = 'weekly' | 'monthly_date' | 'monthly_weekday'

function getNthWeekdayOfMonth(year: number, month: number, dayOfWeek: number, nth: number): Date {
  let count = 0
  let d = 1
  while (count < nth) {
    if (new Date(year, month, d).getDay() === dayOfWeek) count++
    if (count < nth) d++
  }
  return new Date(year, month, d)
}

/** Calcula a próxima ocorrência a partir de hoje (inclusive hoje se ainda não passou). */
export function getNextOccurrence(base: Date, recurrence: Recurrence): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const h = base.getHours()
  const m = base.getMinutes()

  if (recurrence === 'weekly') {
    const next = new Date(base)
    while (next < today) next.setDate(next.getDate() + 7)
    return next
  }

  if (recurrence === 'monthly_date') {
    const day = base.getDate()
    let next = new Date(today.getFullYear(), today.getMonth(), day, h, m)
    if (next < today) next = new Date(today.getFullYear(), today.getMonth() + 1, day, h, m)
    return next
  }

  // monthly_weekday: e.g. toda 1ª sexta
  const dow = base.getDay()
  const nth = Math.ceil(base.getDate() / 7)
  let next = getNthWeekdayOfMonth(today.getFullYear(), today.getMonth(), dow, nth)
  next.setHours(h, m)
  if (next < today) {
    next = getNthWeekdayOfMonth(today.getFullYear(), today.getMonth() + 1, dow, nth)
    next.setHours(h, m)
  }
  return next
}

/** Rótulo legível da recorrência baseado na data-base. */
export function getRecurrenceLabel(base: Date, recurrence: Recurrence): string {
  const days = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
  const nth = Math.ceil(base.getDate() / 7)
  const nthLabel = ['primeira', 'segunda', 'terceira', 'quarta'][nth - 1] ?? 'primeira'
  const dayName = days[base.getDay()]

  if (recurrence === 'weekly') return `Toda ${dayName}`
  if (recurrence === 'monthly_date') return `Todo dia ${base.getDate()}`
  return `Toda ${nthLabel} ${dayName} do mês`
}

/** Retorna a data efetiva do evento — próxima ocorrência se recorrente, data original caso contrário. */
export function effectiveDate(base: Date, recurrence?: string | null): Date {
  if (!recurrence) return base
  return getNextOccurrence(base, recurrence as Recurrence)
}
