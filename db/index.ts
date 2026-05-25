import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { logDatabaseConnectionOnce } from '@/lib/database-info'
import * as schema from './schema'

logDatabaseConnectionOnce()

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })

export * from './schema'