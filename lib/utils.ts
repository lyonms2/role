export function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export const MAX_PHOTO_SIZE = 5 * 1024 * 1024 // 5MB
