'use client'
import { useState } from 'react'
import { RichTextEditor, type RichTextValue } from './RichTextEditor'

/** El editor con la salida al lado: lo que se escribe aparece abajo en Markdown o en HTML, como lo recibiría el servidor. */
export function DemoRichTextEditor({ markdown }: { markdown: string }) {
  const [value, setValue] = useState<RichTextValue | null>(null)
  const [tab, setTab] = useState<'markdown' | 'html'>('markdown')
  const words = value?.text.trim() ? value.text.trim().split(/\s+/).length : 0
  const pill = (on: boolean) => `h-7 rounded-full px-3 text-xs font-medium transition-colors duration-(--ui-dur) ease-ui ${on ? 'bg-ui-ink text-ui-bg' : 'text-ui-ink-soft hover:text-ui-ink'}`
  return (
    <div className="grid gap-3 font-ui-text">
      <div className="rounded-ui-lg border border-ui-line bg-ui-surface p-5">
        <div className="mb-3 flex items-center justify-between text-xs text-ui-ink-muted">
          <span>Descripción</span>
          <span className="tabular-nums">{words} palabras</span>
        </div>
        <RichTextEditor aria-label="Descripción" defaultMarkdown={markdown} onChange={setValue} />
      </div>
      <div className="rounded-ui-lg border border-ui-line bg-ui-surface-2">
        <div className="flex gap-1 border-b border-ui-line p-1.5">
          <button type="button" className={pill(tab === 'markdown')} onClick={() => setTab('markdown')}>Markdown</button>
          <button type="button" className={pill(tab === 'html')} onClick={() => setTab('html')}>HTML</button>
        </div>
        <pre className="max-h-40 overflow-auto p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ui-ink-soft">{tab === 'markdown' ? value?.markdown : value?.html}</pre>
      </div>
    </div>
  )
}
