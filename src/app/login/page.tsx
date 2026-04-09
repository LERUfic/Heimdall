'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
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
        router.push('/')
      } else {
        showToast('Login failed', 'error')
      }
    } catch (err) {
      showToast('Login failed. Network error.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="bg-zinc-900 p-8 rounded-xl shadow-2xl w-full max-w-sm ring-1 ring-zinc-800">
        <h1 className="text-2xl font-bold text-white mb-6 text-center tracking-tight">Login</h1>

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
                    placeholder="e.g. requester1 or admin1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    value={password}
                    onChange={w => setPassword(w.target.value)}
                    placeholder="Mock pwd is 'password'"
                  />
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
