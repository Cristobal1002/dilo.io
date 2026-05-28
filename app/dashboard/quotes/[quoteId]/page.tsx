import { QuoteDocumentEditor } from '@/components/quote-document-editor'
import { dashboardPageWideClass } from '@/lib/dashboard-page-layout'

export default async function QuoteEditorPage({
  params,
}: {
  params: Promise<{ quoteId: string }>
}) {
  const { quoteId } = await params
  return (
    <div className={dashboardPageWideClass}>
      <QuoteDocumentEditor quoteId={quoteId} />
    </div>
  )
}
