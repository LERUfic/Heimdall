'use client'
import React, { useState } from 'react'

interface TemplateModalProps {
  onClose: () => void
  onSave: (name: string, isGlobal: boolean) => Promise<void>
}

export default function TemplateModal({ onClose, onSave }: TemplateModalProps) {
  const [name, setName] = useState('')
  const [isGlobal, setIsGlobal] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      await onSave(name, isGlobal)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose} aria-labelledby="modal-title" role="dialog">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-md w-full shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <h2 id="modal-title" className="text-xl font-bold text-white mb-4">Save as Blueprint</h2>
        <p className="text-sm text-zinc-400 mb-6">Persist this payload as a reusable Collection Blueprint for rapid enterprise execution.</p>

        <div className="space-y-4 mb-6">
          <div>
            <label htmlFor="template-name" className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-widest">Blueprint Name</label>
            <input
              id="template-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Production Cache Purge"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-[#f26b3a] outline-none transition"
              autoFocus
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer p-4 border border-zinc-700 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition group">
            <input
              type="checkbox"
              checked={isGlobal}
              onChange={e => setIsGlobal(e.target.checked)}
              className="w-5 h-5 accent-[#f26b3a] cursor-pointer"
            />
            <div>
              <span className="block text-sm font-bold text-white group-hover:text-[#f26b3a] transition">Global Enterprise Access</span>
              <span className="block text-[10px] text-zinc-500 uppercase tracking-tight mt-0.5">Allow authorized team members to utilize this blueprint.</span>
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-zinc-500 hover:text-white transition uppercase tracking-widest">Cancel</button>
          <button 
            onClick={handleSubmit} 
            disabled={!name.trim() || loading}
            className="px-6 py-2 bg-[#f26b3a] hover:bg-[#e65c2b] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg shadow-lg transition uppercase tracking-widest"
          >
            {loading ? 'Saving...' : 'Confirm Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
