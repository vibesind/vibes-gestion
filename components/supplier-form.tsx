"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"

interface Supplier {
  id: string
  nombre: string
  contacto_nombre: string | null
  email: string | null
  telefono: string | null
  direccion: string | null
}

interface SupplierFormProps {
  supplier?: Supplier | null
  onSuccess: () => void
  onCancel: () => void
}

export function SupplierForm({ supplier, onSuccess, onCancel }: SupplierFormProps) {
  const [formData, setFormData] = useState({
    nombre: "",
    contacto_nombre: "",
    email: "",
    telefono: "",
    direccion: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (supplier) {
      setFormData({
        nombre: supplier.nombre,
        contacto_nombre: supplier.contacto_nombre || "",
        email: supplier.email || "",
        telefono: supplier.telefono || "",
        direccion: supplier.direccion || "",
      })
    }
  }, [supplier])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (!formData.nombre.trim()) {
        throw new Error("El nombre del proveedor es requerido")
      }

      const supplierData = {
        nombre: formData.nombre.trim(),
        contacto_nombre: formData.contacto_nombre.trim() || null,
        email: formData.email.trim() || null,
        telefono: formData.telefono.trim() || null,
        direccion: formData.direccion.trim() || null,
        updated_at: new Date().toISOString(),
      }

      if (supplier) {
        // Actualizar proveedor existente
        const { error } = await supabase.from("proveedores").update(supplierData).eq("id", supplier.id)

        if (error) throw error
      } else {
        // Crear nuevo proveedor
        const { error } = await supabase.from("proveedores").insert([
          {
            ...supplierData,
            created_at: new Date().toISOString(),
          },
        ])

        if (error) throw error
      }

      onSuccess()
    } catch (error: any) {
      setError(error.message || "Error al guardar el proveedor")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre del Proveedor *</Label>
        <Input
          id="nombre"
          value={formData.nombre}
          onChange={(e) => handleInputChange("nombre", e.target.value)}
          placeholder="Nombre de la empresa"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contacto_nombre">Nombre del Contacto</Label>
        <Input
          id="contacto_nombre"
          value={formData.contacto_nombre}
          onChange={(e) => handleInputChange("contacto_nombre", e.target.value)}
          placeholder="Persona de contacto"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            placeholder="email@proveedor.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input
            id="telefono"
            value={formData.telefono}
            onChange={(e) => handleInputChange("telefono", e.target.value)}
            placeholder="Número de teléfono"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="direccion">Dirección</Label>
        <Textarea
          id="direccion"
          value={formData.direccion}
          onChange={(e) => handleInputChange("direccion", e.target.value)}
          placeholder="Dirección completa del proveedor"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : supplier ? "Actualizar" : "Crear Proveedor"}
        </Button>
      </div>
    </form>
  )
}
