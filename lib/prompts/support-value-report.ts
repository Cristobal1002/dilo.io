import { formatUsd, type SupportValueReportPreview } from '@/lib/support-value-report-shared'

export const SUPPORT_VALUE_REPORT_SYSTEM = `Eres un consultor que redacta informes mensuales de valor entregado a clientes de soporte y desarrollo.
Escribes en español, tono profesional y claro, orientado al cliente final (no jerga interna).
No inventes horas ni montos: usa solo los datos proporcionados.
Si falta tarifa en USD, describe el valor en horas y beneficios sin inventar cifras en dólares.
Salida en Markdown: título, resumen ejecutivo (2-4 frases), sección de trabajo realizado por caso o agrupado, y cierre con valor para el negocio del cliente.`

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
