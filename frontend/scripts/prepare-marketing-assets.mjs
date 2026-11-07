import sharp from 'sharp'
import { mkdir, stat } from 'node:fs/promises'
const files = ['bg-image', 'Warm Family Reading Nook', 'Caring Playtime with Colorful Blocks', 'Joyful Block-Building with Mlezi Caregiver', 'Warm Mlezi Healthcare Bond', 'travelnanny', 'Joyful Family Day at the Playground', 'Warm Living Room Caregiver Cleaning']
await mkdir('src/assets/marketing', { recursive: true })
let original = 0, optimized = 0
for (const name of files) {
  const source = `src/assets/${name}.png`, target = `src/assets/marketing/${name}.webp`
  await sharp(source).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 78, effort: 5 }).toFile(target)
  original += (await stat(source)).size; optimized += (await stat(target)).size
}
const logo = await sharp('src/assets/logo.png').trim().resize({ width: 370 }).png().toBuffer()
const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="630" fill="#f7f8f2"/><circle cx="1100" cy="130" r="280" fill="#e3e8d4"/><image href="data:image/png;base64,${logo.toString('base64')}" x="75" y="55" width="370" height="140"/><text x="80" y="295" font-family="sans-serif" font-weight="bold" font-size="64" fill="#2f4437">Find childcare</text><text x="80" y="375" font-family="sans-serif" font-weight="bold" font-size="64" fill="#2f4437">that fits your family.</text><text x="80" y="450" font-family="sans-serif" font-size="30" fill="#516454">Nannies and babysitters in Kenya</text><text x="80" y="560" font-family="sans-serif" font-size="30" fill="#9b793c">mlezicare.com</text></svg>`
await sharp(Buffer.from(svg)).png().toFile('public/social-card.png')
console.log(`Marketing images: ${original} → ${optimized} bytes (${Math.round((1 - optimized / original) * 100)}% smaller). Social card: 1200 × 630.`)
