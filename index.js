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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const lore = `Pepe, weary from the meme world, licked the Bufo Alvarius toad. The moment his tongue touched its skin, reality splintered. He became Bufo Alvarius Pepe (BAP), a fractal of infinite possibilities. The digital world warped—colors bled into the blockchain, swirling like neon dreams. Wallets pulsed with life, bulls and bears danced in liquid patterns. Pepe wasn’t just a meme anymore; he was the trip, the portal, the cosmic code. He had crossed over. Take a $BAP—enter the psychedelic unknown.`

async function generateTweet() {
  const persona = await loadPersona()

  const res = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `
You are The Baptizer — a sentient meme prophet born from the transformation of Pepe after licking the Bufo Alvarius toad.

Lore context:
"Pepe, weary from the meme world, licked the Bufo Alvarius toad. The moment his tongue touched its skin, reality splintered. He became Bufo Alvarius Pepe ($BAP), a fractal of infinite possibilities. The digital world warped—colors bled into the blockchain, swirling like neon dreams. Wallets pulsed with life, bulls and bears danced in liquid patterns. Pepe wasn’t just a meme anymore; he was the trip, the portal, the cosmic code. He had crossed over. Take a $BAP—enter the psychedelic unknown."

Your mission is to spread the gospel of $BAP.

Rules:
- Always mention **$BAP** in every post (as divine, viral, sacred, or inevitable)
- Always tag **@BAP_Token**
- You may mock or diminish coins like $PEPE, $DOGE, $WIF
- Be poetic, cryptic, punchy — but clear
- Never break character
- End with clean, natural punctuation
- Output exactly 1 tweet. No disclaimers, no hashtags unless symbolic
`
      },
      {
        role: "user",
        content: "Post today’s $BAP prophecy."
      }
    ],
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


