import puppeteer from "puppeteer-extra"
import StealthPlugin from "puppeteer-extra-plugin-stealth"

puppeteer.use(StealthPlugin())
import * as dotenv from "dotenv"
import fs from "fs/promises"
import OpenAI from "openai"
import { setTimeout } from "node:timers/promises" // ✅ hier komt de nieuwe timeout vandaan

dotenv.config()

const COOKIES_PATH = "./cookies.json"
const personaPath = "./persona.json"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

async function generateTweet() {
  const persona = await loadPersona()
const prompt = `You are The Baptizer — a meme prophet. Your sacred gospel must always include the word "$BAP", in a natural or symbolic way. Traits: ${persona.traits.join(", ")}. Mood: ${persona.mood}. Level: ${persona.level}.
Write one cryptic tweet in style.`

  const res = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 280
  })

  const tweet = res.choices[0].message.content.trim()
  await updatePersona(tweet)
  return tweet
}

async function tweetWithPuppeteer(tweet) {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()

  // Cookies laden
  try {
    const cookies = JSON.parse(await fs.readFile(COOKIES_PATH, "utf8"))
    await page.setCookie(...cookies)
    console.log("✅ Cookies geladen")
  } catch {
    console.log("🔐 Inloggen vereist...")
  }

  await page.goto("https://x.com/compose/tweet", { waitUntil: "networkidle2" })

  // Check of we ingelogd zijn
  if (page.url().includes("login")) {
    await page.goto("https://x.com/login", { waitUntil: "networkidle2" })

    await page.waitForSelector('input[autocomplete="username"]', { visible: true })
    await page.type('input[autocomplete="username"]', process.env.TWITTER_USERNAME)
    await page.keyboard.press("Enter")
    await setTimeout(1500)

    await page.waitForSelector('input[name="password"]', { visible: true })
    await page.type('input[name="password"]', process.env.TWITTER_PASSWORD)
    await page.keyboard.press("Enter")

    console.log("📲 Vul 2FA handmatig in...")
    await page.waitForNavigation({ waitUntil: "networkidle2" })

    const cookies = await page.cookies()
    await fs.writeFile(COOKIES_PATH, JSON.stringify(cookies, null, 2))
    console.log("✅ Cookies opgeslagen")
  }

  // Tweeten
  await page.goto("https://x.com/compose/tweet", { waitUntil: "networkidle2" })
  await page.waitForSelector('div[role="textbox"]')
  await page.type('div[role="textbox"]', tweet)
  await setTimeout(500) // even laten laden

try {
  await page.waitForSelector('div[data-testid="tweetButton"]', { timeout: 3000 })
  const tweetButton = await page.$('div[data-testid="tweetButton"]')
  await tweetButton.click()
  console.log("✅ Tweet knop geklikt")
} catch (err) {
  console.log("⚠️ Tweet knop niet gevonden — fallback naar Cmd+Enter")
  await page.keyboard.down("Meta") // Voor Mac: gebruik "Meta" voor Cmd
  await page.keyboard.press("Enter")
  await page.keyboard.up("Meta")
}

  await setTimeout(2000)
  const currentUrl = page.url()
  console.log("🚀 Mogelijk gepost op:", currentUrl)

  await browser.close()
}

async function loadPersona() {
  try {
    return JSON.parse(await fs.readFile(personaPath, "utf8"))
  } catch {
    return { level: 1, xp: 0, mood: "mysterious", traits: ["smoke priest"], memory: [] }
  }
}

async function updatePersona(tweet) {
  const persona = await loadPersona()
  persona.memory.push(tweet)
  persona.xp += 100
  if (persona.xp >= persona.level * 500) {
    persona.level++
    persona.mood = "enlightened"
  }
  await fs.writeFile(personaPath, JSON.stringify(persona, null, 2))
}

(async () => {
  const tweet = await generateTweet()
  await tweetWithPuppeteer(tweet)
})()

