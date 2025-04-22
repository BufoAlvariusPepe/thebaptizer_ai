// persona.js
import fs from 'fs/promises'

const PERSONA_PATH = './src/baptizer.json'

export async function loadPersona() {
  try {
    return JSON.parse(await fs.readFile(PERSONA_PATH, 'utf8'))
  } catch (err) {
    console.error('🚫 Failed to load baptizer.json:', err.message)
    return null
  }
}
