import { generateText } from 'ai'
import { getFastTextModel } from '@/lib/ai-model'
import { searchKnowledgeArticles } from '@/lib/knowledge-articles'

export async function runDeflectionAssist(args: {
  organizationId: string
  query: string
  clientId?: string | null
  flowName: string
}): Promise<{ answer: string; articleTitles: string[] }> {
  const articles = await searchKnowledgeArticles({
    organizationId: args.organizationId,
    query: args.query,
    clientId: args.clientId,
    limit: 5,
  })

  const kbBlock =
    articles.length > 0
      ? articles.map((a) => `### ${a.title}\n${a.body}`).join('\n\n')
      : '(No hay artículos que coincidan con la consulta.)'

  const system = [
    'Eres un asistente de soporte de primera línea para un producto B2B.',
    'Respondes en español, tono claro y amable, sin ser verboso.',
    'Usa SOLO la base de conocimiento provista. Si no alcanza, dilo con honestidad y sugiere contactar al equipo.',
    'No inventes políticas, plazos ni datos que no estén en los artículos.',
    'Máximo 3 párrafos cortos. Sin markdown complejo.',
  ].join('\n')

  const prompt = [
    `Flow: ${args.flowName}`,
    `Consulta del usuario: ${args.query.trim()}`,
    '',
    'Base de conocimiento:',
    kbBlock,
  ].join('\n')

  try {
    const { text } = await generateText({
      model: getFastTextModel(),
      system,
      prompt,
      maxOutputTokens: 600,
      abortSignal: AbortSignal.timeout(25_000),
    })
    const answer = (text ?? '').trim().slice(0, 4000)
    return {
      answer: answer || 'No encontré una respuesta clara. Puedes continuar con el formulario y el equipo te ayudará.',
      articleTitles: articles.map((a) => a.title),
    }
  } catch {
    if (articles.length === 0) {
      return {
        answer:
          'No encontré artículos relacionados. Continúa con el formulario y nuestro equipo revisará tu solicitud.',
        articleTitles: [],
      }
    }
    const fallback = articles[0]
    return {
      answer: `${fallback.body.slice(0, 1200)}${fallback.body.length > 1200 ? '…' : ''}`,
      articleTitles: articles.map((a) => a.title),
    }
  }
}
