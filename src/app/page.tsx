'use client'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import Inspector from '@/components/Inspector'
import TemplateModal from '@/components/TemplateModal'
import RequestRow from '@/components/RequestRow'
import { HttpRequestData, UserSession } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function Dashboard() {
  const router = useRouter()
  const { data: auth, error: authError } = useSWR<{ user: UserSession } | null>('/api/auth/me', fetcher)
  const [selectedRequest, setSelectedRequest] = useState<HttpRequestData | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [showSaveModal, setShowSaveModal] = useState<HttpRequestData | null>(null)
  const [toast, setToast] = useState<{ msg: string, type: 'error' | 'success' } | null>(null)

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  const { data: reqs, mutate } = useSWR(auth?.user ? `/api/requests?q=${encodeURIComponent(debouncedQuery)}` : null, fetcher)

  useEffect(() => {
    if (authError || (auth && !auth.user)) {
      router.push('/login')
    }
  }, [auth, authError, router])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedRequest(null)
        setShowSaveModal(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (authError || (auth && !auth.user)) return null
  if (!auth || !reqs) return <div className="min-h-screen bg-[#1c1c1c] p-8 text-white flex justify-center items-center font-mono italic opacity-50 uppercase tracking-[0.2em]">Synchronizing...</div>

  const handleAction = async (e: React.MouseEvent, id: string, action: 'approve' | 'reject' | 'execute') => {
    e.stopPropagation()
    setLoadingAction(`${action}-${id}`)
    try {
      const res = await fetch(`/api/requests/${id}/${action}`, { method: 'POST' })
      if (res.ok) {
        mutate()
        showToast(`Request ${action}d successfully`, 'success')
        if (selectedRequest && selectedRequest.id === id) setSelectedRequest(null)
      } else {
        const err = await res.json()
        showToast('Failed: ' + err.error, 'error')
      }
    } finally {
      setLoadingAction(null)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const handleClone = (e: React.MouseEvent, r: HttpRequestData) => {
    e.stopPropagation()
    sessionStorage.setItem('clone_request', JSON.stringify(r))
    router.push('/create')
  }

  const handleSaveCollection = async (name: string, isGlobal: boolean) => {
    if (!showSaveModal) return
    const res = await fetch('/api/collections', {
      method: 'POST',
      body: JSON.stringify({
        name,
        method: showSaveModal.method,
        url: showSaveModal.url,
        headers: showSaveModal.headers,
        body: showSaveModal.body,
        isGlobal
      })
    })
    if (res.ok) {
      setShowSaveModal(null)
      showToast('Template saved to Collections!', 'success')
    } else {
      const err = await res.json()
      showToast('Failed: ' + err.error, 'error')
    }
  }

  return (
    <div className="min-h-screen bg-[#1c1c1c] p-8 text-white font-sans selection:bg-[#f26b3a]/30">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-12">
            <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition cursor-pointer group">
              <div className="relative">
                <div className="absolute inset-0 bg-[#f26b3a] blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <Image src="/logo.svg" alt="Heimdall Logo" width={48} height={48} className="relative z-10" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-3xl font-black tracking-tighter text-white leading-none italic uppercase">HEIMDALL</h1>
                <span className="text-[10px] font-black text-[#00C2FF] tracking-[.4em] leading-none mt-1.5 uppercase opacity-80">Security Audit Platform</span>
              </div>
            </Link>
            <nav className="flex gap-8 text-[11px] font-black tracking-[0.15em] mt-2 uppercase">
              <Link href="/" className="text-[#f26b3a] border-b-2 border-[#f26b3a] pb-2">Dashboard</Link>
              <Link href="/collections" className="text-zinc-500 hover:text-zinc-200 transition pb-2">Collections</Link>
            </nav>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Logged in as</span>
              <span className="text-sm font-black text-white italic tracking-tight">{auth.user.username} <span className="text-[10px] text-[#f26b3a] not-italic ml-1">[{auth.user.role}]</span></span>
            </div>
            <button
              onClick={handleLogout}
              className="p-3 bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition border border-zinc-700/50 hover:border-zinc-600 shadow-xl flex items-center gap-2 group cursor-pointer"
              title="Log Out of Session"
              aria-label="Logout"
            >
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex justify-between items-center mb-10 gap-6">
          <div className="relative flex-1 max-w-lg group">
            <div className="absolute inset-y-0 left-4 flex items-center text-zinc-600 group-focus-within:text-[#f26b3a] transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input
              type="text"
              placeholder="Search by ID, URL, Method, or Status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#2a2a2a] border border-[#333] pl-12 pr-4 py-3 rounded-2xl text-sm text-zinc-300 outline-none focus:border-[#f26b3a] focus:ring-4 focus:ring-[#f26b3a]/10 transition shadow-inner placeholder:text-zinc-600 placeholder:italic placeholder:font-medium"
            />
          </div>
          <Link href="/create" className="bg-gradient-to-r from-[#f26b3a] to-[#e65c2b] hover:from-[#e65c2b] hover:to-[#f26b3a] text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-[#f26b3a]/20 hover:scale-[1.02] active:scale-[0.98] transition flex items-center gap-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
            New Request
          </Link>
        </div>

        {/* Table */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-[#333] rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#2a2a2a]/30 border-b border-[#333]">
                <th className="p-5 font-black text-[10px] tracking-[0.2em] text-zinc-500 uppercase">ID Hash</th>
                <th className="p-5 font-black text-[10px] tracking-[0.2em] text-zinc-500 uppercase">Method</th>
                <th className="p-5 font-black text-[10px] tracking-[0.2em] text-zinc-500 uppercase">Endpoint URL</th>
                <th className="p-5 font-black text-[10px] tracking-[0.2em] text-zinc-500 uppercase">Status</th>
                <th className="p-5 font-black text-[10px] tracking-[0.2em] text-zinc-500 uppercase">HTTP</th>
                {auth.user.role === 'APPROVER' && <th className="p-5 font-black text-[10px] tracking-[0.2em] text-zinc-500 uppercase">Operator</th>}
                <th className="p-5 font-black text-[10px] tracking-[0.2em] text-zinc-500 uppercase text-right px-8">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {reqs?.requests?.length === 0 && (
                <tr><td colSpan={7} className="p-12 text-center text-zinc-600 text-sm font-bold uppercase italic tracking-widest bg-zinc-900/20">No audit requests pending review.</td></tr>
              )}
              {reqs?.requests?.map((r: HttpRequestData) => (
                <RequestRow
                  key={r.id}
                  request={r}
                  user={auth.user}
                  loadingAction={loadingAction}
                  onAction={handleAction}
                  onClone={handleClone}
                  onSave={(e, req) => { e.stopPropagation(); setShowSaveModal(req) }}
                  onSelect={setSelectedRequest}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRequest && <Inspector request={selectedRequest} onClose={() => setSelectedRequest(null)} onSaveTemplate={setShowSaveModal} />}
      {showSaveModal && <TemplateModal onClose={() => setShowSaveModal(null)} onSave={handleSaveCollection} />}

      {toast && (
        <div className={`fixed bottom-8 right-8 px-8 py-5 rounded-[1.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.8)] border-2 ${toast.type === 'error' ? 'bg-[#451010] border-red-500 text-red-100' : 'bg-[#104520] border-green-500 text-green-100'} font-black text-[11px] uppercase tracking-[0.2em] z-[200] animate-in slide-in-from-right-10 flex items-center gap-3 shadow-xl shadow-black/50`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${toast.type === 'error' ? 'bg-red-400' : 'bg-green-400'}`}></div>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
