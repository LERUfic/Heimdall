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

  // Create Mode States
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
  const [isSaving, setIsSaving] = useState(false)

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

  const handleHeaderRowChange = (index: number, field: 'key' | 'value', val: string) => {
    const newArr = [...newHeadersArr]
    newArr[index][field] = val
    setNewHeadersArr(newArr)
    if (index === newHeadersArr.length - 1 && val !== '') {
      setNewHeadersArr([...newArr, { key: '', value: '' }])
    }
  }

  const handleRemoveHeaderRow = (index: number) => {
    setNewHeadersArr(newHeadersArr.filter((_, i) => i !== index))
  }

  const handleParamRowChange = (index: number, field: 'key' | 'value', val: string) => {
    const newArr = [...newParamsArr]
    newArr[index][field] = val
    setNewParamsArr(newArr)
    if (index === newParamsArr.length - 1 && val !== '') {
      setNewParamsArr([...newArr, { key: '', value: '' }])
    }
  }

  const handleRemoveParamRow = (index: number) => {
    setNewParamsArr(newParamsArr.filter((_, i) => i !== index))
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

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName || !newUrl) {
      showToast('Name and URL are required', 'error')
      return
    }
    setIsSaving(true)

    // Merge Params into URL
    let finalUrl = newUrl
    const validParams = newParamsArr.filter(p => p.key.trim() !== '')
    if (validParams.length > 0) {
      try {
        const urlObj = new URL(newUrl)
        validParams.forEach(p => urlObj.searchParams.append(p.key.trim(), p.value.trim()))
        finalUrl = urlObj.toString()
      } catch (err) {
        const qs = validParams.map(p => `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value.trim())}`).join('&')
        finalUrl = finalUrl.includes('?') ? `${finalUrl}&${qs}` : `${finalUrl}?${qs}`
      }
    }

    const parsedHeaders: Record<string, string> = {}
    newHeadersArr.forEach(h => {
      if (h.key.trim()) parsedHeaders[h.key.trim()] = h.value.trim()
    })

    // Handle Auth injection
    if (newAuthType === 'Bearer Token' && newBearerToken.trim() !== '') {
      parsedHeaders['Authorization'] = `Bearer ${newBearerToken.trim()}`
    } else if (newAuthType === 'Basic Auth' && (newBasicUser || newBasicPass)) {
      parsedHeaders['Authorization'] = `Basic ${btoa(newBasicUser + ':' + newBasicPass)}`
    }

    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
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
        showToast('Template created successfully', 'success')
        // Reset form
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
      } else {
        const err = await res.json()
        showToast('Failed to create: ' + err.error, 'error')
      }
    } catch (err) {
      showToast('Network error occurred', 'error')
    } finally {
      setIsSaving(false)
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
            <button onClick={handleLogout} className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-white rounded-md transition ring-1 ring-zinc-700 cursor-pointer">Logout</button>
          </div>
        </div>

        <div className="mb-6 flex justify-between items-end gap-4">
          <div className="flex-grow flex flex-col">
            <h2 className="text-xl font-bold text-white">Request Templates</h2>
            <p className="text-zinc-400 text-sm mt-1">Standardized blueprints configured for immediate rapid access.</p>
          </div>
          <div className="flex items-center gap-3 w-full max-w-xl">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search blueprints..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white focus:ring-2 focus:ring-[#f26b3a] outline-none"
              />
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#f26b3a] hover:bg-[#e65c2b] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition shadow-lg cursor-pointer whitespace-nowrap"
            >
              <span>+</span>
              <span>Create Template</span>
            </button>
          </div>
        </div>

        <div className="bg-zinc-900 border border-[#333] rounded-xl overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#2a2a2a] border-b border-[#333]">
                <th className="p-4 font-semibold text-xs tracking-wider text-zinc-400">NAME & CREATOR</th>
                <th className="p-4 font-semibold text-xs tracking-wider text-zinc-400">METHOD</th>
                <th className="p-4 font-semibold text-xs tracking-wider text-zinc-400">URL</th>
                <th className="p-4 font-semibold text-xs tracking-wider text-zinc-400">VISIBILITY</th>
                <th className="p-4 font-semibold text-xs tracking-wider text-zinc-400">CREATED</th>
                <th className="p-4 font-semibold text-xs tracking-wider text-zinc-400 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {cols.collections.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-zinc-500 text-sm">
                    No collections found. Head over to the Dashboard to save a Payload Template!
                  </td>
                </tr>
              )}
              {cols.collections.filter((c: any) => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.url.toLowerCase().includes(searchQuery.toLowerCase())).map((c: any) => (
                <tr
                  key={c.id}
                  onClick={() => { setInspectCollection(c); setInspectTab('Params') }}
                  className="border-b border-[#333] last:border-b-0 hover:bg-[#252525] transition cursor-pointer group"
                >
                  <td className="p-4">
                    <div className="font-bold text-white group-hover:text-[#f26b3a] transition-colors">{c.name}</div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-tight mt-0.5">By {c.creator?.username || 'Unknown'}</div>
                  </td>
                  <td className="p-4">
                    <span className={`font-semibold tracking-wider text-xs px-2 py-0.5 rounded ${c.method === 'GET' ? 'bg-[#4caf50]/10 text-[#4caf50]' :
                      c.method === 'POST' ? 'bg-[#ffb300]/10 text-[#ffb300]' :
                        c.method === 'PUT' ? 'bg-[#2196f3]/10 text-[#2196f3]' :
                          c.method === 'PATCH' ? 'bg-[#9c27b0]/10 text-[#9c27b0]' : 'bg-[#f44336]/10 text-[#f44336]'
                      }`}>{c.method}</span>
                  </td>
                  <td className="p-4 text-zinc-400 font-mono text-xs max-w-[200px] truncate" title={c.url}>
                    {c.url}
                  </td>
                  <td className="p-4">
                    {c.isGlobal ? (
                      <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase rounded border border-blue-500/20">Global</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-zinc-800 text-zinc-500 text-[10px] font-bold uppercase rounded border border-zinc-700">Private</span>
                    )}
                  </td>
                  <td className="p-4 text-zinc-500 text-xs font-medium">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDraft(c)}
                        className="px-3 py-1.5 bg-[#f26b3a] hover:bg-[#e65c2b] text-white text-xs font-bold rounded shadow transition whitespace-nowrap cursor-pointer"
                      >
                        Draft
                      </button>
                      {(c.creatorId === auth.user.id || auth.user.role === 'APPROVER') && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleGlobal(c)}
                            title={c.isGlobal ? "Make Private" : "Share Globally"}
                            className={`p-1.5 rounded border transition-colors cursor-pointer ${c.isGlobal ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-500'}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="p-1.5 bg-red-900/10 hover:bg-red-600 border border-red-900/50 hover:border-red-600 text-red-500 hover:text-white rounded transition cursor-pointer"
                            title="Delete"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 000-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
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

      {showCreateModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4" onClick={() => setShowCreateModal(false)}>
          <form
            onSubmit={handleCreateCollection}
            className="bg-[#212121] border border-[#333] rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 pb-2">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Create Request Template</h2>
                  <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-mono">Blueprint Construction Mode</p>
                </div>
                <button type="button" onClick={() => setShowCreateModal(false)} className="text-zinc-500 hover:text-white transition text-2xl font-light leading-none cursor-pointer">&times;</button>
              </div>

              <div className="grid grid-cols-6 gap-4 mt-6">
                <div className="col-span-4">
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Template Name</label>
                  <input
                    required
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. User Profile Sync Payload"
                    className="w-full bg-[#1e1e1e] border border-[#333] rounded px-3 py-2 text-white outline-none focus:border-[#f26b3a] transition"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Visibility</label>
                  <label className="flex items-center justify-between cursor-pointer p-2 border border-[#333] rounded bg-[#1e1e1e] hover:bg-[#252525] transition h-[42px] px-3">
                    <span className="text-xs font-medium text-zinc-300">{newIsGlobal ? 'Global Access' : 'Private'}</span>
                    <div className="relative inline-block w-8 h-4 transition duration-200 ease-in">
                      <input
                        type="checkbox"
                        checked={newIsGlobal}
                        onChange={e => setNewIsGlobal(e.target.checked)}
                        className="opacity-0 w-0 h-0 peer"
                      />
                      <span className="absolute cursor-pointer top-0 left-0 right-0 bottom-0 bg-zinc-700 transition duration-300 rounded-full peer-checked:bg-[#f26b3a]"></span>
                      <span className="absolute cursor-pointer left-1 bottom-1 bg-white w-2 h-2 transition duration-300 rounded-full peer-checked:translate-x-4"></span>
                    </div>
                  </label>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">HTTP Method</label>
                  <div className="relative">
                    <select
                      value={newMethod}
                      onChange={e => setNewMethod(e.target.value)}
                      className={`w-full bg-[#1e1e1e] border border-[#333] rounded px-3 py-2 outline-none font-bold text-sm h-[42px] cursor-pointer appearance-none pr-8 ${newMethod === 'GET' ? 'text-[#4caf50]' : newMethod === 'POST' ? 'text-[#ffb300]' : newMethod === 'PUT' ? 'text-[#2196f3]' : newMethod === 'PATCH' ? 'text-[#9c27b0]' : 'text-[#f44336]'}`}
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="col-span-4">
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Endpoint URL</label>
                  <input
                    required
                    type="url"
                    value={newUrl}
                    onChange={e => setNewUrl(e.target.value)}
                    placeholder="Enter request URL"
                    className="w-full bg-[#1e1e1e] border border-[#333] rounded px-3 py-2 text-white font-mono text-sm outline-none focus:border-[#f26b3a] transition"
                  />
                </div>
              </div>

              <div className="flex gap-6 border-b border-[#333] mt-8">
                {['Params', 'Auth', 'Headers', 'Body'].map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setCreateTab(tab)}
                    className={`pb-2 px-1 text-xs font-bold uppercase tracking-widest transition-colors ${createTab === tab ? 'text-zinc-200 border-b-2 border-[#f26b3a]' : 'text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent'}`}
                  >
                    {tab}
                    {tab === 'Auth' && newAuthType !== 'None' ? (
                      <span className="ml-1 w-1.5 h-1.5 rounded-full bg-[#f26b3a] inline-block mb-1"></span>
                    ) : null}
                    {(tab === 'Params' && newParamsArr.filter(p => p.key.trim()).length > 0) || (tab === 'Headers' && newHeadersArr.filter(h => h.key.trim()).length > 0) ? (
                      <span className="ml-1 text-[#4caf50]">({tab === 'Params' ? newParamsArr.filter(p => p.key.trim()).length : newHeadersArr.filter(h => h.key.trim()).length})</span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 pt-4 overflow-y-auto flex-grow text-sm min-h-[250px]">
              {createTab === 'Params' && (
                <div className="border border-[#333] rounded overflow-hidden">
                  <div className="grid grid-cols-12 bg-[#2a2a2a] border-b border-[#333] font-bold text-xs text-zinc-500 uppercase tracking-widest">
                    <div className="col-span-5 px-3 py-2 border-r border-[#333]">Key</div>
                    <div className="col-span-6 px-3 py-2">Value</div>
                    <div className="col-span-1 border-l border-[#333]"></div>
                  </div>
                  {newParamsArr.map((h, i) => (
                    <div key={i} className="grid grid-cols-12 border-b border-[#333] last:border-b-0 bg-[#1e1e1e] group">
                      <div className="col-span-5 border-r border-[#333]">
                        <input
                          type="text"
                          value={h.key}
                          onChange={e => handleParamRowChange(i, 'key', e.target.value)}
                          placeholder="Key"
                          className="w-full bg-transparent px-3 py-1.5 outline-none text-zinc-300 font-mono text-xs focus:bg-[#252525]"
                        />
                      </div>
                      <div className="col-span-6 border-r border-[#333]">
                        <input
                          type="text"
                          value={h.value}
                          onChange={e => handleParamRowChange(i, 'value', e.target.value)}
                          placeholder="Value"
                          className="w-full bg-transparent px-3 py-1.5 outline-none text-zinc-300 font-mono text-xs focus:bg-[#252525]"
                        />
                      </div>
                      <div className="col-span-1 flex items-center justify-center border-l border-[#333]">
                        <button
                          type="button"
                          onClick={() => handleRemoveParamRow(i)}
                          className={`text-zinc-500 hover:text-red-500 transition cursor-pointer ${newParamsArr.length === 1 ? 'opacity-0' : ''}`}
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {createTab === 'Auth' && (
                <div className="h-full flex flex-col border border-[#333] rounded bg-[#1e1e1e]">
                  <div className="p-4 border-b border-[#333] flex items-center gap-4">
                    <span className="text-zinc-500 font-bold text-[10px] tracking-widest uppercase">Auth Type</span>
                    <select
                      value={newAuthType}
                      onChange={e => setNewAuthType(e.target.value)}
                      className="bg-[#2a2a2a] text-zinc-300 text-xs outline-none px-3 py-1.5 border border-[#333] rounded cursor-pointer focus:border-[#f26b3a]"
                    >
                      <option value="None">No Auth</option>
                      <option value="Bearer Token">Bearer Token</option>
                      <option value="Basic Auth">Basic Auth</option>
                    </select>
                  </div>
                  <div className="p-6">
                    {newAuthType === 'None' && <p className="text-zinc-500 text-xs italic">This request does not use any authorization.</p>}
                    {newAuthType === 'Bearer Token' && (
                      <div className="flex flex-col gap-2 max-w-md">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Bearer Token</label>
                        <input
                          type="text"
                          value={newBearerToken}
                          onChange={e => setNewBearerToken(e.target.value)}
                          placeholder="Enter Bearer Token"
                          className="bg-[#2a2a2a] px-3 py-2 border border-[#333] rounded text-zinc-300 font-mono text-xs outline-none focus:border-[#f26b3a]"
                        />
                      </div>
                    )}
                    {newAuthType === 'Basic Auth' && (
                      <div className="flex flex-col gap-4 max-w-md">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Username</label>
                          <input
                            type="text"
                            value={newBasicUser}
                            onChange={e => setNewBasicUser(e.target.value)}
                            className="bg-[#2a2a2a] px-3 py-2 border border-[#333] rounded text-zinc-300 font-mono text-xs outline-none focus:border-[#f26b3a]"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Password</label>
                          <input
                            type="password"
                            value={newBasicPass}
                            onChange={e => setNewBasicPass(e.target.value)}
                            className="bg-[#2a2a2a] px-3 py-2 border border-[#333] rounded text-zinc-300 font-mono text-xs outline-none focus:border-[#f26b3a]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {createTab === 'Headers' && (
                <div className="border border-[#333] rounded overflow-hidden">
                  <div className="grid grid-cols-12 bg-[#2a2a2a] border-b border-[#333] font-bold text-xs text-zinc-500 uppercase tracking-widest">
                    <div className="col-span-5 px-3 py-2 border-r border-[#333]">Key</div>
                    <div className="col-span-6 px-3 py-2">Value</div>
                    <div className="col-span-1 border-l border-[#333]"></div>
                  </div>
                  {newHeadersArr.map((h, i) => (
                    <div key={i} className="grid grid-cols-12 border-b border-[#333] last:border-b-0 bg-[#1e1e1e] group">
                      <div className="col-span-5 border-r border-[#333]">
                        <input
                          type="text"
                          value={h.key}
                          onChange={e => handleHeaderRowChange(i, 'key', e.target.value)}
                          placeholder="Key"
                          className="w-full bg-transparent px-3 py-1.5 outline-none text-zinc-300 font-mono text-xs focus:bg-[#252525]"
                        />
                      </div>
                      <div className="col-span-6 border-r border-[#333]">
                        <input
                          type="text"
                          value={h.value}
                          onChange={e => handleHeaderRowChange(i, 'value', e.target.value)}
                          placeholder="Value"
                          className="w-full bg-transparent px-3 py-1.5 outline-none text-zinc-300 font-mono text-xs focus:bg-[#252525]"
                        />
                      </div>
                      <div className="col-span-1 flex items-center justify-center border-l border-[#333]">
                        <button
                          type="button"
                          onClick={() => handleRemoveHeaderRow(i)}
                          className={`text-zinc-500 hover:text-red-500 transition cursor-pointer ${newHeadersArr.length === 1 ? 'opacity-0' : ''}`}
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {createTab === 'Body' && (
                <textarea
                  value={newBody}
                  onChange={e => setNewBody(e.target.value)}
                  placeholder={`{\n  // Enter JSON body here\n}`}
                  className="w-full h-40 bg-[#1e1e1e] border border-[#333] rounded p-4 font-mono text-sm text-zinc-300 outline-none focus:border-[#f26b3a] resize-none"
                />
              )}
            </div>

            <div className="p-6 pt-4 border-t border-[#333] flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-5 py-2 text-sm font-medium text-zinc-400 hover:text-white transition cursor-pointer">Cancel</button>
              <button type="submit" disabled={isSaving} className="px-6 py-2 bg-[#f26b3a] hover:bg-[#e65c2b] text-white font-bold rounded shadow-lg transition cursor-pointer disabled:opacity-50">
                {isSaving ? 'Saving...' : 'Create Template'}
              </button>
            </div>
          </form>
        </div>
      )}

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
                <button onClick={() => { setInspectCollection(null); handleDraft(inspectCollection) }} className="px-5 py-2 bg-[#f26b3a] hover:bg-[#e65c2b] text-white font-semibold rounded-lg shadow-md transition cursor-pointer">
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
