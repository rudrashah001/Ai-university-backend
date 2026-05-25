import 'dotenv/config'
import { seedSitWebsiteIfEmpty } from '../lib/seed-sit.js'

const force = process.argv.includes('--force')
const result = await seedSitWebsiteIfEmpty({ force })
console.log(result)
process.exit(result.seeded || result.reason === 'already_exists' ? 0 : 1)
