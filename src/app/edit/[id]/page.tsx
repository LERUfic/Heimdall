'use client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type KeyValuePair = { key: string; value: string }

export default function EditRequest({ params }: { params: Promise<{ id: string }> }) {
  const p = use(params)
  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('')
  const [activeTab, setActiveTab] = useState('Params')
  
  const [paramsArr, setParamsArr] = useState<KeyValuePair[]>([{ key: '', value: '' }])
  const [headersArr, setHeadersArr] = useState<KeyValuePair[]>([{ key: '', value: '' }])
  const [body, setBody] = useState('')
  
  // Auth states
  const [authType, setAuthType] = useState('None')
  const [bearerToken, setBearerToken] = useState('')
  const [basicUser, setBasicUser] = useState('')
  const [basicPass, setBasicPass] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<{msg: string, type: 'error'|'success'} | null>(null)

  const router = useRouter()

  const showToast = (msg: string, type: 'error'|'success' = 'error') => {
    setToast({msg, type})
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/requests/${p.id}`)
        if (!res.ok) {
          showToast('Failed to fetch request data')
          return
        }
        const data = await res.json()
        const r = data.request

        if (r.status !== 'PENDING') {
          showToast('Only pending requests can be edited')
          setTimeout(() => router.push('/'), 2000)
          return
        }

        setMethod(r.method || 'GET')
        setBody(r.body || '')
        
        let targetUrl = r.url || ''
        try {
          const u = new URL(targetUrl)
          const pArr: KeyValuePair[] = []
          u.searchParams.forEach((v, k) => pArr.push({ key: k, value: v }))
          if (pArr.length > 0) {
            setParamsArr([...pArr, { key: '', value: '' }])
            targetUrl = u.origin + u.pathname
          }
        } catch(e) {}
        setUrl(targetUrl)

        if (r.headers) {
          const hObj = JSON.parse(r.headers)
          const hArr: KeyValuePair[] = []
          Object.entries(hObj).forEach(([k, v]) => {
            if (k.toLowerCase() === 'authorization') {
              const val = v as string
              if (val.startsWith('Bearer ')) {
                setAuthType('Bearer Token')
                setBearerToken(val.substring(7))
              } else if (val.startsWith('Basic ')) {
                setAuthType('Basic Auth')
                try {
                  const decoded = atob(val.substring(6))
                  const [user, ...pass] = decoded.split(':')
                  setBasicUser(user)
                  setBasicPass(pass.join(':'))
                } catch(e) {}
              } else {
                hArr.push({ key: k, value: val })
              }
            } else {
              hArr.push({ key: k, value: v as string })
            }
          })
          setHeadersArr(hArr.length > 0 ? [...hArr, { key: '', value: '' }] : [{ key: '', value: '' }])
        }
      } catch (err) {
        showToast('Error loading request')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [p.id, router])

  const handleAddRow = (arr: KeyValuePair[], setArr: any) => {
    setArr([...arr, { key: '', value: '' }])
  }

  const handleRemoveRow = (index: number, arr: KeyValuePair[], setArr: any) => {
    setArr(arr.filter((_, i) => i !== index))
  }

  const handleChangeRow = (index: number, field: 'key' | 'value', val: string, arr: KeyValuePair[], setArr: any) => {
    const newArr = [...arr]
    newArr[index][field] = val
    setArr(newArr)
    if (index === arr.length - 1 && val !== '') {
      handleAddRow(newArr, setArr)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Parse URL and append params
    let finalUrl = url
    const validParams = paramsArr.filter(p => p.key.trim() !== '')
    if (validParams.length > 0) {
      try {
        const urlObj = new URL(url)
        validParams.forEach(p => urlObj.searchParams.set(p.key.trim(), p.value.trim()))
        finalUrl = urlObj.toString()
      } catch (err) {
        const qs = validParams.map(p => `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value.trim())}`).join('&')
        finalUrl = finalUrl.includes('?') ? `${finalUrl}&${qs}` : `${finalUrl}?${qs}`
      }
    }

    const parsedHeaders: Record<string, string> = {}
    headersArr.forEach(h => {
      if (h.key.trim()) parsedHeaders[h.key.trim()] = h.value.trim()
    })
    
    // Auth injection
    if (authType === 'Bearer Token' && bearerToken.trim() !== '') {
      parsedHeaders['Authorization'] = `Bearer ${bearerToken.trim()}`
    } else if (authType === 'Basic Auth' && (basicUser || basicPass)) {
      parsedHeaders['Authorization'] = `Basic ${btoa(basicUser + ':' + basicPass)}`
    }

    try {
      const res = await fetch(`/api/requests/${p.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          method, 
          url: finalUrl, 
          headers: Object.keys(parsedHeaders).length > 0 ? parsedHeaders : null, 
          body 
        })
      })
      if (res.ok) {
        showToast('Request updated successfully', 'success')
        setTimeout(() => router.push('/'), 1000)
      } else {
        const err = await res.json()
        showToast(err.error || 'Failed to update request')
      }
    } catch (err) {
      showToast('Failed to update request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderKVTable = (arr: KeyValuePair[], setArr: any) => (
    <div className="border border-[#333] rounded overflow-hidden">
      <div className="grid grid-cols-12 bg-[#2a2a2a] border-b border-[#333] font-semibold text-xs text-zinc-500 tracking-wider">
        <div className="col-span-5 px-3 py-2 border-r border-[#333]">KEY</div>
        <div className="col-span-6 px-3 py-2">VALUE</div>
        <div className="col-span-1 px-3 py-2"></div>
      </div>
      
      {arr.map((h, i) => (
        <div key={i} className="grid grid-cols-12 border-b border-[#333] last:border-b-0 bg-[#1e1e1e] hover:bg-[#252525] group transition-colors">
          <div className="col-span-5 border-r border-[#333]">
            <input 
              type="text" placeholder="Key"
              value={h.key}
              onChange={e => handleChangeRow(i, 'key', e.target.value, arr, setArr)}
              className="w-full bg-transparent px-3 py-2 outline-none text-zinc-300 font-mono focus:ring-1 focus:ring-[#f26b3a] focus:bg-[#2a2a2a]"
            />
          </div>
          <div className="col-span-6 border-r border-[#333]">
            <input 
              type="text" placeholder="Value"
              value={h.value}
              onChange={e => handleChangeRow(i, 'value', e.target.value, arr, setArr)}
              className="w-full bg-transparent px-3 py-2 outline-none text-zinc-300 font-mono focus:ring-1 focus:ring-[#f26b3a] focus:bg-[#2a2a2a]"
            />
          </div>
          <div className="col-span-1 flex items-center justify-center">
            <button 
              type="button" 
              onClick={() => handleRemoveRow(i, arr, setArr)}
              className={`text-zinc-600 hover:text-red-500 transition ${arr.length === 1 ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}
            >
              &times;
            </button>
          </div>
        </div>
      ))}
    </div>
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1c1c1c] flex items-center justify-center">
        <div className="text-zinc-500 animate-pulse">Loading request data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1c1c1c] p-6 text-zinc-300 font-sans">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-zinc-500 hover:text-zinc-300 font-medium transition text-sm">
            ← Workspace
          </Link>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-300 text-sm font-medium">Edit Request</span>
          <span className="text-zinc-500 font-mono text-xs bg-[#2a2a2a] px-2 py-0.5 rounded border border-[#333] uppercase">{p.id.split('-')[0]}</span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 bg-[#212121] border border-[#333] rounded-lg p-6 shadow-xl">
          
          <div className="flex bg-[#2a2a2a] rounded-lg border border-[#333] overflow-hidden focus-within:ring-1 focus-within:ring-[#f26b3a]">
            <select 
              value={method} 
              onChange={e => setMethod(e.target.value)}
              className={`bg-[#2a2a2a] font-semibold tracking-wider text-sm outline-none px-4 py-3 border-r border-[#333] appearance-none min-w-[100px] cursor-pointer ${
                method === 'GET' ? 'text-[#4caf50]' : 
                method === 'POST' ? 'text-[#ffb300]' : 
                method === 'PUT' ? 'text-[#2196f3]' :
                method === 'PATCH' ? 'text-[#9c27b0]' : 'text-[#f44336]'
              }`}
            >
              <option value="GET" className="text-[#4caf50]">GET</option>
              <option value="POST" className="text-[#ffb300]">POST</option>
              <option value="PUT" className="text-[#2196f3]">PUT</option>
              <option value="PATCH" className="text-[#9c27b0]">PATCH</option>
              <option value="DELETE" className="text-[#f44336]">DELETE</option>
            </select>
            
            <input 
              type="url" required
              value={url} 
              onChange={e => setUrl(e.target.value)}
              placeholder="Enter request URL"
              className="flex-1 bg-transparent text-white px-4 py-3 outline-none font-mono text-sm placeholder-zinc-600 focus:bg-[#303030]"
            />

            <button type="submit" disabled={isSubmitting} className="bg-[#f26b3a] hover:bg-[#e65c2b] text-white font-semibold tracking-wide px-8 py-3 cursor-pointer transition disabled:opacity-50">
              {isSubmitting ? 'Updating...' : 'Update & Resubmit'}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex gap-6 border-b border-[#333]">
              {['Params', 'Auth', 'Headers', 'Body'].map(tab => {
                let badgeCount = 0
                if (tab === 'Params') badgeCount = paramsArr.filter(p => p.key.trim()).length
                if (tab === 'Headers') badgeCount = headersArr.filter(h => h.key.trim()).length

                return (
                  <button 
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`pb-2 px-1 text-sm font-medium transition-colors ${
                      activeTab === tab 
                        ? 'text-zinc-200 border-b-2 border-[#f26b3a]' 
                        : 'text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent'
                    }`}
                  >
                    {tab} {badgeCount > 0 && <span className="ml-1 text-xs text-[#4caf50]">({badgeCount})</span>}
                    {tab === 'Auth' && authType !== 'None' && <span className="ml-1 w-2 h-2 rounded-full bg-[#f26b3a] inline-block mb-0.5"></span>}
                  </button>
                )
              })}
            </div>

            <div className="mt-2 text-sm min-h-[300px]">
              {activeTab === 'Params' && renderKVTable(paramsArr, setParamsArr)}
              {activeTab === 'Headers' && renderKVTable(headersArr, setHeadersArr)}

              {activeTab === 'Auth' && (
                <div className="h-full flex flex-col border border-[#333] rounded bg-[#1e1e1e]">
                  <div className="p-4 border-b border-[#333] flex items-center gap-4">
                    <span className="text-zinc-500 font-semibold text-xs tracking-wider">TYPE</span>
                    <select 
                      value={authType} 
                      onChange={e => setAuthType(e.target.value)}
                      className="bg-[#2a2a2a] text-zinc-300 text-sm outline-none px-3 py-1.5 border border-[#333] rounded"
                    >
                      <option value="None">No Auth</option>
                      <option value="Bearer Token">Bearer Token</option>
                      <option value="Basic Auth">Basic Auth</option>
                    </select>
                  </div>
                  <div className="p-6 flex-1">
                    {authType === 'None' && <p className="text-zinc-500 text-sm">This request does not use any authorization.</p>}
                    {authType === 'Bearer Token' && (
                      <div className="flex flex-col gap-2 max-w-md">
                        <label className="text-xs font-semibold text-zinc-500 tracking-wider">TOKEN</label>
                        <input 
                          type="text" value={bearerToken} onChange={e => setBearerToken(e.target.value)} 
                          placeholder="Enter Bearer token"
                          className="bg-[#2a2a2a] px-3 py-2 border border-[#333] rounded text-zinc-300 font-mono outline-none focus:border-[#f26b3a]"
                        />
                      </div>
                    )}
                    {authType === 'Basic Auth' && (
                      <div className="flex flex-col gap-4 max-w-md">
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-semibold text-zinc-500 tracking-wider">USERNAME</label>
                          <input 
                            type="text" value={basicUser} onChange={e => setBasicUser(e.target.value)} 
                            className="bg-[#2a2a2a] px-3 py-2 border border-[#333] rounded text-zinc-300 font-mono outline-none focus:border-[#f26b3a]"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-semibold text-zinc-500 tracking-wider">PASSWORD</label>
                          <input 
                            type="password" value={basicPass} onChange={e => setBasicPass(e.target.value)} 
                            className="bg-[#2a2a2a] px-3 py-2 border border-[#333] rounded text-zinc-300 font-mono outline-none focus:border-[#f26b3a]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'Body' && (
                <div className="h-full flex flex-col border border-[#333] rounded overflow-hidden bg-[#1e1e1e]">
                  <div className="flex bg-[#2a2a2a] border-b border-[#333] px-3 py-2 text-xs font-semibold text-zinc-500 tracking-wider items-center gap-4">
                    <label className="flex items-center gap-1 cursor-pointer hover:text-zinc-300">
                      <input type="radio" checked readOnly className="default:ring-[#f26b3a]" /> raw
                    </label>
                    <span className="text-zinc-600">JSON</span>
                  </div>
                  <textarea 
                    value={body} 
                    onChange={e => setBody(e.target.value)}
                    placeholder={`{\n  // Enter JSON body here\n}`}
                    className="w-full h-[400px] bg-transparent px-4 py-3 outline-none text-zinc-300 font-mono focus:ring-1 focus:ring-[#f26b3a] resize-none"
                  />
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-xl border ${toast.type === 'error' ? 'bg-red-900/30 border-red-500/50 text-red-500' : 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400'} font-medium z-50 animate-in slide-in-from-bottom-4`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
