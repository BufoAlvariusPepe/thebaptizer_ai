// puppeteer.js
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import fs from 'fs/promises'
import { setTimeout } from 'node:timers/promises'
import { updatePersona } from './persona.js'

puppeteer.use(StealthPlugin())

const COOKIES_PATH = './cookies.json'

export async function tweetWithPuppeteer(tweet) {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()

  try {
    const cookies = JSON.parse(await fs.readFile(COOKIES_PATH, 'utf8'))
    await page.setCookie(...cookies)
    console.log('✅ Cookies geladen')
  } catch {
    console.log('🔐 Login vereist')
  }

  await page.goto('https://x.com/compose/tweet', { waitUntil: 'networkidle2' })
  await page.waitForSelector('div[role="textbox"]', { visible: true })
  await page.focus('div[role="textbox"]')
  await page.keyboard.type(tweet)
  await setTimeout(500)

  try {
    await page.keyboard.down('Meta')
    await page.keyboard.press('Enter')
    await page.keyboard.up('Meta')
    console.log('✅ Tweet gepost via Cmd+Enter')
  } catch {
    console.log('⚠️ Fallback werkt niet, handmatig checken')
  }

  await setTimeout(2000)
  await updatePersona(tweet, { likes: 0, retweets: 0 })
  await browser.close()
}
