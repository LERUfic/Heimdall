'use client'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function Collections() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState<{ msg: string, type: 'error' | 'success' } | null>(null)
  const [inspectCollection, setInspectCollection] = useState<any | null>(null)
  const [inspectTab, setInspectTab] = useState('Params')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInspectCollection(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }
  const { data: auth, error: authError } = useSWR('/api/auth/me', fetcher)
  const { data: cols, mutate } = useSWR(auth?.user ? '/api/collections' : null, fetcher)

  useEffect(() => {
    if (authError || (auth && !auth.user)) {
      router.push('/login')
    }
  }, [auth, authError, router])

  if (authError || (auth && !auth.user)) return null
  if (!auth || !cols) return <div className="min-h-screen bg-[#1c1c1c] p-8 text-white flex justify-center items-center font-mono">Loading...</div>

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const handleDraft = (c: any) => {
    sessionStorage.setItem('clone_request', JSON.stringify({
      method: c.method,
      url: c.url,
      headers: c.headers,
      body: c.body
    }))
    router.push('/create')
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return
    const res = await fetch(`/api/collections/${id}`, { method: 'DELETE' })
    if (res.ok) {
      mutate()
      showToast('Template deleted successfully', 'success')
    } else {
      const err = await res.json()
      showToast('Failed: ' + err.error, 'error')
    }
  }

  const handleToggleGlobal = async (c: any) => {
    const res = await fetch(`/api/collections/${c.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isGlobal: !c.isGlobal })
    })
    if (res.ok) {
      mutate()
      showToast(`Template is now ${!c.isGlobal ? 'Global' : 'Private'}`, 'success')
    } else {
      const err = await res.json()
      showToast('Failed to toggle visibility: ' + err.error, 'error')
    }
  }

  return (
    <div className="min-h-screen bg-[#1c1c1c] p-8 text-white font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Navigation Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-baseline gap-8">
            <h1 className="text-3xl font-extrabold tracking-tight">Heimdall Project</h1>
            <nav className="flex gap-6 text-sm font-semibold tracking-wide">
              <Link href="/" className="text-zinc-500 hover:text-zinc-300 transition">Dashboard</Link>
              <Link href="/collections" className="text-[#f26b3a] border-b-2 border-[#f26b3a] pb-1">Collections</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-zinc-400 text-sm">Logged in as <span className="text-white font-medium">{auth.user.username}</span> ({auth.user.role})</span>
            <button onClick={handleLogout} className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-white rounded-md transition ring-1 ring-zinc-700">Logout</button>
          </div>
        </div>

        <div className="mb-6 flex justify-between items-end gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Request Templates</h2>
            <p className="text-zinc-400 text-sm mt-1">Standardized execution payloads configured securely for immediate rapid access.</p>
          </div>
          <div className="max-w-xs w-full">
            <input
              type="text"
              placeholder="Search collections..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white focus:ring-2 focus:ring-[#f26b3a] outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cols.collections.length === 0 && (
            <div className="col-span-full py-12 text-center border border-[#333] border-dashed rounded-xl bg-[#212121]">
              <p className="text-zinc-500 font-medium mb-2">No collections found.</p>
              <p className="text-sm text-zinc-600">Head over to the Dashboard to clone and save a successful Payload Template!</p>
            </div>
          )}

          {cols.collections.filter((c: any) => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.url.toLowerCase().includes(searchQuery.toLowerCase())).map((c: any) => (
            <div key={c.id} className="bg-[#212121] border border-[#333] rounded-xl overflow-hidden hover:border-[#555] transition flex flex-col group">
              <div onClick={() => { setInspectCollection(c); setInspectTab('Params') }} className="p-5 flex-grow cursor-pointer group-hover:bg-[#252525] transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg text-white break-words group-hover:text-[#f26b3a] transition-colors">
                    {c.name}
                  </h3>
                  {c.isGlobal ? (
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs font-semibold rounded-full border border-blue-500/20 whitespace-nowrap ml-2">Global</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-xs font-semibold rounded-full border border-zinc-700 whitespace-nowrap ml-2">Private</span>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <span className={`font-semibold tracking-wider text-[10px] uppercase px-1.5 py-0.5 rounded ${c.method === 'GET' ? 'bg-[#4caf50]/20 text-[#4caf50]' :
                    c.method === 'POST' ? 'bg-[#ffb300]/20 text-[#ffb300]' :
                      c.method === 'PUT' ? 'bg-[#2196f3]/20 text-[#2196f3]' :
                        c.method === 'PATCH' ? 'bg-[#9c27b0]/20 text-[#9c27b0]' : 'bg-[#f44336]/20 text-[#f44336]'}`}>
                    {c.method}
                  </span>
                  <span className="text-xs font-mono text-zinc-400 truncate" title={c.url}>{c.url}</span>
                </div>

                <div className="text-xs text-zinc-600 mb-1">
                  <span className="font-medium text-zinc-500">Author:</span> {c.creator?.username} • {new Date(c.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="border-t border-[#333] bg-[#1a1a1a] p-3 flex gap-2 justify-end">
                <button
                  onClick={() => handleDraft(c)}
                  className="flex-1 bg-[#2a2a2a] hover:bg-[#f26b3a] text-zinc-300 hover:text-white px-3 py-1.5 text-sm font-semibold rounded transition shadow-sm"
                >
                  Create Draft Request
                </button>
                {(c.creatorId === auth.user.id || auth.user.role === 'APPROVER') && (
                  <>
                    <button
                      onClick={() => handleToggleGlobal(c)}
                      title={c.isGlobal ? "Make Private" : "Share Globally"}
                      className="flex items-center gap-1.5 px-2 bg-zinc-800 border border-zinc-700 hover:border-emerald-600/50 rounded transition cursor-pointer"
                    >
                      <span className={`text-xs font-semibold ${c.isGlobal ? 'text-emerald-400' : 'text-zinc-500'}`}>Global</span>
                      <div className={`w-7 h-3.5 rounded-full relative transition-colors ${c.isGlobal ? 'bg-emerald-500' : 'bg-zinc-600'}`}>
                        <div className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${c.isGlobal ? 'translate-x-3.5' : 'translate-x-0'}`} />
                      </div>
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="bg-red-900/20 hover:bg-red-600 border border-red-900/50 hover:border-red-600 text-red-500 hover:text-white px-3 py-1.5 text-sm font-semibold rounded transition"
                      title="Delete"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {inspectCollection && (() => {
        let parsedParams: Record<string, string> = {}
        let baseInspectUrl = inspectCollection.url
        try {
          const u = new URL(inspectCollection.url)
          u.searchParams.forEach((v, k) => { parsedParams[k] = v })
          baseInspectUrl = u.origin + u.pathname
        } catch (e) { }

        let parsedHeaders: Record<string, string> = {}
        if (inspectCollection.headers) {
          try { parsedHeaders = JSON.parse(inspectCollection.headers) } catch (e) { }
        }

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={() => setInspectCollection(null)}>
            <div className="bg-[#212121] border border-[#333] rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl relative" onClick={e => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="p-6 pb-2">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-400 font-mono text-xs tracking-wider pr-3 border-r border-[#333] uppercase">TEMPLATE</span>
                      <span className={`font-semibold tracking-wider text-sm ${inspectCollection.method === 'GET' ? 'text-[#4caf50]' :
                        inspectCollection.method === 'POST' ? 'text-[#ffb300]' :
                          inspectCollection.method === 'PUT' ? 'text-[#2196f3]' :
                            inspectCollection.method === 'PATCH' ? 'text-[#9c27b0]' : 'text-[#f44336]'
                        }`}>{inspectCollection.method}</span>
                      <span className="text-lg font-mono text-white break-all">{baseInspectUrl}</span>
                    </div>
                    <div className="mt-1">
                      <h2 className="text-xl font-bold text-white tracking-tight">{inspectCollection.name}</h2>
                    </div>
                  </div>
                  <button onClick={() => setInspectCollection(null)} className="text-zinc-500 hover:text-white transition text-2xl font-light leading-none">&times;</button>
                </div>

                {/* Modal Tabs */}
                <div className="flex gap-6 border-b border-[#333] mt-6">
                  {['Params', 'Headers', 'Body'].map(tab => {
                    let badgeCount = 0
                    if (tab === 'Params') badgeCount = Object.keys(parsedParams).length
                    if (tab === 'Headers') badgeCount = Object.keys(parsedHeaders).length

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
                  inspectCollection.body ? (
                    <div className="bg-[#1e1e1e] border border-[#333] rounded overflow-hidden">
                      <div className="p-4 font-mono whitespace-pre-wrap text-sm text-zinc-300">
                        {(() => {
                          try { return JSON.stringify(JSON.parse(inspectCollection.body), null, 2) }
                          catch (e) { return inspectCollection.body }
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="text-zinc-500 italic p-4 text-sm bg-[#1e1e1e] border border-[#333] rounded">No body provided.</div>
                  )
                )}
              </div>

              <div className="p-6 pt-4 border-t border-[#333] flex justify-end gap-3">
                <button onClick={() => setInspectCollection(null)} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition">
                  Close
                </button>
                <button onClick={() => { setInspectCollection(null); handleDraft(inspectCollection) }} className="px-5 py-2 bg-[#f26b3a] hover:bg-[#e65c2b] text-white font-semibold rounded-lg shadow-md transition">
                  Create Draft Request
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-xl border ${toast.type === 'error' ? 'bg-red-900/30 border-red-500/50 text-red-500' : 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400'} font-medium z-50 animate-in slide-in-from-bottom-4`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
