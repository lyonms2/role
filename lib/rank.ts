export interface RankInfo {
  label: string
  emoji: string
  display: string
  score: number
}

const THRESHOLDS = [
  { min: 150, label: 'Guardião',   emoji: '🏆' },
  { min: 50,  label: 'Guia',       emoji: '⭐' },
  { min: 10,  label: 'Explorador', emoji: '🗺️' },
  { min: 0,   label: 'Novato',     emoji: '🌱' },
] as const

export function calcScore({
  totalReviews,
  verifiedReviews,
  originalRoteiros,
  totalCopyCount,
  approvedSuggestions,
}: {
  totalReviews: number
  verifiedReviews: number
  originalRoteiros: number
  totalCopyCount: number
  approvedSuggestions: number
}): number {
  return (
    totalReviews * 1 +
    verifiedReviews * 2 +
    originalRoteiros * 5 +
    totalCopyCount * 2 +
    approvedSuggestions * 10
  )
}

export function getRank(score: number): RankInfo {
  for (const t of THRESHOLDS) {
    if (score >= t.min) {
      return { label: t.label, emoji: t.emoji, display: `${t.emoji} ${t.label}`, score }
    }
  }
  return { label: 'Novato', emoji: '🌱', display: '🌱 Novato', score }
}

const BANDS = [
  { from: 0,   to: 10,  nextDisplay: '🗺️ Explorador' },
  { from: 10,  to: 50,  nextDisplay: '⭐ Guia' },
  { from: 50,  to: 150, nextDisplay: '🏆 Guardião' },
] as const

export function getProgressToNextRank(score: number): {
  nextDisplay: string
  progressPercent: number
  pointsNeeded: number
} | null {
  const band = BANDS.find((b) => score >= b.from && score < b.to)
  if (!band) return null
  return {
    nextDisplay: band.nextDisplay,
    progressPercent: Math.round(((score - band.from) / (band.to - band.from)) * 100),
    pointsNeeded: band.to - score,
  }
}
