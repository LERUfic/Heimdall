'use client'
import React from 'react'
import Link from 'next/link'
import { getStatusColor, getMethodColor, getHttpStatusColor } from '@/lib/utils'
import { HttpRequestData, UserSession } from '@/lib/types'

interface RequestRowProps {
  request: HttpRequestData
  user: UserSession
  loadingAction: string | null
  onAction: (e: React.MouseEvent, id: string, action: 'approve' | 'reject' | 'execute') => void
  onClone: (e: React.MouseEvent, r: HttpRequestData) => void
  onSave: (e: React.MouseEvent, r: HttpRequestData) => void
  onSelect: (r: HttpRequestData) => void
}

export default function RequestRow({ request: r, user, loadingAction, onAction, onClone, onSave, onSelect }: RequestRowProps) {
  return (
    <tr onClick={() => onSelect(r)} className="border-b border-[#333] hover:bg-[#252525] transition cursor-pointer group">
      <td className="p-4 text-zinc-500 font-mono text-xs tracking-tighter uppercase">{r.id.split('-')[0]}</td>
      <td className="p-4">
        <span className={`font-bold tracking-widest text-[10px] uppercase border px-2 py-0.5 rounded ${getMethodColor(r.method)} bg-zinc-800/50`}>
          {r.method}
        </span>
      </td>
      <td className="p-4 text-zinc-300 font-mono text-sm max-w-[300px] truncate" title={r.url}>{r.url}</td>
      <td className="p-4">
        <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-tight ${getStatusColor(r.status)} bg-zinc-800/30`}>
          {r.status}
        </span>
      </td>
      <td className="p-4">
        {(() => {
          if (r.status !== 'EXECUTED' || !r.response) return <span className="text-zinc-600 font-mono">-</span>;
          let code: number | null = null;
          try {
            code = parseInt(JSON.parse(r.response).status);
          } catch {
            return <span className="text-zinc-500 font-mono">Err</span>;
          }
          return <span className={`font-mono font-bold ${getHttpStatusColor(code || 0)}`}>{code || 'Err'}</span>;
        })()}
      </td>
      {user.role === 'APPROVER' && <td className="p-4 text-sm text-zinc-400 font-medium">{r.requester?.username || 'Unknown'}</td>}
      <td className="p-4">
        <div className="flex gap-2 items-center">
          {user.role === 'APPROVER' && r.status === 'PENDING' && r.requesterId !== user.id && (
            <div className="flex gap-1.5">
              <button
                disabled={!!loadingAction}
                onClick={(e) => onAction(e, r.id, 'approve')}
                className="px-3 py-1 bg-green-600/10 hover:bg-green-600 text-green-500 hover:text-white text-[10px] font-bold rounded transition uppercase tracking-widest border border-green-600/30 flex items-center gap-1.5 cursor-pointer"
                title="Approve Request"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                Approve
              </button>
              <button
                disabled={!!loadingAction}
                onClick={(e) => onAction(e, r.id, 'reject')}
                className="px-3 py-1 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white text-[10px] font-bold rounded transition uppercase tracking-widest border border-red-600/30 flex items-center gap-1.5 cursor-pointer"
                title="Reject Request"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                Reject
              </button>
            </div>
          )}
          {r.requesterId === user.id && r.status === 'APPROVED' && (
            <button
                disabled={!!loadingAction}
                onClick={(e) => onAction(e, r.id, 'execute')}
                className="px-4 py-1 bg-[#f26b3a] hover:bg-[#e65c2b] text-white text-[10px] font-bold rounded transition uppercase tracking-widest shadow-lg flex items-center gap-2 cursor-pointer"
                title="Execute Pipeline"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Execute
            </button>
          )}
          <div className="flex gap-1 ml-auto opacity-60 hover:opacity-100 transition items-center">
            {r.status === 'PENDING' && (r.requesterId === user.id || user.role === 'APPROVER') && (
              <div className="relative group/tip">
                <Link href={`/edit/${r.id}`} aria-label="Edit" className="p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-amber-400 rounded-lg transition flex items-center justify-center cursor-pointer">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </Link>
                <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-1 bg-zinc-800 text-white text-[10px] font-bold uppercase rounded opacity-0 group-hover/tip:opacity-100 transition whitespace-nowrap pointer-events-none ring-1 ring-zinc-700 shadow-2xl z-[60]">Edit Detail</div>
              </div>
            )}
            <div className="relative group/tip">
              <button
                onClick={(e) => onClone(e, r)}
                aria-label="Clone"
                className="p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-sky-400 rounded-lg transition flex items-center justify-center cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
              </button>
              <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-1 bg-zinc-800 text-white text-[10px] font-bold uppercase rounded opacity-0 group-hover/tip:opacity-100 transition whitespace-nowrap pointer-events-none ring-1 ring-zinc-700 shadow-2xl z-[60]">Clone Data</div>
            </div>
            <div className="relative group/tip">
              <button
                onClick={(e) => onSave(e, r)}
                aria-label="Save"
                className="p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-violet-400 rounded-lg transition flex items-center justify-center cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
              </button>
              <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-1 bg-zinc-800 text-white text-[10px] font-bold uppercase rounded opacity-0 group-hover/tip:opacity-100 transition whitespace-nowrap pointer-events-none ring-1 ring-zinc-700 shadow-2xl z-[60]">Save Blueprint</div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  )
}
