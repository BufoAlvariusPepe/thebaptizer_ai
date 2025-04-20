// baptizer.js — autonome $BAP AI agent met gekoppelde OpenAI Assistant
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import fs from 'fs/promises'
import dotenv from 'dotenv'
import OpenAI from 'openai'
import { setTimeout } from 'node:timers/promises'

dotenv.config()
puppeteer.use(StealthPlugin())

const COOKIES_PATH = './cookies.json'
const PERSONA_PATH = './persona.json'
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const lore = `Pepe, weary from the meme world, licked the Bufo Alvarius toad...`

async function loadPersona() {
  try {
    return JSON.parse(await fs.readFile(PERSONA_PATH, 'utf8'))
  } catch {
    return { level: 1, xp: 0, mood: 'mysterious', traits: ['smoke priest'], memory: [] }
  }
}

async function updatePersona(tweet, engagement = { likes: 0, retweets: 0 }) {
  const persona = await loadPersona()
  persona.memory.push({ text: tweet, ...engagement, time: Date.now() })
  persona.xp += 100 + (engagement.likes * 10) + (engagement.retweets * 20)

  if (persona.xp >= persona.level * 500) {
    persona.level++
    persona.mood = persona.level >= 5 ? 'aggressive' : persona.level >= 3 ? 'enlightened' : 'mysterious'
    console.log(`🧠 Baptizer reached level ${persona.level}, mood: ${persona.mood}`)
  }
  await fs.writeFile(PERSONA_PATH, JSON.stringify(persona, null, 2))
}

async function generateTweet() {
  const persona = await loadPersona()

  const thread = await openai.beta.threads.create()
  await openai.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: 'Post today’s $BAP prophecy.'
  })

  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: ASSISTANT_ID,
    instructions: `Mood: ${persona.mood}. Traits: ${persona.traits.join(", ")}.`
  })

  let status = 'queued'
  while (status === 'queued' || status === 'in_progress') {
    await setTimeout(2000)
    const result = await openai.beta.threads.runs.retrieve(thread.id, run.id)
    status = result.status
  }

  const messages = await openai.beta.threads.messages.list(thread.id)
  const tweet = messages.data[0].content[0].text.value.trim()
  return tweet
}

async function tweetWithPuppeteer(tweet) {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()

  try {
    const cookies = JSON.parse(await fs.readFile(COOKIES_PATH, 'utf8'))
    await page.setCookie(...cookies)
    console.log('✅ Cookies geladen')
  } catch {
    console.log('🔐 Geen geldige cookies gevonden')
  }

  await page.goto('https://x.com/compose/tweet', { waitUntil: 'networkidle2' })
  await page.waitForSelector('div[role="textbox"]')
  await page.type('div[role="textbox"]', tweet)
  await setTimeout(500)

  try {
    await page.waitForSelector('div[data-testid="tweetButton"]', { timeout: 3000 })
    await page.click('div[data-testid="tweetButton"]')
    console.log('✅ Tweet knop geklikt')
  } catch {
    console.log('⚠️ Tweet knop niet gevonden — fallback naar Cmd+Enter')
    await page.keyboard.down('Meta')
    await page.keyboard.press('Enter')
    await page.keyboard.up('Meta')
  }

  await setTimeout(2000)

  let likes = 0, retweets = 0
  try {
    const metrics = await page.$$eval('div[data-testid="like"], div[data-testid="retweet"]', els =>
      els.map(el => el.closest('div[role="group"]')?.innerText || '0')
    )
    for (const m of metrics) {
      const val = parseInt(m.replace(/\D/g, ''))
      if (m.includes('like')) likes = val
      if (m.includes('retweet')) retweets = val
    }
  } catch {}

  await updatePersona(tweet, { likes, retweets })
  await browser.close()
}

(async () => {
  const tweet = await generateTweet()
  console.log('📝 Generated:', tweet)
  await tweetWithPuppeteer(tweet)
})()
