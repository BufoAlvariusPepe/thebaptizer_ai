// env-test.mjs
import dotenv from 'dotenv'
dotenv.config()

console.log('✅ KEY:', process.env.OPENAI_API_KEY?.slice(0, 8) + '...')
console.log('✅ ID:', process.env.OPENAI_ASSISTANT_ID)

