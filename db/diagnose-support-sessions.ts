/**
 * Diagnóstico: sesiones completadas vs casos de soporte.
 *
 * Uso:
 *   npx dotenv -e .env.local -- tsx db/diagnose-support-sessions.ts
 *   npx dotenv -e .env.local -- tsx db/diagnose-support-sessions.ts --sync
 */
import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { answers, flows, organizations, results, sessions, steps, supportCases } from '@/db/schema'
import { isSupportFlow } from '@/lib/support-flow-purpose'
import { syncSupportCasesForOrganization } from '@/lib/support-case-sync'

async function getAsunto(sessionId: string, flowId: string): Promise<string | null> {
  const asuntoStep = await db.query.steps.findFirst({
    where: and(eq(steps.flowId, flowId), eq(steps.variableName, 'asunto')),
    columns: { id: true },
  })
  if (!asuntoStep) return null
  const row = await db.query.answers.findFirst({
    where: and(eq(answers.sessionId, sessionId), eq(answers.stepId, asuntoStep.id)),
    columns: { value: true },
  })
  return row?.value?.trim() || null
}

async function main() {
  const doSync = process.argv.includes('--sync')

  const orgs = await db.query.organizations.findMany({
    columns: { id: true, name: true, slug: true },
    orderBy: asc(organizations.name),
  })

  console.log('\n=== Diagnóstico sesiones ↔ casos de soporte ===\n')

  for (const org of orgs) {
    const flowRows = await db.query.flows.findMany({
      where: eq(flows.organizationId, org.id),
      columns: { id: true, name: true, settings: true, status: true },
    })

    const supportFlows = flowRows.filter((f) => isSupportFlow(f.settings))
    const allFlowIds = flowRows.map((f) => f.id)

    const cases = await db.query.supportCases.findMany({
      where: eq(supportCases.organizationId, org.id),
      columns: {
        id: true,
        caseNumber: true,
        sessionId: true,
        subject: true,
        type: true,
        flowId: true,
      },
      orderBy: asc(supportCases.caseNumber),
    })

    const completedAll = await db.query.sessions.findMany({
      where: and(eq(sessions.status, 'completed'), inArray(sessions.flowId, allFlowIds)),
      columns: {
        id: true,
        flowId: true,
        completedAt: true,
        startedAt: true,
      },
      orderBy: asc(sessions.completedAt),
    })

    const completedSupportFlowIds = new Set(supportFlows.map((f) => f.id))
    const completedOnSupportFlows = completedAll.filter((s) =>
      completedSupportFlowIds.has(s.flowId),
    )

    const caseSessionIds = new Set(
      cases.map((c) => c.sessionId).filter((id): id is string => Boolean(id)),
    )

    const missingOnSupportFlows = completedOnSupportFlows.filter(
      (s) => !caseSessionIds.has(s.id),
    )

    const completedNotSupportPurpose = completedAll.filter(
      (s) => !completedSupportFlowIds.has(s.flowId),
    )

    const orphanCases = cases.filter(
      (c) => c.sessionId && !completedAll.some((s) => s.id === c.sessionId),
    )

    if (
      cases.length === 0 &&
      completedAll.length === 0 &&
      supportFlows.length === 0
    ) {
      continue
    }

    console.log(`\n── ${org.name} (${org.slug}) ──`)
    console.log(`  Flows con purpose=support: ${supportFlows.length}`)
    for (const f of supportFlows) {
      console.log(`    · [${f.status}] ${f.name} (${f.id})`)
    }
    if (supportFlows.length === 0 && completedAll.length > 0) {
      console.log(
        '  ⚠ Ningún flow tiene settings.purpose=support. Las sesiones completadas NO crean casos automáticos.',
      )
      const byFlow = new Map<string, number>()
      for (const s of completedAll) {
        byFlow.set(s.flowId, (byFlow.get(s.flowId) ?? 0) + 1)
      }
      for (const f of flowRows) {
        const n = byFlow.get(f.id) ?? 0
        if (n > 0) {
          console.log(`    · ${n} sesión(es) en "${f.name}" [${f.status}] — sin bandeja soporte`)
        }
      }
    }

    console.log(`  Casos en Soporte: ${cases.length}`)
    for (const c of cases) {
      console.log(
        `    #${c.caseNumber} [${c.type}] ${c.subject.slice(0, 60)}${c.subject.length > 60 ? '…' : ''} → session ${c.sessionId ?? '—'}`,
      )
    }

    console.log(`  Sesiones completadas (flows soporte): ${completedOnSupportFlows.length}`)
    console.log(`  Sesiones completadas (otros flows): ${completedNotSupportPurpose.length}`)

    if (missingOnSupportFlows.length > 0) {
      console.log(`\n  ❌ SIN CASO (${missingOnSupportFlows.length} sesiones en flows de soporte):`)
      for (const s of missingOnSupportFlows) {
        const flow = supportFlows.find((f) => f.id === s.flowId)
        const asunto = await getAsunto(s.id, s.flowId)
        const hasResult = await db.query.results.findFirst({
          where: eq(results.sessionId, s.id),
          columns: { id: true },
        })
        const when = s.completedAt
          ? s.completedAt.toISOString().slice(0, 16).replace('T', ' ')
          : '?'
        console.log(`    · ${when} | ${flow?.name ?? s.flowId}`)
        console.log(`      session: ${s.id}`)
        console.log(`      asunto: ${asunto ?? '(sin asunto)'}`)
        console.log(`      tiene result: ${hasResult ? 'sí' : 'no — no se disparó creación de caso'}`)
      }
    } else if (completedOnSupportFlows.length > cases.length) {
      console.log(
        `\n  ⚠ Más sesiones completadas (${completedOnSupportFlows.length}) que casos (${cases.length}) pero todas tienen caso asignado por sessionId.`,
      )
    }

    if (completedNotSupportPurpose.length > 0 && supportFlows.length > 0) {
      console.log(
        `\n  ℹ Sesiones en flows SIN purpose=support (aparecen en Resultados pero no en Soporte):`,
      )
      const byFlow = new Map<string, typeof completedNotSupportPurpose>()
      for (const s of completedNotSupportPurpose) {
        const list = byFlow.get(s.flowId) ?? []
        list.push(s)
        byFlow.set(s.flowId, list)
      }
      for (const [flowId, list] of byFlow) {
        const f = flowRows.find((x) => x.id === flowId)
        console.log(`    · "${f?.name ?? flowId}" — ${list.length} sesión(es)`)
        for (const s of list.slice(0, 8)) {
          const asunto = await getAsunto(s.id, s.flowId)
          const when = s.completedAt
            ? s.completedAt.toISOString().slice(0, 16).replace('T', ' ')
            : '?'
          console.log(`      - ${when} | ${asunto ?? '(sin asunto)'} | ${s.id}`)
        }
        if (list.length > 8) console.log(`      … y ${list.length - 8} más`)
      }
    }

    if (orphanCases.length > 0) {
      console.log(`\n  Casos sin sesión completada encontrada: ${orphanCases.length}`)
    }

    if (doSync && supportFlows.length > 0) {
      console.log('\n  → Ejecutando sync…')
      const r = await syncSupportCasesForOrganization(org.id)
      console.log(
        `  → Sync: ${r.created} creados, ${r.typesUpdated} tipos corregidos, ${r.skipped} omitidos`,
      )
    }
  }

  console.log('\n=== Fin ===')
  if (!doSync) {
    console.log('Para crear casos faltantes: añade --sync al comando\n')
  } else {
    console.log('\nRecarga /dashboard/support para ver los casos nuevos.\n')
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
