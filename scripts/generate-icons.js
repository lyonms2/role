// Script para gerar ícones PWA
// Execute: node scripts/generate-icons.js
// Requer: npm install canvas (opcional)
// Alternativa: use https://realfavicongenerator.net/ com o logo do Rolê

const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

function generateIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Fundo laranja
  ctx.fillStyle = '#FF6B35'
  ctx.beginPath()
  ctx.roundRect(0, 0, size, size, size * 0.2)
  ctx.fill()

  // Emoji 🗺️
  ctx.font = `${size * 0.55}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('🗺️', size / 2, size / 2)

  const outputPath = path.join(__dirname, '..', 'public', 'icons', `icon-${size}x${size}.png`)
  const buffer = canvas.toBuffer('image/png')
  fs.writeFileSync(outputPath, buffer)
  console.log(`Ícone ${size}x${size} gerado!`)
}

try {
  generateIcon(192)
  generateIcon(512)
} catch {
  console.log('canvas não instalado — use https://realfavicongenerator.net/ para gerar os ícones')
  console.log('ou instale: npm install canvas')
}
