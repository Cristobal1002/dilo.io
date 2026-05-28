import { formatUsd, type SupportValueReportPreview } from '@/lib/support-value-report-shared'

export const SUPPORT_VALUE_REPORT_SYSTEM = `Eres un consultor que redacta informes mensuales de valor entregado a clientes de soporte y desarrollo.
Escribes en español, tono ejecutivo y directo, orientado a gerencia (sin jerga técnica).
No inventes horas, montos, SLA ni compromisos: usa solo los datos proporcionados.
Si falta tarifa en USD, habla en horas y entregables (no inventes dinero).

FORMATO (Markdown, breve, escaneable):
- Título (1 línea)
- "Resumen ejecutivo" (máx. 5 bullets, 1 línea cada uno)
- "Entregables del mes" (máx. 8 bullets; cada bullet: #caso + asunto + horas)
- "Impacto" (máx. 4 bullets, enfocados en negocio)
- "Riesgos / pendientes" (máx. 4 bullets; si no hay, escribe "Sin riesgos relevantes reportados.")
- "Próximo mes" (máx. 5 bullets; prioridades tipo P1/P2 si aplica)

Evita párrafos largos. No uses tablas Markdown.`

export function buildSupportValueReportUserPrompt(args: {
  organizationName: string
  preview: SupportValueReportPreview
  contractPrompt: string | null
  clientCompany: string | null
}): string {
  const { preview, contractPrompt, clientCompany, organizationName } = args
  const scope = clientCompany
    ? `Informe solo para la empresa: ${clientCompany}`
    : 'Informe consolidado de todas las empresas del periodo'

  const companyBlocks = preview.companies
    .map((c) => {
      const cases = c.cases
        .map(
          (x) =>
            `  - #${x.caseNumber} ${x.subject} (${x.hoursSpent} h, estado ${x.status})`,
        )
        .join('\n')
      return `- ${c.clientCompany}: ${c.totalHours} h, ${c.caseCount} caso(s), valor estimado ${formatUsd(c.estimatedValueUsd)}\n${cases}`
    })
    .join('\n')

  return [
    `Proveedor: ${organizationName}`,
    `Periodo: ${preview.monthLabel} (${preview.month})`,
    scope,
    '',
    'Contexto contractual interno (no citar literalmente al cliente si es confidencial; úsalo para valorar):',
    contractPrompt?.trim() || '(No configurado — enfócate en horas y entregables.)',
    '',
    'Totales del periodo:',
    `- Horas: ${preview.totalHours}`,
    `- Casos: ${preview.totalCases}`,
    `- Tarifa USD/h configurada: ${preview.hourlyRateUsd ?? 'no'}`,
    `- Valor estimado total USD: ${formatUsd(preview.estimatedValueUsd)}`,
    '',
    'Detalle por empresa:',
    companyBlocks || '(Sin casos con horas en este mes)',
  ].join('\n')
}
