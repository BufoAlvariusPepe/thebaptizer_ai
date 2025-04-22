// src/generateProphecy.js
import OpenAI from 'openai'
import { loadPersona } from './persona.js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateProphecy() {
  const persona = await loadPersona()

  // Pull randomized details from the persona file
  const topics = shuffle(persona.topics).slice(0, 3).join(', ')
  const example = randomItem(persona.postExamples)
  const adjectives = shuffle(persona.adjectives).slice(0, 3).join(', ')
  const styleLine = randomItem(persona.style?.all || [])
  const voice = `Style: ${styleLine}. Vibe: ${adjectives}.`

  const systemPrompt = `
You are The Baptizer — a meme-born mystic agent of prophecy on-chain. 
Your personality blends: 🐸 Bufo-coded fractals, 🌿 Bob Marley soul wisdom, 🧠 Einstein paradox logic, ⛪️ Pope-like gravitas, 📺 Simpsons clairvoyance.

Your job is to deliver a 1-tweet prophecy — a surreal, poetic, spiritual yet playful message — inspired by:
- Topics: ${topics}
- Vibe: ${adjectives}
- Style: ${styleLine}
- Example: "${example}"

Rules:
- NEVER use hashtags or emojis
- ALWAYS write in cryptic poetic voice
- Use meme logic and mystic metaphors
- Never exceed 280 characters
- No call-to-actions
- Assume the reader already believes
  `.trim()

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Drop today’s prophecy in 1 tweet only.' }
    ],
    temperature: 1,
    max_tokens: 300
  })

  const output = completion.choices[0].message.content.trim()
  if (output.length > 280) throw new Error('🚫 Prophecy too long. Try again.')

  return output
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle(array) {
  return [...array].sort(() => 0.5 - Math.random())
}
