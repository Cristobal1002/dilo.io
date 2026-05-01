/**
 * db/seed-plans.ts
 * Upsert de los planes base de Dilo en la tabla `plans`.
 *
 * Ejecutar después de hacer db:push:
 *   npx dotenv -e .env.local -- tsx db/seed-plans.ts
 *
 * Es idempotente: se puede ejecutar múltiples veces sin problema.
 * Para cambiar límites de un plan, edita aquí y vuelve a correr el seed.
 */

import 'dotenv/config'
import { db } from './index'
import { plans } from './schema'
import { sql } from 'drizzle-orm'

const PLANS = [
  {
    id: 'free',
    label: 'Free',
    flowsLimit: 1,
    sessionsMonthLimit: 50,
    membersLimit: 1,
    priceUsdMonthly: 0,
    isActive: true,
  },
  {
    id: 'pro',
    label: 'Pro',
    flowsLimit: 20,
    sessionsMonthLimit: 5_000,
    membersLimit: 5,
    priceUsdMonthly: 2_900,  // $29.00 USD
    isActive: true,
  },
  {
    id: 'agency',
    label: 'Agency',
    flowsLimit: -1,
    sessionsMonthLimit: -1,
    membersLimit: -1,
    priceUsdMonthly: 9_900,  // $99.00 USD
    isActive: true,
  },
] as const

async function seedPlans() {
  console.log('🌱 Seeding plans...')

  for (const plan of PLANS) {
    await db
      .insert(plans)
      .values(plan)
      .onConflictDoUpdate({
        target: plans.id,
        set: {
          label:              sql`excluded.label`,
          flowsLimit:         sql`excluded.flows_limit`,
          sessionsMonthLimit: sql`excluded.sessions_month_limit`,
          membersLimit:       sql`excluded.members_limit`,
          priceUsdMonthly:    sql`excluded.price_usd_monthly`,
          isActive:           sql`excluded.is_active`,
        },
      })

    const unlimited = (n: number) => (n === -1 ? '∞' : n.toLocaleString())
    console.log(
      `  ✓ ${plan.label.padEnd(8)} — flows: ${unlimited(plan.flowsLimit).padStart(4)}  ` +
      `sessions/mo: ${unlimited(plan.sessionsMonthLimit).padStart(6)}  ` +
      `members: ${unlimited(plan.membersLimit).padStart(4)}  ` +
      `price: $${(plan.priceUsdMonthly / 100).toFixed(2)}/mo`,
    )
  }

  console.log('\n✅ Plans seeded successfully.')
  process.exit(0)
}

seedPlans().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
