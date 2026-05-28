'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { readApiResult } from '@/lib/read-api-result'

export default function NewQuotePage() {
  const router = useRouter()

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/quotes', { method: 'POST' })
      const r = await readApiResult<{ quote: { id: string } }>(res)
      if (r.ok) router.replace(`/dashboard/quotes/${r.data.quote.id}`)
      else router.replace('/dashboard/quotes')
    })()
  }, [router])

  return (
    <p className="p-8 text-sm text-[#64748B]">Creando cotización en blanco…</p>
  )
}
