'use client'
import React, { useState } from 'react'
import { formatDate, getMethodColor } from '@/lib/utils'

interface InspectorProps {
  request: any
  onClose: () => void
  onSaveTemplate: (req: any) => void
}

export default function Inspector({ request: r, onClose, onSaveTemplate }: InspectorProps) {
  const [tab, setTab] = useState('Params')
  const [isPretty, setIsPretty] = useState(true)
  const [copied, setCopied] = useState(false)
  const [closing, setClosing] = useState(false)

  const handleClose = () => setClosing(true)

  React.useEffect(() => {
    if (closing) {
      const t = setTimeout(() => onClose(), 400)
      return () => clearTimeout(t)
    }
  }, [closing, onClose])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const renderKVTable = (record: Record<string, string>) => {
    const entries = Object.entries(record || {})
    if (entries.length === 0) return <div className="text-zinc-500 italic p-4 text-sm bg-[#1e1e1e] border border-[#333] rounded">No values provided.</div>
    return (
      <div className="border border-[#333] rounded overflow-hidden">
        <div className="grid grid-cols-12 bg-[#2a2a2a] border-b border-[#333] font-semibold text-xs text-zinc-500 tracking-wider uppercase text-zinc-500">
          <div className="col-span-4 px-3 py-2 border-r border-[#333]">Key</div>
          <div className="col-span-8 px-3 py-2">Value</div>
        </div>
        {entries.map(([k, v]) => (
          <div key={k} className="grid grid-cols-12 border-b border-[#333] last:border-b-0 bg-[#1e1e1e] hover:bg-[#252525] transition-colors">
            <div className="col-span-4 px-3 py-2 border-r border-[#333] font-mono text-zinc-300 break-all">{k}</div>
            <div className="col-span-8 px-3 py-2 font-mono text-zinc-300 break-all">{v as string}</div>
          </div>
        ))}
      </div>
    )
  }

  const renderResponseBlock = (respStr: string) => {
    if (!respStr) return <div className="p-4 text-zinc-500 italic text-sm">No body provided.</div>
    let display = respStr
    try {
      if (isPretty) {
        const outer = JSON.parse(respStr)
        if (outer.body && typeof outer.body === 'string') {
          try { outer.body = JSON.parse(outer.body) } catch (e) { }
        }
        display = JSON.stringify(outer, null, 2)
      }
    } catch { }

    return (
      <div className="border border-[#333] rounded-lg overflow-hidden bg-[#1e1e1e]">
        <div className="flex justify-between items-center bg-[#2a2a2a] border-b border-[#333] px-4 py-2">
          <span className="font-semibold text-zinc-500 tracking-wider text-xs uppercase italic">Payload Result</span>
          <div className="flex bg-[#1c1c1c] p-1 rounded border border-[#333]">
            <button onClick={() => setIsPretty(true)} className={`px-2 py-1 text-[10px] font-bold rounded transition ${isPretty ? 'bg-[#f26b3a] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>PRETTY</button>
            <button onClick={() => setIsPretty(false)} className={`px-2 py-1 text-[10px] font-bold rounded transition ${!isPretty ? 'bg-[#f26b3a] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>RAW</button>
          </div>
        </div>
        <pre className="p-4 text-xs font-mono text-zinc-300 overflow-auto max-h-[400px] leading-relaxed select-text">{display}</pre>
      </div>
    )
  }

  return (
    <div 
        className={`fixed inset-0 z-50 flex items-center justify-end bg-black/80 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`} 
        onClick={handleClose} 
        role="dialog" 
        aria-modal="true"
    >
      <div 
        className={`h-full w-full max-w-2xl bg-[#1c1c1c] shadow-[0_0_50px_rgba(0,0,0,0.5)] border-l border-[#333] flex flex-col transform ${closing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`} 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#333] bg-gradient-to-b from-[#2a2a2a]/50 to-transparent">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase border ${getMethodColor(r.method)} bg-zinc-800/50 tracking-widest`}>{r.method}</span>
                <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">{r.id.split('-')[0]}</span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Inspection Detail</h2>
              <div className="text-zinc-500 font-bold text-[9px] uppercase tracking-[0.2em] mt-1 opacity-60">Dispatched at {formatDate(r.createdAt)}</div>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-zinc-800 rounded-lg transition text-zinc-500 hover:text-white" aria-label="Close">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex items-center gap-3 p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 shadow-inner">
            <span className="text-zinc-500 text-sm">🌐</span>
            <span className="text-sm font-mono text-zinc-400 truncate flex-1 tracking-tight" title={r.url}>{r.url}</span>
            <button onClick={() => copyToClipboard(r.url)} className="p-2 hover:bg-zinc-800 rounded-lg transition text-zinc-500 hover:text-[#f26b3a] relative group" aria-label="Copy URL">
                {copied ? (
                    <svg className="w-4 h-4 text-green-500 animate-in zoom-in" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                )}
                <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-[#f26b3a] text-white text-[9px] font-bold uppercase rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none tracking-widest font-sans">
                    {copied ? 'Copied!' : 'Copy Endpoint'}
                </div>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#333] bg-[#222]">
          {['Params', 'Headers', 'Response'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-6 py-4 text-[11px] font-bold tracking-widest uppercase transition-all border-b-2 ${tab === t ? 'border-[#f26b3a] text-white bg-[#f26b3a]/5' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>{t}</button>
          ))}
          <button 
            onClick={() => onSaveTemplate(r)} 
            className="ml-auto mr-6 my-auto px-4 py-2 text-[10px] font-black bg-[#f26b3a] text-white rounded-lg uppercase tracking-widest hover:bg-[#e65c2b] shadow-lg shadow-[#f26b3a]/20 transition flex items-center gap-2"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
            Save Template
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8 space-y-8">
          {tab === 'Params' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-[1px] flex-1 bg-zinc-800"></div>
                <div className="text-zinc-500 font-bold text-[9px] uppercase tracking-[0.2em]">Query Parameters</div>
                <div className="h-[1px] flex-1 bg-zinc-800"></div>
              </div>
              {(() => {
                try {
                  const url = new URL(r.url)
                  const p: Record<string, string> = {}
                  url.searchParams.forEach((v, k) => { p[k] = v })
                  return renderKVTable(p)
                } catch {
                  return renderKVTable({})
                }
              })()}
              <div className="flex items-center gap-3 mt-10">
                <div className="h-[1px] flex-1 bg-zinc-800"></div>
                <div className="text-zinc-500 font-bold text-[9px] uppercase tracking-[0.2em]">Request Body</div>
                <div className="h-[1px] flex-1 bg-zinc-800"></div>
              </div>
              {renderResponseBlock(r.body)}
            </div>
          )}
          {tab === 'Headers' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-[1px] flex-1 bg-zinc-800"></div>
                <div className="text-zinc-500 font-bold text-[9px] uppercase tracking-[0.2em]">HTTP Headers</div>
                <div className="h-[1px] flex-1 bg-zinc-800"></div>
              </div>
              {renderKVTable(JSON.parse(r.headers || '{}'))}
            </div>
          )}
          {tab === 'Response' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-[1px] flex-1 bg-zinc-800"></div>
                <div className="text-zinc-500 font-bold text-[9px] uppercase tracking-[0.2em]">Execution Result</div>
                <div className="h-[1px] flex-1 bg-zinc-800"></div>
              </div>
              {r.status === 'EXECUTED' ? renderResponseBlock(r.response) : (
                <div className="p-16 text-center border-2 border-dashed border-zinc-800 rounded-3xl group hover:border-[#f26b3a]/30 transition-colors">
                  <div className="text-4xl mb-4 opacity-20 group-hover:opacity-40 transition-opacity">⏸</div>
                  <div className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest italic group-hover:text-zinc-500 transition-colors">No execution data available at this stage.</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
