"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Plus, Edit, Trash2, Tag, Package } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"

interface Category {
  id: string
  nombre: string
  descripcion: string | null
  created_at: string
  productos_count?: number
}

export default function CategoriesPage() {
  const { isAdmin } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
  })
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      // Obtener categorías con conteo de productos
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categorias")
        .select("*")
        .order("nombre")

      if (categoriesError) throw categoriesError

      // Obtener conteo de productos por categoría
      const categoriesWithCount = await Promise.all(
        (categoriesData || []).map(async (category) => {
          const { count } = await supabase
            .from("productos")
            .select("*", { count: "exact", head: true })
            .eq("categoria_id", category.id)

          return {
            ...category,
            productos_count: count || 0,
          }
        }),
      )

      setCategories(categoriesWithCount)
    } catch (error) {
      console.error("Error fetching categories:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setError("")

    try {
      if (!formData.nombre.trim()) {
        throw new Error("El nombre es requerido")
      }

      if (editingCategory) {
        // Actualizar categoría
        const { error } = await supabase
          .from("categorias")
          .update({
            nombre: formData.nombre.trim(),
            descripcion: formData.descripcion.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingCategory.id)

        if (error) throw error
      } else {
        // Crear nueva categoría
        const { error } = await supabase.from("categorias").insert({
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim() || null,
        })

        if (error) throw error
      }

      setShowForm(false)
      setEditingCategory(null)
      setFormData({ nombre: "", descripcion: "" })
      fetchCategories()
    } catch (error: any) {
      setError(error.message || "Error al guardar la categoría")
    } finally {
      setFormLoading(false)
    }
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      nombre: category.nombre,
      descripcion: category.descripcion || "",
    })
    setShowForm(true)
  }

  const handleDelete = async (categoryId: string, categoryName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la categoría "${categoryName}"?`)) return

    try {
      // Verificar si hay productos en esta categoría
      const { count } = await supabase
        .from("productos")
        .select("*", { count: "exact", head: true })
        .eq("categoria_id", categoryId)

      if (count && count > 0) {
        alert(`No se puede eliminar la categoría porque tiene ${count} producto(s) asociado(s)`)
        return
      }

      const { error } = await supabase.from("categorias").delete().eq("id", categoryId)

      if (error) throw error

      setCategories(categories.filter((c) => c.id !== categoryId))
    } catch (error) {
      console.error("Error deleting category:", error)
      alert("Error al eliminar la categoría")
    }
  }

  const resetForm = () => {
    setFormData({ nombre: "", descripcion: "" })
    setEditingCategory(null)
    setError("")
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Tag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p>Cargando categorías...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Categorías</h1>
            <p className="text-muted-foreground">Gestiona las categorías de productos</p>
          </div>
          {isAdmin && (
            <Dialog
              open={showForm}
              onOpenChange={(open) => {
                setShowForm(open)
                if (!open) resetForm()
              }}
            >
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Categoría
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingCategory ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle>
                  <DialogDescription>
                    {editingCategory ? "Modifica los datos de la categoría" : "Crea una nueva categoría de productos"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))}
                      placeholder="Nombre de la categoría"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea
                      id="descripcion"
                      value={formData.descripcion}
                      onChange={(e) => setFormData((prev) => ({ ...prev, descripcion: e.target.value }))}
                      placeholder="Descripción opcional de la categoría"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={formLoading}>
                      {formLoading ? "Guardando..." : editingCategory ? "Actualizar" : "Crear"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Categorías</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categories.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Productos Categorizados</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {categories.reduce((sum, cat) => sum + (cat.productos_count || 0), 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Categories Grid */}
        {categories.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Tag className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay categorías</h3>
              <p className="text-muted-foreground text-center mb-4">
                Comienza creando tu primera categoría de productos
              </p>
              {isAdmin && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Categoría
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Card key={category.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{category.nombre}</CardTitle>
                      <CardDescription className="mt-1">{category.descripcion || "Sin descripción"}</CardDescription>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(category)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(category.id, category.nombre)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Productos:</span>
                    <span className="text-sm font-semibold">{category.productos_count || 0} productos</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted-foreground">Creada:</span>
                    <span className="text-sm">{new Date(category.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
