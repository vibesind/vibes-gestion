"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirigir automáticamente al login
    router.push("/login")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Cargando...</h1>
        <p className="text-muted-foreground">Redirigiendo al sistema de login</p>
      </div>
    </div>
  )
}
