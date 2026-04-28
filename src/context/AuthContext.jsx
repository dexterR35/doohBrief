import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let mounted = true

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!mounted) return
        setUser(data?.user ?? null)
      })
      .catch(() => {
        if (!mounted) return
        setUser(null)
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  const value = useMemo(() => {
    return {
      user,
      profile: {
        role: 'member',
        name: user?.email || 'Anonymous',
      },
      loading,
      signingOut,
      hasPermission: () => true,
      signIn: async ({ email, password }) => {
        if (!email || !password) {
          return { error: { message: 'Email and password are required' } }
        }
        return supabase.auth.signInWithPassword({ email, password })
      },
      signOut: async () => {
        setSigningOut(true)
        try {
          return await supabase.auth.signOut()
        } finally {
          setSigningOut(false)
        }
      },
    }
  }, [loading, signingOut, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
