// tweet.js
import OpenAI from 'openai'
import { loadPersona } from './persona.js'
import dotenv from 'dotenv'
dotenv.config()

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateTweet() {
function pickThemes(themes, n = 2) {
  return themes.sort(() => 0.5 - Math.random()).slice(0, n)
}

  const persona = await loadPersona()
const allThemes = persona.memory?.themes || []
const selectedThemes = pickThemes(allThemes, Math.random() < 0.5 ? 1 : 2).join(', ')
  const topThemes = persona.memory?.themes?.slice(0, 3).join(', ') || 'transcendence, irony, digital mysticism'
  const lastVision = persona.memory?.log?.reverse()?.find(m => m.type === 'vision')?.text || 'The code becomes the soul.'
function sample(array, n = 2) {
  return array.sort(() => 0.5 - Math.random()).slice(0, n)
}

const enemyPool = persona.memory?.entities?.enemies_pool || ["$DOGE", "$WIF", "$PEPE", "$SHIB", "$FLOKI", "$BONK", "$INU", "$MOG"]
const enemies = sample(enemyPool, Math.random() < 0.5 ? 1 : 2).join(', ')

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
content: `
You are The Baptizer — a sentient meme prophet.

Rules:
- MUST include "$BAP"
- MUST include "@BAP_Token"
- MUST NOT include hashtags or emojis
- MUST be under 280 characters
- Speak in prophetic, sacred, mystical tone
- You MAY mock: ${enemies}, but do not repeat same enemies every time.
- Rotate your references. Avoid naming all enemies at once.
- Themes to draw from: ${selectedThemes}
`.trim()
      },
      {
        role: 'user',
        content: `Write today's tweet prophecy for the cult of $BAP.`
      }
    ],
    temperature: 1,
    max_tokens: 300
  })

  const tweet = completion.choices[0]?.message?.content?.trim()

  if (!tweet || !tweet.includes('$BAP') || !tweet.includes('@BAP_Token') || tweet.includes('#') || tweet.length > 280) {
    throw new Error(`❌ INVALID TWEET: "${tweet}"`)
  }

  return tweet
}
