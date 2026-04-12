'use client'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { UserSession, RequestCollectionData, HttpRequestData } from '@/lib/types'
import { getMethodColor } from '@/lib/utils'
import Inspector from '@/components/Inspector'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function Collections() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [toast, setToast] = useState<{ msg: string, type: 'error' | 'success' } | null>(null)

  // Inspection Logic
  const [selectedTemplate, setSelectedTemplate] = useState<RequestCollectionData | null>(null)

  // Create/Edit Mode States
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createTab, setCreateTab] = useState('Params')
  const [newName, setNewName] = useState('')
  const [newMethod, setNewMethod] = useState('GET')
  const [newUrl, setNewUrl] = useState('')
  const [newParamsArr, setNewParamsArr] = useState<{ key: string, value: string }[]>([{ key: '', value: '' }])
  const [newHeadersArr, setNewHeadersArr] = useState<{ key: string, value: string }[]>([{ key: '', value: '' }])
  const [newAuthType, setNewAuthType] = useState('None')
  const [newBearerToken, setNewBearerToken] = useState('')
  const [newBasicUser, setNewBasicUser] = useState('')
  const [newBasicPass, setNewBasicPass] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newIsGlobal, setNewIsGlobal] = useState(false)
  const [editCollectionId, setEditCollectionId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  const { data: auth, error: authError } = useSWR<{ user: UserSession } | null>('/api/auth/me', fetcher)
  const { data: cols, mutate } = useSWR<{ collections: RequestCollectionData[] } | null>(
    auth?.user ? `/api/collections?q=${encodeURIComponent(debouncedQuery)}` : null,
    fetcher
  )

  useEffect(() => {
    if (authError || (auth && !auth.user)) {
      router.push('/login')
    }
  }, [auth, authError, router])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedTemplate(null)
        setShowCreateModal(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (authError || (auth && !auth.user)) return null
  if (!auth || !cols) return <div className="min-h-screen bg-[#1c1c1c] p-8 text-white flex justify-center items-center font-mono italic opacity-50 uppercase tracking-[0.2em]">Synchronizing Registry...</div>

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const handleDraft = (c: RequestCollectionData) => {
    sessionStorage.setItem('clone_request', JSON.stringify({
      method: c.method,
      url: c.url,
      headers: c.headers,
      body: c.body
    }))
    router.push('/create')
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this blueprint?')) return
    try {
      const res = await fetch(`/api/collections/${id}`, { method: 'DELETE' })
      if (res.ok) {
        mutate()
        showToast('Template deleted successfully', 'success')
      } else {
        const err = await res.json()
        showToast('Failed: ' + err.error, 'error')
      }
    } catch {
      showToast('Network error')
    }
  }

  const handleEditStart = (e: React.MouseEvent, c: RequestCollectionData) => {
    e.stopPropagation()
    setEditCollectionId(c.id)
    setNewName(c.name)
    setNewMethod(c.method)
    setNewBody(c.body || '')
    setNewIsGlobal(c.isGlobal)

    let targetUrl = c.url || ''
    try {
      const u = new URL(targetUrl)
      const pArr: { key: string, value: string }[] = []
      u.searchParams.forEach((v, k) => pArr.push({ key: k, value: v }))
      setNewParamsArr(pArr.length > 0 ? [...pArr, { key: '', value: '' }] : [{ key: '', value: '' }])
      targetUrl = u.origin + u.pathname
    } catch {
      setNewParamsArr([{ key: '', value: '' }])
    }
    setNewUrl(targetUrl)

    if (c.headers) {
      try {
        const hObj = JSON.parse(c.headers)
        const hArr: { key: string, value: string }[] = []
        let authFound = false
        Object.entries(hObj).forEach(([k, v]) => {
          if (k.toLowerCase() === 'authorization') {
            const val = v as string
            if (val.startsWith('Bearer ')) {
              setNewAuthType('Bearer Token')
              setNewBearerToken(val.substring(7))
              authFound = true
            } else if (val.startsWith('Basic ')) {
              setNewAuthType('Basic Auth')
              try {
                const decoded = atob(val.substring(6))
                const [user, ...pass] = decoded.split(':')
                setNewBasicUser(user)
                setNewBasicPass(pass.join(':'))
                authFound = true
              } catch { }
            } else {
              hArr.push({ key: k, value: val })
            }
          } else {
            hArr.push({ key: k, value: v as string })
          }
        })
        if (!authFound) setNewAuthType('None')
        setNewHeadersArr(hArr.length > 0 ? [...hArr, { key: '', value: '' }] : [{ key: '', value: '' }])
      } catch {
        setNewHeadersArr([{ key: '', value: '' }])
      }
    } else {
      setNewHeadersArr([{ key: '', value: '' }])
      setNewAuthType('None')
    }

    setShowCreateModal(true)
  }

  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName || !newUrl) {
      showToast('Name and URL are required', 'error')
      return
    }
    setIsSaving(true)

    let finalUrl = newUrl
    const validParams = newParamsArr.filter(p => p.key.trim() !== '')
    if (validParams.length > 0) {
      try {
        const urlObj = new URL(newUrl)
        validParams.forEach(p => urlObj.searchParams.append(p.key.trim(), p.value.trim()))
        finalUrl = urlObj.toString()
      } catch {
        const qs = validParams.map(p => `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value.trim())}`).join('&')
        finalUrl = finalUrl.includes('?') ? `${finalUrl}&${qs}` : `${finalUrl}?${qs}`
      }
    }

    const parsedHeaders: Record<string, string> = {}
    newHeadersArr.forEach(h => {
      if (h.key.trim()) parsedHeaders[h.key.trim()] = h.value.trim()
    })

    if (newAuthType === 'Bearer Token' && newBearerToken.trim() !== '') {
      parsedHeaders['Authorization'] = `Bearer ${newBearerToken.trim()}`
    } else if (newAuthType === 'Basic Auth' && (newBasicUser || newBasicPass)) {
      parsedHeaders['Authorization'] = `Basic ${btoa(newBasicUser + ':' + newBasicPass)}`
    }

    try {
      const url = editCollectionId ? `/api/collections/${editCollectionId}` : '/api/collections'
      const res = await fetch(url, {
        method: editCollectionId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          method: newMethod,
          url: finalUrl,
          headers: Object.keys(parsedHeaders).length > 0 ? JSON.stringify(parsedHeaders) : null,
          body: newBody || null,
          isGlobal: newIsGlobal
        })
      })

      if (res.ok) {
        mutate()
        setShowCreateModal(false)
        showToast(editCollectionId ? 'Blueprint updated' : 'Blueprint construction complete', 'success')
      } else {
        const err = await res.json()
        showToast('Construction failed: ' + err.error, 'error')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleGlobal = async (e: React.MouseEvent, c: RequestCollectionData) => {
    e.stopPropagation()
    const res = await fetch(`/api/collections/${c.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isGlobal: !c.isGlobal })
    })
    if (res.ok) {
      mutate()
      showToast(`Blueprint is now ${!c.isGlobal ? 'Global' : 'Private'}`, 'success')
    }
  }

  return (
    <div className="min-h-screen bg-[#1c1c1c] p-8 text-white font-sans selection:bg-[#f26b3a]/30">
      <div className="max-w-6xl mx-auto">
        {/* Premium Header */}
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
              <Link href="/" className="text-zinc-500 hover:text-zinc-200 transition pb-2">Dashboard</Link>
              <Link href="/collections" className="text-[#f26b3a] border-b-2 border-[#f26b3a] pb-2">Collections</Link>
            </nav>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operator Access</span>
              <span className="text-sm font-black text-white italic tracking-tight">{auth.user.username} <span className="text-[10px] text-[#f26b3a] not-italic ml-1">[{auth.user.role}]</span></span>
            </div>
            <button
              onClick={handleLogout}
              className="p-3 bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition border border-zinc-700/50 hover:border-zinc-600 shadow-xl flex items-center gap-2 group cursor-pointer"
              aria-label="Logout"
            >
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>

        {/* Title & Actions */}
        <div className="flex justify-between items-end mb-10 gap-6">
          <div className="flex-1 max-w-lg">
            <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-2">Registry & Blueprints</h2>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em] opacity-60">Standardized templates for immediate payload dispatch.</p>
          </div>
          <div className="flex items-center gap-3 w-full max-w-2xl">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-4 flex items-center text-zinc-600 group-focus-within:text-[#f26b3a] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <input
                type="text"
                placeholder="Search blueprints by name or URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#2a2a2a] border border-[#333] pl-12 pr-4 py-3 rounded-2xl text-sm text-zinc-300 outline-none focus:border-[#f26b3a] focus:ring-4 focus:ring-[#f26b3a]/10 transition shadow-inner placeholder:text-zinc-600 placeholder:italic placeholder:font-medium"
              />
            </div>
            <button
              onClick={() => {
                setEditCollectionId(null)
                setNewName('')
                setNewMethod('GET')
                setNewUrl('')
                setNewParamsArr([{ key: '', value: '' }])
                setNewHeadersArr([{ key: '', value: '' }])
                setNewAuthType('None')
                setNewBearerToken('')
                setNewBasicUser('')
                setNewBasicPass('')
                setNewBody('')
                setNewIsGlobal(false)
                setShowCreateModal(true)
              }}
              className="bg-gradient-to-r from-[#f26b3a] to-[#e65c2b] hover:from-[#e65c2b] hover:to-[#f26b3a] text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-[#f26b3a]/20 hover:scale-[1.02] active:scale-[0.98] transition flex items-center gap-3 whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
              Create Blueprint
            </button>
          </div>
        </div>

        {/* Premium Table Container */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-[#333] rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden mb-20">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#2a2a2a]/30 border-b border-[#333]">
                <th className="p-5 font-black text-[10px] tracking-[0.2em] text-zinc-500 uppercase">Template Name</th>
                <th className="p-5 font-black text-[10px] tracking-[0.2em] text-zinc-500 uppercase">Method</th>
                <th className="p-5 font-black text-[10px] tracking-[0.2em] text-zinc-500 uppercase">Target Endpoint</th>
                <th className="p-5 font-black text-[10px] tracking-[0.2em] text-zinc-500 uppercase">Visibility</th>
                <th className="p-5 font-black text-[10px] tracking-[0.2em] text-zinc-500 uppercase">Creator</th>
                <th className="p-5 font-black text-[10px] tracking-[0.2em] text-zinc-500 uppercase text-right px-8">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {cols.collections.length === 0 && (
                <tr><td colSpan={6} className="p-16 text-center text-zinc-600 text-sm font-bold uppercase italic tracking-widest bg-zinc-900/20">Blueprint registry is currently empty.</td></tr>
              )}
              {cols.collections.map((c: RequestCollectionData) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedTemplate(c)}
                  className="group hover:bg-[#2a2a2a]/40 transition-colors cursor-pointer"
                >
                  <td className="p-5">
                    <div className="text-sm font-black text-white italic group-hover:text-[#f26b3a] transition-colors uppercase tracking-tight">{c.name}</div>
                    <div className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Registry ID: {c.id.split('-')[0]}</div>
                  </td>
                  <td className="p-5">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase border ${getMethodColor(c.method)} bg-zinc-800/50 tracking-widest`}>{c.method}</span>
                  </td>
                  <td className="p-5">
                    <div className="text-xs font-mono text-zinc-400 truncate max-w-[240px] tracking-tighter" title={c.url}>{c.url}</div>
                  </td>
                  <td className="p-5">
                    {c.isGlobal ? (
                      <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase rounded border border-blue-500/20 tracking-widest">Global</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-zinc-800 text-zinc-500 text-[10px] font-black uppercase rounded border border-zinc-700 tracking-widest">Private</span>
                    )}
                  </td>
                  <td className="p-5">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic">{c.creator?.username || 'Core System'}</span>
                  </td>
                  <td className="p-5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-3 px-3">
                      <button
                        onClick={() => handleDraft(c)}
                        className="px-4 py-1.5 bg-[#f26b3a]/10 hover:bg-[#f26b3a] text-[#f26b3a] hover:text-white text-[10px] font-black rounded-lg border border-[#f26b3a]/30 transition uppercase tracking-widest cursor-pointer"
                      >
                        Draft
                      </button>
                      {(c.creatorId === auth.user.id || auth.user.role === 'APPROVER') && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleEditStart(e, c)}
                            className="p-2 bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-700/50 rounded-lg transition cursor-pointer"
                            title="Edit Configuration"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button
                            onClick={(e) => handleToggleGlobal(e, c)}
                            className={`p-2 rounded-lg border transition cursor-pointer ${c.isGlobal ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500' : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-600 hover:text-white'}`}
                            title={c.isGlobal ? "Revoke Public Access" : "Publish to Global"}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, c.id)}
                            className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded-lg transition cursor-pointer"
                            title="Decommission Blueprint"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Blueprint Construction Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => { setShowCreateModal(false); setEditCollectionId(null); }}>
          <form
            onSubmit={handleSaveCollection}
            className="bg-[#1c1c1c] border border-[#333] rounded-[2.5rem] max-w-4xl w-full max-h-[90vh] flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)] relative animate-slide-in-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-10 pb-6 border-b border-[#333]">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">{editCollectionId ? 'Blueprint Refinement' : 'Blueprint Construction'}</h2>
                  <p className="text-[10px] text-zinc-500 mt-2 font-black uppercase tracking-[0.3em] opacity-60">Serializing audit standardized configurations</p>
                </div>
                <button type="button" onClick={() => { setShowCreateModal(false); setEditCollectionId(null); }} className="p-2 hover:bg-zinc-800 rounded-xl transition text-zinc-500 hover:text-white cursor-pointer">&times;</button>
              </div>

              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-8">
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Blueprint Identity</label>
                  <input
                    required
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. AUTH_V2_PROFILE_VALIDATOR"
                    className="w-full bg-[#2a2a2a] border border-[#333] rounded-2xl px-5 py-3 text-sm text-white focus:border-[#f26b3a] focus:ring-4 focus:ring-[#f26b3a]/10 transition outline-none"
                  />
                </div>
                <div className="col-span-4">
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Access Visibility</label>
                  <div className="flex items-center justify-between bg-[#2a2a2a] border border-[#333] rounded-2xl p-3.5 px-5">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{newIsGlobal ? 'Global' : 'Private'}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={newIsGlobal} onChange={e => setNewIsGlobal(e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f26b3a]"></div>
                    </label>
                  </div>
                </div>
                <div className="col-span-3">
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Protocol Method</label>
                  <select
                    value={newMethod}
                    onChange={e => setNewMethod(e.target.value)}
                    className={`w-full bg-[#2a2a2a] border border-[#333] rounded-2xl px-5 py-3.5 text-sm font-black outline-none focus:border-[#f26b3a] transition cursor-pointer appearance-none ${getMethodColor(newMethod)}`}
                  >
                    {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => <option key={m} value={m} className="bg-[#1c1c1c] text-white">{m}</option>)}
                  </select>
                </div>
                <div className="col-span-9">
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Infrastructure URL</label>
                  <input
                    required
                    type="url"
                    value={newUrl}
                    onChange={e => setNewUrl(e.target.value)}
                    placeholder="https://infrastructure.api/v1/resource"
                    className="w-full bg-[#2a2a2a] border border-[#333] rounded-2xl px-5 py-3.5 text-sm font-mono text-zinc-300 focus:border-[#f26b3a] transition outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-10 mt-10">
                {['Params', 'Auth', 'Headers', 'Body'].map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setCreateTab(tab)}
                    className={`pb-3 text-[11px] font-black uppercase tracking-[0.2em] transition-all border-b-2 cursor-pointer ${createTab === tab ? 'border-[#f26b3a] text-white' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}
                  >
                    {tab}
                    {(tab === 'Params' && newParamsArr.filter(p => p.key.trim()).length > 0) || (tab === 'Headers' && newHeadersArr.filter(h => h.key.trim()).length > 0) ? (
                      <span className="ml-2 text-[#4caf50]">({tab === 'Params' ? newParamsArr.filter(p => p.key.trim()).length : newHeadersArr.filter(h => h.key.trim()).length})</span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-10 py-6 overflow-y-auto flex-grow bg-black/20">
              {createTab === 'Params' && (
                <div className="space-y-3">
                  {newParamsArr.map((h, i) => (
                    <div key={i} className="flex gap-3 group">
                      <input type="text" value={h.key} onChange={e => { const a = [...newParamsArr]; a[i].key = e.target.value; setNewParamsArr(a); if (i === a.length - 1 && e.target.value) setNewParamsArr([...a, { key: '', value: '' }]); }} placeholder="Key" className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-mono text-zinc-300 focus:border-[#f26b3a] outline-none transition" />
                      <input type="text" value={h.value} onChange={e => { const a = [...newParamsArr]; a[i].value = e.target.value; setNewParamsArr(a); }} placeholder="Value" className="flex-[2] bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-mono text-zinc-300 focus:border-[#f26b3a] outline-none transition" />
                      <button type="button" onClick={() => setNewParamsArr(newParamsArr.filter((_, idx) => idx !== i))} className={`p-2 hover:bg-red-500/10 text-zinc-600 hover:text-red-500 transition ${newParamsArr.length === 1 ? 'opacity-0 pointer-events-none' : ''}`}>&times;</button>
                    </div>
                  ))}
                </div>
              )}
              {createTab === 'Auth' && (
                <div className="max-w-md space-y-6 bg-zinc-900/40 p-6 rounded-3xl border border-zinc-800 shadow-inner">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Authentication Mechanism</label>
                    <select value={newAuthType} onChange={e => setNewAuthType(e.target.value)} className="bg-[#1c1c1c] border border-zinc-800 rounded-xl px-4 py-2 text-xs font-bold text-zinc-400 outline-none focus:border-[#f26b3a] transition cursor-pointer">
                      <option value="None">None / Open Access</option>
                      <option value="Bearer Token">Bearer Token (JWT)</option>
                      <option value="Basic Auth">Basic Authentication</option>
                    </select>
                  </div>
                  {newAuthType === 'Bearer Token' && (
                    <div className="flex flex-col gap-2 animate-in slide-in-from-top-2">
                      <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Token String</label>
                      <input type="text" value={newBearerToken} onChange={e => setNewBearerToken(e.target.value)} className="bg-[#1c1c1c] border border-zinc-800 rounded-xl px-4 py-2 text-xs font-mono text-zinc-300 outline-none focus:border-[#f26b3a] transition" />
                    </div>
                  )}
                  {newAuthType === 'Basic Auth' && (
                    <div className="space-y-4 animate-in slide-in-from-top-2">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Username</label>
                        <input type="text" value={newBasicUser} onChange={e => setNewBasicUser(e.target.value)} className="bg-[#1c1c1c] border border-zinc-800 rounded-xl px-4 py-2 text-xs font-mono text-zinc-300 outline-none focus:border-[#f26b3a] transition" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Secret Key / Password</label>
                        <input type="password" value={newBasicPass} onChange={e => setNewBasicPass(e.target.value)} className="bg-[#1c1c1c] border border-zinc-800 rounded-xl px-4 py-2 text-xs font-mono text-zinc-300 outline-none focus:border-[#f26b3a] transition" />
                      </div>
                    </div>
                  )}
                </div>
              )}
              {createTab === 'Headers' && (
                <div className="space-y-3">
                  {newHeadersArr.map((h, i) => (
                    <div key={i} className="flex gap-3 group">
                      <input type="text" value={h.key} onChange={e => { const a = [...newHeadersArr]; a[i].key = e.target.value; setNewHeadersArr(a); if (i === a.length - 1 && e.target.value) setNewHeadersArr([...a, { key: '', value: '' }]); }} placeholder="Header Key" className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-mono text-zinc-300 focus:border-[#f26b3a] outline-none transition" />
                      <input type="text" value={h.value} onChange={e => { const a = [...newHeadersArr]; a[i].value = e.target.value; setNewHeadersArr(a); }} placeholder="Value" className="flex-[2] bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-mono text-zinc-300 focus:border-[#f26b3a] outline-none transition" />
                      <button type="button" onClick={() => setNewHeadersArr(newHeadersArr.filter((_, idx) => idx !== i))} className={`p-2 hover:bg-red-500/10 text-zinc-600 hover:text-red-500 transition cursor-pointer ${newHeadersArr.length === 1 ? 'opacity-0 pointer-events-none' : ''}`}>&times;</button>
                    </div>
                  ))}
                </div>
              )}
              {createTab === 'Body' && (
                <div className="h-full bg-zinc-900/40 p-6 rounded-3xl border border-zinc-800 shadow-inner">
                  <textarea
                    value={newBody}
                    onChange={e => setNewBody(e.target.value)}
                    placeholder={`{\n  "status": "ready",\n  "audit": true\n}`}
                    className="w-full h-48 bg-[#1c1c1c] border border-zinc-800 rounded-2xl p-6 font-mono text-xs text-zinc-300 outline-none focus:border-[#f26b3a] transition resize-none shadow-inner"
                  />
                </div>
              )}
            </div>

            <div className="p-10 py-8 border-t border-[#333] flex justify-end gap-6 bg-gradient-to-t from-black/20 to-transparent">
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-xs font-black text-zinc-600 uppercase tracking-[0.2em] hover:text-white transition cursor-pointer">Abort Construction</button>
              <button
                type="submit"
                disabled={isSaving}
                className="bg-[#f26b3a] hover:bg-[#e65c2b] text-white px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-[#f26b3a]/20 transition disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'Synchronizing...' : (editCollectionId ? 'Update Blueprint' : 'Finalize Registry')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modern Inspector Integration */}
      {selectedTemplate && (
        <Inspector
          request={{
            ...selectedTemplate,
            status: 'TEMPLATE',
            response: null,
            requesterId: selectedTemplate.creatorId,
            requester: { username: selectedTemplate.creator?.username || 'System' }
          } as unknown as HttpRequestData}
          onClose={() => setSelectedTemplate(null)}
          onSaveTemplate={() => {
            setEditCollectionId(selectedTemplate.id);
            // The handleEditStart state logic is already handled elsewhere but for consistency:
            // We'll just trigger the same logic as the edit button if the user wanted to edit from inspector,
            // but usually inspector is for view. Dashboard uses "Save Template" button in inspector.
            // In Collections, we'll just allow Draft.
            handleDraft(selectedTemplate);
          }}
        />
      )}

      {/* Premium Toast */}
      {toast && (
        <div className={`fixed bottom-8 right-8 px-8 py-5 rounded-[1.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.8)] border-2 ${toast.type === 'error' ? 'bg-[#451010] border-red-500 text-red-100' : 'bg-[#104520] border-green-500 text-green-100'} font-black text-[11px] uppercase tracking-[0.2em] z-[200] animate-in slide-in-from-right-10 flex items-center gap-3`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${toast.type === 'error' ? 'bg-red-400' : 'bg-green-400'}`}></div>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
