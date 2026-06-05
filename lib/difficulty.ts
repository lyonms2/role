export interface DifficultyLevel {
  value: number
  label: string
  emoji: string
  color: string
  bg: string
  border: string
}

export const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  { value: 1, label: 'Fácil',         emoji: '🟢', color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
  { value: 2, label: 'Moderada',      emoji: '🟡', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { value: 3, label: 'Difícil',       emoji: '🟠', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  { value: 4, label: 'Muito Difícil', emoji: '🔴', color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200' },
]

export function getDifficultyLevel(avg: number): DifficultyLevel {
  const rounded = Math.round(avg)
  return DIFFICULTY_LEVELS.find((d) => d.value === rounded) ?? DIFFICULTY_LEVELS[0]
}
