import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!
const API_KEY = process.env.CLOUDINARY_API_KEY!
const API_SECRET = process.env.CLOUDINARY_API_SECRET!

function extractPublicId(url: string): string | null {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/)
  return match ? match[1] : null
}

function sign(publicId: string, timestamp: number): string {
  const str = `public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`
  return crypto.createHash('sha1').update(str).digest('hex')
}

export async function POST(req: NextRequest) {
  try {
    const { urls } = await req.json() as { urls: string[] }
    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ ok: true })
    }

    await Promise.allSettled(
      urls.map(async (url) => {
        const publicId = extractPublicId(url)
        if (!publicId) return
        const timestamp = Math.floor(Date.now() / 1000)
        const signature = sign(publicId, timestamp)
        const form = new URLSearchParams({
          public_id: publicId,
          api_key: API_KEY,
          timestamp: String(timestamp),
          signature,
        })
        await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
          method: 'POST',
          body: form,
        })
      })
    )

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
