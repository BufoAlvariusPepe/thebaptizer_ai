import { generateTweet } from './tweet.js'
import { tweetWithPuppeteer } from './puppeteer.js'

;(async () => {
  try {
    const tweet = await generateTweet()
    console.log('📝 Final tweet:', tweet)
    await tweetWithPuppeteer(tweet)
  } catch (err) {
    console.error('❌ ERROR:', err.message)
  }
})()

