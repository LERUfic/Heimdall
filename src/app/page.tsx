'use client'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function Dashboard() {
  const router = useRouter()
  const { data: auth, error: authError } = useSWR('/api/auth/me', fetcher)
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null)
  const [inspectTab, setInspectTab] = useState('Params')
  const [isPretty, setIsPretty] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [showSaveModal, setShowSaveModal] = useState<any | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateIsGlobal, setTemplateIsGlobal] = useState(false)
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
      if (e.key === 'Escape') setSelectedRequest(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (authError || (auth && !auth.user)) {
    return null
  }

  if (!auth || !reqs) return <div className="min-h-screen bg-[#1c1c1c] p-8 text-white flex justify-center items-center font-mono">Loading...</div>

  const handleAction = async (e: React.MouseEvent, id: string, action: 'approve' | 'reject' | 'execute') => {
    e.stopPropagation()
    setLoadingAction(`${action}-${id}`)
    try {
      const res = await fetch(`/api/requests/${id}/${action}`, { method: 'POST' })
      if (res.ok) {
        mutate()
        showToast(`Request ${action}d successfully`, 'success')
        if (selectedRequest && selectedRequest.id === id) {
          setSelectedRequest(null)
        }
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

  const handleClone = (e: React.MouseEvent, r: any) => {
    e.stopPropagation()
    sessionStorage.setItem('clone_request', JSON.stringify(r))
    router.push('/create')
  }

  const handleSaveCollection = async () => {
    if (!templateName.trim()) return showToast('Template name is required', 'error')
    const res = await fetch('/api/collections', {
      method: 'POST',
      body: JSON.stringify({
        name: templateName,
        method: showSaveModal.method,
        url: showSaveModal.url,
        headers: showSaveModal.headers,
        body: showSaveModal.body,
        isGlobal: templateIsGlobal
      })
    })
    if (res.ok) {
      setShowSaveModal(null)
      setTemplateName('')
      showToast('Template saved to Collections!', 'success')
    } else {
      const err = await res.json()
      showToast('Failed: ' + err.error, 'error')
    }
  }

  const renderKVTable = (record: Record<string, string>) => {
    const entries = Object.entries(record)
    if (entries.length === 0) return <div className="text-zinc-500 italic p-4 text-sm bg-[#1e1e1e] border border-[#333] rounded">No values provided.</div>
    return (
      <div className="border border-[#333] rounded overflow-hidden">
        <div className="grid grid-cols-12 bg-[#2a2a2a] border-b border-[#333] font-semibold text-xs text-zinc-500 tracking-wider">
          <div className="col-span-4 px-3 py-2 border-r border-[#333]">KEY</div>
          <div className="col-span-8 px-3 py-2">VALUE</div>
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
    let prettyStr = respStr
    try {
      const outer = JSON.parse(respStr)
      if (outer.body && typeof outer.body === 'string') {
        try { outer.body = JSON.parse(outer.body) } catch (e) { }
      }
      prettyStr = JSON.stringify(outer, null, 2)
    } catch (err) { }

    return (
      <div className="border border-zinc-800 rounded-lg overflow-hidden bg-[#1e1e1e]">
        <div className="flex justify-between items-center bg-[#2a2a2a] border-b border-[#333] px-4 py-2">
          <span className="font-semibold text-zinc-500 tracking-wider text-xs">PAYLOAD</span>
          <div className="flex bg-[#1c1c1c] p-1 rounded border border-[#333]">
            <button
              onClick={() => setIsPretty(true)}
              className={`px-3 py-1 text-xs font-semibold rounded transition ${isPretty ? 'bg-[#f26b3a] text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Pretty
            </button>
            <button
              onClick={() => setIsPretty(false)}
              className={`px-3 py-1 text-xs font-semibold rounded transition ${!isPretty ? 'bg-[#f26b3a] text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Raw
            </button>
          </div>
        </div>
        <div className="p-4 overflow-y-auto max-h-[40vh] font-mono whitespace-pre-wrap text-sm text-zinc-300">
          {isPretty ? prettyStr : respStr}
        </div>
      </div>
    )
  }

  // Inspect calculations
  let parsedParams: Record<string, string> = {}
  let baseInspectUrl = ''
  if (selectedRequest) {
    baseInspectUrl = selectedRequest.url
    try {
      const u = new URL(selectedRequest.url)
      u.searchParams.forEach((v, k) => { parsedParams[k] = v })
      baseInspectUrl = u.origin + u.pathname // URL without params for clean display
    } catch (e) { }
  }

  let parsedHeaders: Record<string, string> = {}
  if (selectedRequest && selectedRequest.headers) {
    try { parsedHeaders = JSON.parse(selectedRequest.headers) } catch (e) { }
  }

  let formattedBody = ''
  if (selectedRequest && selectedRequest.body) {
    formattedBody = selectedRequest.body
    try { formattedBody = JSON.stringify(JSON.parse(selectedRequest.body), null, 2) } catch (e) { }
  }

  return (
    <div className="min-h-screen bg-[#1c1c1c] p-8 text-white font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition cursor-pointer">
              <img src="/logo.svg" alt="Heimdall Logo" className="w-10 h-10" />
              <div className="flex flex-col">
                <h1 className="text-2xl font-black tracking-tighter text-white leading-none">HEIMDALL</h1>
                <span className="text-[10px] font-bold text-[#00C2FF] tracking-[.2em] leading-none mt-1 uppercase">Project</span>
              </div>
            </Link>
            <nav className="flex gap-6 text-sm font-semibold tracking-wide mt-2">
              <Link href="/" className="text-[#f26b3a] border-b-2 border-[#f26b3a] pb-1">Dashboard</Link>
              <Link href="/collections" className="text-zinc-500 hover:text-zinc-300 transition">Collections</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-zinc-400 text-sm">Logged in as <span className="text-white font-medium">{auth.user.username}</span> ({auth.user.role})</span>
            <button onClick={handleLogout} className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-white rounded-md transition ring-1 ring-zinc-700 cursor-pointer">Logout</button>
          </div>
        </div>

        <div className="flex justify-between items-center mb-8 gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by ID, URL, Method, or Status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-md bg-[#2a2a2a] border border-[#333] px-4 py-2 rounded-lg text-sm text-zinc-300 outline-none focus:border-[#f26b3a] transition shadow-inner"
            />
          </div>
          <Link href="/create" className="bg-[#f26b3a] hover:bg-[#e65c2b] text-white px-5 py-2 rounded-lg font-medium shadow-lg transition tracking-wide flex-shrink-0">
            + New Request
          </Link>
        </div>

        <div className="bg-zinc-900 border border-[#333] rounded-xl overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#2a2a2a] border-b border-[#333]">
                <th className="p-4 font-semibold text-xs tracking-wider text-zinc-400">ID</th>
                <th className="p-4 font-semibold text-xs tracking-wider text-zinc-400">METHOD</th>
                <th className="p-4 font-semibold text-xs tracking-wider text-zinc-400">URL</th>
                <th className="p-4 font-semibold text-xs tracking-wider text-zinc-400">STATUS</th>
                <th className="p-4 font-semibold text-xs tracking-wider text-zinc-400">HTTP</th>
                {auth.user.role === 'APPROVER' && <th className="p-4 font-semibold text-xs tracking-wider text-zinc-400">REQUESTER</th>}
                <th className="p-4 font-semibold text-xs tracking-wider text-zinc-400">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {reqs.requests.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-zinc-500 text-sm">No requests found.</td>
                </tr>
              )}
              {reqs.requests.map((r: any) => (
                <tr
                  key={r.id}
                  onClick={() => {
                    setSelectedRequest(r)
                    setInspectTab('Params')
                  }}
                  className="border-b border-[#333] hover:bg-[#252525] transition cursor-pointer"
                >
                  <td className="p-4 text-zinc-300 font-mono text-xs tracking-wider uppercase">
                    {r.id.split('-')[0]}
                  </td>
                  <td className="p-4">
                    <span className={`font-semibold tracking-wider text-xs ${r.method === 'GET' ? 'text-[#4caf50]' :
                      r.method === 'POST' ? 'text-[#ffb300]' :
                        r.method === 'PUT' ? 'text-[#2196f3]' :
                          r.method === 'PATCH' ? 'text-[#9c27b0]' : 'text-[#f44336]'
                      }`}>{r.method}</span>
                  </td>
                  <td className="p-4 text-zinc-300 font-mono text-sm max-w-[300px] truncate" title={r.url}>{r.url}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${r.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-500' : r.status === 'APPROVED' ? 'bg-green-500/10 text-[#4caf50]' : r.status === 'EXECUTED' ? 'bg-blue-500/10 text-[#2196f3]' : 'bg-red-500/10 text-[#f44336]'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {(() => {
                      if (r.status !== 'EXECUTED' || !r.response) return <span className="text-zinc-600 font-mono">-</span>;
                      try {
                        const resp = JSON.parse(r.response);
                        const code = parseInt(resp.status);
                        if (!code) return <span className="text-zinc-500 font-mono">Err</span>;
                        const color = code >= 200 && code < 300 ? 'text-[#4caf50]' : code >= 400 ? 'text-[#f44336]' : 'text-[#ffb300]';
                        return <span className={`font-mono font-semibold ${color}`}>{code}</span>;
                      } catch { return <span className="text-zinc-500 font-mono">Err</span>; }
                    })()}
                  </td>
                  {auth.user.role === 'APPROVER' && <td className="p-4 text-sm text-zinc-400">{r.requester?.username || 'Unknown'}</td>}
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {auth.user.role === 'APPROVER' && r.status === 'PENDING' && (
                        <>
                          <button disabled={loadingAction === `approve-${r.id}`} onClick={(e) => handleAction(e, r.id, 'approve')} className={`px-3 py-1.5 bg-green-600/10 hover:bg-green-600/20 text-[#4caf50] text-sm font-medium rounded transition cursor-pointer ${loadingAction === `approve-${r.id}` ? 'opacity-50 cursor-wait' : ''}`}>
                            {loadingAction === `approve-${r.id}` ? '...' : 'Approve'}
                          </button>
                          <button disabled={loadingAction === `reject-${r.id}`} onClick={(e) => handleAction(e, r.id, 'reject')} className={`px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 text-[#f44336] text-sm font-medium rounded transition cursor-pointer ${loadingAction === `reject-${r.id}` ? 'opacity-50 cursor-wait' : ''}`}>
                            {loadingAction === `reject-${r.id}` ? '...' : 'Reject'}
                          </button>
                        </>
                      )}
                      {auth.user.role === 'REQUESTER' && (
                        <>
                          {r.status === 'APPROVED' && (
                            <button disabled={loadingAction === `execute-${r.id}`} onClick={(e) => handleAction(e, r.id, 'execute')} className={`px-3 py-1.5 bg-[#f26b3a] hover:bg-[#e65c2b] text-white text-sm font-medium rounded shadow transition ${loadingAction === `execute-${r.id}` ? 'opacity-70 cursor-wait' : 'cursor-pointer'}`}>
                              {loadingAction === `execute-${r.id}` ? 'Executing...' : 'Execute'}
                            </button>
                          )}
                          <button onClick={(e) => handleClone(e, r)} className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-[#2196f3] text-sm font-medium rounded cursor-pointer transition tracking-wide">Clone</button>
                          <button onClick={(e) => { e.stopPropagation(); setShowSaveModal(r) }} className="px-3 py-1.5 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 text-sm font-medium rounded cursor-pointer transition tracking-wide">Save as Template</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedRequest(null)}>
          <div
            className="bg-[#212121] border border-[#333] rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 pb-2">
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-400 font-mono text-xs tracking-wider pr-3 border-r border-[#333] uppercase">{selectedRequest.id.split('-')[0]}</span>
                    <span className={`font-semibold tracking-wider text-sm ${selectedRequest.method === 'GET' ? 'text-[#4caf50]' :
                      selectedRequest.method === 'POST' ? 'text-[#ffb300]' :
                        selectedRequest.method === 'PUT' ? 'text-[#2196f3]' :
                          selectedRequest.method === 'PATCH' ? 'text-[#9c27b0]' : 'text-[#f44336]'
                      }`}>{selectedRequest.method}</span>
                    <span className="text-lg font-mono text-white break-all">{baseInspectUrl}</span>
                  </div>
                  <div className="flex flex-col gap-3 mt-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase">
                      <span className={`px-2 py-1 rounded-full ${selectedRequest.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-500' : selectedRequest.status === 'APPROVED' ? 'bg-green-500/10 text-[#4caf50]' : selectedRequest.status === 'EXECUTED' ? 'bg-blue-500/10 text-[#2196f3]' : 'bg-red-500/10 text-[#f44336]'}`}>
                        {selectedRequest.status}
                      </span>
                      <span className="text-zinc-400 bg-[#333] px-2 py-1 rounded-full">
                        Req By: {selectedRequest.requester?.username || 'Unknown'} • {new Date(selectedRequest.createdAt).toLocaleString()}
                      </span>
                      {selectedRequest.approvedAt && (
                        <span className="text-[#4caf50] bg-green-900/20 px-2 py-1 rounded-full">
                          Apprv By: {selectedRequest.approver?.username || 'System'} • {new Date(selectedRequest.approvedAt).toLocaleString()}
                        </span>
                      )}
                      {selectedRequest.rejectedAt && (
                        <span className="text-[#f44336] bg-red-900/20 px-2 py-1 rounded-full">
                          Rej By: {selectedRequest.approver?.username || 'System'} • {new Date(selectedRequest.rejectedAt).toLocaleString()}
                        </span>
                      )}
                      {selectedRequest.executedAt && (
                        <span className="text-[#2196f3] bg-blue-900/20 px-2 py-1 rounded-full">
                          Executed • {new Date(selectedRequest.executedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedRequest(null)} className="text-zinc-500 hover:text-white transition text-2xl font-light leading-none">&times;</button>
              </div>

              {/* Modal Tabs */}
              <div className="flex gap-6 border-b border-[#333] mt-6">
                {['Params', 'Headers', 'Body', 'Response'].map(tab => {
                  let badgeCount = 0
                  if (tab === 'Params') badgeCount = Object.keys(parsedParams).length
                  if (tab === 'Headers') badgeCount = Object.keys(parsedHeaders).length
                  if (tab === 'Response' && !selectedRequest.response) return null // Hide Response tab if no response yet

                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setInspectTab(tab)}
                      className={`pb-2 px-1 text-sm font-medium transition-colors ${inspectTab === tab
                        ? 'text-zinc-200 border-b-2 border-[#f26b3a]'
                        : 'text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent'
                        }`}
                    >
                      {tab} {badgeCount > 0 && <span className="ml-1 text-xs text-[#4caf50]">({badgeCount})</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Modal Body Contents */}
            <div className="p-6 pt-4 overflow-y-auto flex-grow text-sm min-h-[300px]">
              {inspectTab === 'Params' && renderKVTable(parsedParams)}

              {inspectTab === 'Headers' && renderKVTable(parsedHeaders)}

              {inspectTab === 'Body' && (
                selectedRequest.body ? (
                  <div className="bg-[#1e1e1e] border border-[#333] rounded overflow-hidden">
                    <div className="p-4 font-mono whitespace-pre-wrap text-sm text-zinc-300">
                      {formattedBody}
                    </div>
                  </div>
                ) : (
                  <div className="text-zinc-500 italic p-4 text-sm bg-[#1e1e1e] border border-[#333] rounded">No body provided.</div>
                )
              )}

              {inspectTab === 'Response' && (
                <div>
                  {selectedRequest.response
                    ? renderResponseBlock(selectedRequest.response)
                    : <span className="text-zinc-500 italic">Not yet executed.</span>
                  }
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {showSaveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={() => setShowSaveModal(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-md w-full shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-4">Save Request as Template</h2>
            <p className="text-sm text-zinc-400 mb-6">This will construct a persistent Collection Blueprint for rapid rapid execution natively.</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Template Name</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  placeholder="e.g. Initiate User Sync Payload"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[#f26b3a] outline-none"
                  autoFocus
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-3 border border-zinc-700 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition">
                <input
                  type="checkbox"
                  checked={templateIsGlobal}
                  onChange={e => setTemplateIsGlobal(e.target.checked)}
                  className="w-5 h-5 accent-[#f26b3a] cursor-pointer"
                />
                <div>
                  <span className="block text-sm font-medium text-white">Global Collection Blueprint</span>
                  <span className="block text-xs text-zinc-500">Allow anyone in your Enterprise AD group to view and draft this payload directly.</span>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowSaveModal(null)} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition">Cancel</button>
              <button onClick={handleSaveCollection} className="px-4 py-2 bg-[#f26b3a] hover:bg-[#e65c2b] text-white text-sm font-medium rounded-lg shadow transition">Save Template</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-xl border ${toast.type === 'error' ? 'bg-red-900/30 border-red-500/50 text-red-500' : 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400'} font-medium z-[200] animate-in slide-in-from-bottom-4`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
