"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

interface Usuario {
  id: string
  usuario: string
  nombre_completo: string
  rol: "admin" | "vendedor"
  activo: boolean
}

interface AuthContextType {
  usuario: Usuario | null
  loading: boolean
  signIn: (usuario: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  isAdmin: boolean
  isVendedor: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Verificar si hay una sesión guardada
    const savedUser = localStorage.getItem("vibes_user")
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        setUsuario(parsedUser)
      } catch (error) {
        localStorage.removeItem("vibes_user")
        document.cookie = "vibes_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
      }
    }
    setLoading(false)
  }, [])

  const signIn = async (usuarioInput: string, password: string) => {
    try {
      const { data, error } = await supabase.rpc("verificar_usuario", {
        p_usuario: usuarioInput,
        p_password: password,
      })

      if (error) {
        return { error }
      }

      if (data && data.length > 0) {
        const userData = data[0]
        const user: Usuario = {
          id: userData.id,
          usuario: userData.usuario,
          nombre_completo: userData.nombre_completo,
          rol: userData.rol,
          activo: userData.activo,
        }

        setUsuario(user)
        localStorage.setItem("vibes_user", JSON.stringify(user))

        document.cookie = `vibes_user=${JSON.stringify(user)}; path=/; max-age=${60 * 60 * 24 * 7}` // 7 días

        return { error: null }
      } else {
        return { error: { message: "Credenciales inválidas" } }
      }
    } catch (error) {
      return { error }
    }
  }

  const signOut = async () => {
    setUsuario(null)
    localStorage.removeItem("vibes_user")
    document.cookie = "vibes_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    router.push("/login")
  }

  const isAdmin = usuario?.rol === "admin"
  const isVendedor = usuario?.rol === "vendedor"

  const value = {
    usuario,
    loading,
    signIn,
    signOut,
    isAdmin,
    isVendedor,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
