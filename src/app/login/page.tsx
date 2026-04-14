'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [providers, setProviders] = useState<{ ldap: boolean, sso: boolean } | null>(null)
  const [toast, setToast] = useState<{ msg: string, type: 'error' | 'success' } | null>(null)
  const router = useRouter()

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    fetch('/api/auth/providers')
      .then(res => res.json())
      .then(data => setProviders(data))
      .catch(() => setProviders({ ldap: true, sso: false }))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      })
      if (res.ok) {
        window.location.href = '/'
      } else {
        showToast('Login failed', 'error')
      }
    } catch {
      showToast('Login failed. Network error.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="bg-zinc-900 p-8 rounded-xl shadow-2xl w-full max-w-sm ring-1 ring-zinc-800">
        <div className="flex items-center gap-3 mb-10 justify-center">
          <Image src="/logo.svg" alt="Heimdall Logo" width={48} height={48} />
          <div className="flex flex-col">
            <h1 className="text-3xl font-black tracking-tighter text-white leading-none">HEIMDALL</h1>
            <span className="text-[11px] font-bold text-[#00C2FF] tracking-[.2em] leading-none mt-1 uppercase">Project</span>
          </div>
        </div>

        {providers === null ? (
          <div className="text-zinc-500 text-center animate-pulse">Loading configurations...</div>
        ) : (
          <div className="space-y-6">
            {providers.ldap && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Username</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    value={username}
                    onChange={w => setUsername(w.target.value)}
                    placeholder="username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition pr-10"
                      value={password}
                      onChange={w => setPassword(w.target.value)}
                      placeholder="password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition focus:outline-none cursor-pointer"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full bg-[#f26b3a] hover:bg-[#e65c2b] text-white font-medium py-2 px-4 rounded-lg transition shadow-md ${isLoading ? 'opacity-70 cursor-wait' : 'cursor-pointer'}`}
                >
                  {isLoading ? 'Signing in...' : 'Sign in via LDAP'}
                </button>
              </form>
            )}

            {providers.ldap && providers.sso && (
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-zinc-700"></div>
                <span className="flex-shrink-0 mx-4 text-zinc-500 text-xs font-semibold uppercase tracking-wider">OR</span>
                <div className="flex-grow border-t border-zinc-700"></div>
              </div>
            )}

            {providers.sso && (
              <a
                href="/api/auth/sso"
                className="w-full flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2.5 px-4 rounded-lg transition border border-zinc-700"
              >
                Sign in with SSO
              </a>
            )}
          </div>
        )}
      </div>
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-xl border ${toast.type === 'error' ? 'bg-red-900/30 border-red-500/50 text-red-500' : 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400'} font-medium z-50 animate-in slide-in-from-bottom-4`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
