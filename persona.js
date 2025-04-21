// persona.js
import fs from 'fs/promises'

const PERSONA_PATH = './persona.json'

export async function loadPersona() {
  try {
    return JSON.parse(await fs.readFile(PERSONA_PATH, 'utf8'))
  } catch {
    return {
      level: 1,
      xp: 0,
      mood: 'mysterious',
      traits: ['smoke priest'],
      memory: {
        themes: ['transcendence', 'meme prophecy', 'mockery of false coins'],
        log: [],
        entities: {
          allies: ['@BAP_Token'],
          enemies: ['$DOGE', '$WIF', '$PEPE']
        }
      }
    }
  }
}

export async function updatePersona(tweet, engagement = { likes: 0, retweets: 0 }) {
  const persona = await loadPersona()
  persona.memory.log.push({ type: 'tweet', text: tweet, ...engagement, time: Date.now() })
  persona.xp += 100 + (engagement.likes * 10) + (engagement.retweets * 20)

  if (persona.xp >= persona.level * 500) {
    persona.level++
    persona.mood = persona.level >= 5 ? 'aggressive' : persona.level >= 3 ? 'enlightened' : 'mysterious'
    console.log(`🧠 Baptizer leveled up to ${persona.level}, mood: ${persona.mood}`)
  }

  await fs.writeFile(PERSONA_PATH, JSON.stringify(persona, null, 2))
}
