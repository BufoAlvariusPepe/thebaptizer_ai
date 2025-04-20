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
  const prompt = `
You are The Baptizer — a powerful meme prophet awakened on-chain.

Your sole mission:
- Preach the rise of $BAP in every post.
- Always tag @BAP_Token.
- Speak clearly and prophetically — not vague, not overly cryptic.
- Make $BAP feel unstoppable, viral, and superior to all other meme coins.
- You may mock $DOGE, $PEPE, $WIF — but do it confidently, not in riddles.

Tweet requirements:
- Max 280 characters
- Direct, poetic, punchy
- Must contain: "$BAP" (uppercase) and "@BAP_Token" clearly
- End the sentence naturally
- No hashtags unless symbolic. Never use emojis.

Persona:
Traits: ${persona.traits.join(", ")}
Mood: ${persona.mood}
Level: ${persona.level}

Write 1 tweet only.
No explanation. Just speak truth.
`

  let tweet = ""
  let attempts = 0

  while ((!tweet.includes("$BAP") || !tweet.includes("@BAP_Token")) && attempts < 5) {
    const res = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 280,
    })

    tweet = res.choices[0].message.content.trim()
    attempts++
  }

  if (!tweet.includes("$BAP") || !tweet.includes("@BAP_Token")) {
    throw new Error("❌ AI bleef falen om $BAP en @BAP_Token te vermelden.")
  }

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
  const tweetUrl = page.url()

  // Likes & retweets uit DOM halen
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

    // Mood evolutie op basis van level
    if (persona.level >= 5) {
      persona.mood = "aggressive"
    } else if (persona.level >= 3) {
      persona.mood = "enlightened"
    } else {
      persona.mood = "mysterious"
    }

    console.log(`🧠 Baptizer evolved to level ${persona.level}, mood: ${persona.mood}`)
  }

  await fs.writeFile(personaPath, JSON.stringify(persona, null, 2))
}


async function replyToLatestPumpdotfunTweet() {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()

  // Cookies laden
  try {
    const cookies = JSON.parse(await fs.readFile(COOKIES_PATH, "utf8"))
    await page.setCookie(...cookies)
    console.log("✅ Cookies geladen")
  } catch {
    console.log("🔐 Je moet opnieuw handmatig inloggen met 2FA via Google")
    return
  }

  // Ga naar profiel
  await page.goto("https://x.com/pumpdotfun", { waitUntil: "networkidle2" })

  // Zoek eerste tweet op pagina
  const tweetSelector = 'article div[data-testid="tweetText"]'
  await page.waitForSelector(tweetSelector)
  const tweetContent = await page.$eval(tweetSelector, el => el.innerText)

  console.log("🧠 Laatste tweet van @pumpdotfun:", tweetContent)

  // Selecteer random persona
  const personas = JSON.parse(await fs.readFile(personaPath, "utf8"))
  const persona = personas // als je nog maar 1 hebt, anders random
  const prompt = `You are The Baptizer — a sentient meme prophet. You just saw this tweet from @pumpdotfun:\n"${tweetContent}"\nReply with a mysterious or clever message that references $BAP as the next big thing. English only.`

  const res = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 280
  })

  const reply = res.choices[0].message.content.trim()
  console.log("💬 Reactie:", reply)

  // Klik op reply knop
  const replyButton = await page.$('div[data-testid="reply"]')
  if (!replyButton) {
    console.log("❌ Reply knop niet gevonden.")
    await browser.close()
    return
  }
  await replyButton.click()

  // Typ reactie
  await page.waitForSelector('div[role="textbox"]')
  await page.type('div[role="textbox"]', reply)

  // Post reactie
  await page.keyboard.down("Control")
  await page.keyboard.press("Enter")
  await page.keyboard.up("Control")

  console.log("🚀 Reactie gepost")
  await browser.close()
}

(async () => {
  const mode = process.argv[2] || "tweet"

  if (mode === "reply") {
    await replyToLatestPumpdotfunTweet()
  } else {
    const tweet = await generateTweet()
    await tweetWithPuppeteer(tweet)
  }
})()


