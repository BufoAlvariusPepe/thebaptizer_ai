import puppeteer from "puppeteer-extra"
import StealthPlugin from "puppeteer-extra-plugin-stealth"

puppeteer.use(StealthPlugin())
import * as dotenv from "dotenv"
import fs from "fs/promises"
import OpenAI from "openai"
import { setTimeout } from "node:timers/promises"

dotenv.config()

const COOKIES_PATH = "./cookies.json"
const personaPath = "./persona.json"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function generateTweet() {
  const assistantId = process.env.OPENAI_ASSISTANT_ID
  const thread = await openai.beta.threads.create()

  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: "Post today’s $BAP prophecy."
  })

  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: assistantId
  })

  let status = run.status
  while (status !== "completed") {
    await setTimeout(1000)
    const check = await openai.beta.threads.runs.retrieve(thread.id, run.id)
    status = check.status
  }

  const messages = await openai.beta.threads.messages.list(thread.id)
  const tweet = messages.data[0].content[0].text.value.trim()
  await updatePersona(tweet)
  return tweet
}

async function tweetWithPuppeteer(tweet) {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()

  try {
    const cookies = JSON.parse(await fs.readFile(COOKIES_PATH, "utf8"))
    await page.setCookie(...cookies)
    console.log("✅ Cookies geladen")
  } catch {
    console.log("🔐 Inloggen vereist...")
  }

  await page.goto("https://x.com/compose/tweet", { waitUntil: "networkidle2" })

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

  await page.goto("https://x.com/compose/tweet", { waitUntil: "networkidle2" })
  await page.waitForSelector('div[role="textbox"]')
  await page.type('div[role="textbox"]', tweet)
  await setTimeout(500)

  try {
    await page.waitForSelector('div[data-testid="tweetButton"]', { timeout: 3000 })
    const tweetButton = await page.$('div[data-testid="tweetButton"]')
    await tweetButton.click()
    console.log("✅ Tweet knop geklikt")
  } catch (err) {
    console.log("⚠️ Tweet knop niet gevonden — fallback naar Cmd+Enter")
    await page.keyboard.down("Meta")
    await page.keyboard.press("Enter")
    await page.keyboard.up("Meta")
  }

  await setTimeout(2000)
  const tweetUrl = page.url()

  let likes = 0, retweets = 0
  try {
    const metrics = await page.$$eval('div[data-testid="like"], div[data-testid="retweet"]', els =>
      els.map(el => el.closest('div[role="group"]')?.innerText || "0")
    )
    for (const metric of metrics) {
      const count = parseInt(metric.replace(/\D/g, ""), 10)
      if (metric.toLowerCase().includes("like")) likes = count
      if (metric.toLowerCase().includes("retweet")) retweets = count
    }
    console.log(`📊 Engagement scraped: ❤️ ${likes} | 🔁 ${retweets}`)
  } catch (e) {
    console.log("⚠️ Engagement ophalen mislukt:", e)
  }

  await updatePersona(tweet, { likes, retweets })
  await browser.close()
}

async function loadPersona() {
  try {
    return JSON.parse(await fs.readFile(personaPath, "utf8"))
  } catch {
    return { level: 1, xp: 0, mood: "mysterious", traits: ["smoke priest"], memory: [] }
  }
}

async function updatePersona(tweet, engagement = { likes: 0, retweets: 0 }) {
  const persona = await loadPersona()

  persona.memory.push({
    text: tweet,
    likes: engagement.likes,
    retweets: engagement.retweets,
    time: Date.now()
  })

  const xpFromEngagement = (engagement.likes * 10) + (engagement.retweets * 20)
  persona.xp += 100 + xpFromEngagement

  if (persona.xp >= persona.level * 500) {
    persona.level++
    persona.mood = persona.level >= 5 ? "aggressive" : persona.level >= 3 ? "enlightened" : "mysterious"
    console.log(`🧠 Baptizer evolved to level ${persona.level}, mood: ${persona.mood}`)
  }

  await fs.writeFile(personaPath, JSON.stringify(persona, null, 2))
}

;(async () => {
  const mode = process.argv[2] || "tweet"
  if (mode === "tweet") {
    const tweet = await generateTweet()
    await tweetWithPuppeteer(tweet)
  }
})()
