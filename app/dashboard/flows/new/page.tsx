'use client'

import { useState } from 'react'
import Link from 'next/link'
import { NewFlowClassicForm } from '@/components/new-flow-classic-form'
import { NewFlowConversation } from '@/components/new-flow-conversation'
import { cn } from '@/lib/utils'

export default function NewFlowPage() {
  const [mode, setMode] = useState<'chat' | 'classic'>('chat')

  return (
    <div className="mx-auto max-w-xl px-3 py-6 sm:max-w-2xl sm:px-4">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Volver al panel
      </Link>
      <div className="mb-5 border-b border-[#9C77F5]/12 pb-5 dark:border-[#2A2F3F]">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Crear con Dilo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          La misma generación por IA: elige chat guiado o rellena la vista clásica con tono, descripción y saludo.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Modo de creación">
          <span className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">Modo</span>
          <div className="inline-flex flex-wrap items-center gap-1">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'chat'}
              onClick={() => setMode('chat')}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-xs transition-colors duration-200',
                mode === 'chat'
                  ? 'border-[#9C77F5]/28 bg-[#9C77F5]/10 font-medium text-[#5B3FC9] dark:border-[#9C77F5]/35 dark:bg-[#9C77F5]/14 dark:text-[#E9D5FF]'
                  : 'border-transparent bg-transparent font-medium text-[#64748B] hover:bg-black/4 hover:text-[#475569] dark:text-[#94A3B8] dark:hover:bg-white/5 dark:hover:text-[#CBD5E1]',
              )}
            >
              Chat guiado
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'classic'}
              onClick={() => setMode('classic')}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-xs transition-colors duration-200',
                mode === 'classic'
                  ? 'border-[#9C77F5]/28 bg-[#9C77F5]/10 font-medium text-[#5B3FC9] dark:border-[#9C77F5]/35 dark:bg-[#9C77F5]/14 dark:text-[#E9D5FF]'
                  : 'border-transparent bg-transparent font-medium text-[#64748B] hover:bg-black/4 hover:text-[#475569] dark:text-[#94A3B8] dark:hover:bg-white/5 dark:hover:text-[#CBD5E1]',
              )}
            >
              Vista clásica
            </button>
          </div>
        </div>
      </div>

      {mode === 'chat' ? <NewFlowConversation /> : <NewFlowClassicForm />}
    </div>
  )
}
