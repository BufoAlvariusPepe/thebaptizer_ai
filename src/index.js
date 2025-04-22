// src/index.js
import { generateTweet } from './tweet.js'
import { tweetWithPuppeteer } from './puppeteer.js'

const main = async () => {
  try {
    const tweet = await generateTweet()
    console.log(`🧵 Prophecy generated:\n${tweet}`)
    await tweetWithPuppeteer(tweet)
  } catch (err) {
    console.error('⚠️ Failed to generate/post tweet:', err)
  }
}

main()

