"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react"

interface Product {
  id: string
  nombre: string
  descripcion: string | null
  precio: number
  costo: number
  categoria_id: string
  sku: string
}

interface ProductVariant {
  id?: string
  talle: string
  color: string
  stock: number
  stock_minimo: number
  sku_variante?: string
}

interface Category {
  id: string
  nombre: string
}

interface ProductFormProps {
  product?: Product | null
  categories: Category[]
  onSuccess: () => void
  onCancel: () => void
}

export function ProductForm({ product, categories, onSuccess, onCancel }: ProductFormProps) {
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    costo: "",
    categoria_id: "",
    sku: "",
  })
  const [variants, setVariants] = useState<ProductVariant[]>([{ talle: "", color: "", stock: 0, stock_minimo: 0 }])
  const [activeTab, setActiveTab] = useState("0")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const extractBaseSKU = (fullSKU: string, talle: string, color: string) => {
    if (!fullSKU || !talle || !color) return fullSKU

    const cleanTalle = talle.trim().replace(/\s+/g, "").toUpperCase()
    const cleanColor = color.trim().replace(/\s+/g, "").toUpperCase()
    const suffix = `${cleanTalle}${cleanColor}`

    if (fullSKU.endsWith(suffix)) {
      return fullSKU.slice(0, -suffix.length)
    }

    return fullSKU
  }

  useEffect(() => {
    if (product && categories.length > 0) {
      setFormData({
        nombre: product.nombre,
        descripcion: product.descripcion || "",
        precio: product.precio.toString(),
        costo: product.costo.toString(),
        categoria_id: product.categoria_id,
        sku: product.sku,
      })
      fetchProductVariants()
    }
  }, [product, categories]) // Added categories as dependency so form updates when categories load

  const fetchProductVariants = async () => {
    if (!product) return

    try {
      const { data, error } = await supabase.from("productos").select("*").eq("sku", product.sku)

      if (error) throw error

      if (data && data.length > 0) {
        const productVariants = data.map((item) => ({
          id: item.id,
          talle: item.talle || "",
          color: item.color || "",
          stock: item.stock || 0,
          stock_minimo: item.stock_minimo || 0,
          sku_variante: item.sku || "",
        }))
        setVariants(productVariants)

        if (productVariants.length > 0) {
          const firstVariant = productVariants[0]
          const baseSKU = extractBaseSKU(
            firstVariant.sku_variante || product.sku,
            firstVariant.talle,
            firstVariant.color,
          )
          setFormData((prev) => ({ ...prev, sku: baseSKU }))
        }
      }
    } catch (error) {
      console.error("Error fetching product variants:", error)
    }
  }

  const generateVariantSKU = (baseSKU: string, talle: string, color: string) => {
    if (!baseSKU.trim() || !talle.trim() || !color.trim()) return ""
    // Limpiar espacios y caracteres especiales, convertir a mayúsculas
    const cleanTalle = talle.trim().replace(/\s+/g, "").toUpperCase()
    const cleanColor = color.trim().replace(/\s+/g, "").toUpperCase()
    return `${baseSKU.trim()}${cleanTalle}${cleanColor}`
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Si cambió el SKU base, actualizar todos los SKUs de variantes
    if (field === "sku") {
      const updatedVariants = variants.map((variant) => ({
        ...variant,
        sku_variante: generateVariantSKU(value, variant.talle, variant.color),
      }))
      setVariants(updatedVariants)
    }
  }

  const handleVariantChange = (index: number, field: keyof ProductVariant, value: string | number) => {
    const updatedVariants = [...variants]
    updatedVariants[index] = { ...updatedVariants[index], [field]: value }

    if (field === "talle" || field === "color") {
      const variant = updatedVariants[index]
      const skuVariante = generateVariantSKU(formData.sku, variant.talle, variant.color)
      updatedVariants[index] = { ...updatedVariants[index], sku_variante: skuVariante }
    }

    setVariants(updatedVariants)
  }

  const addVariant = () => {
    const newVariant = {
      talle: "",
      color: "",
      stock: 0,
      stock_minimo: 0,
      sku_variante: "",
    }
    setVariants([...variants, newVariant])
    setActiveTab(variants.length.toString())
  }

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      const newVariants = variants.filter((_, i) => i !== index)
      setVariants(newVariants)
      if (activeTab === index.toString()) {
        setActiveTab("0")
      } else if (Number.parseInt(activeTab) > index) {
        setActiveTab((Number.parseInt(activeTab) - 1).toString())
      }
    }
  }

  const navigateTab = (direction: "prev" | "next") => {
    const currentIndex = Number.parseInt(activeTab)
    if (direction === "prev" && currentIndex > 0) {
      setActiveTab((currentIndex - 1).toString())
    } else if (direction === "next" && currentIndex < variants.length - 1) {
      setActiveTab((currentIndex + 1).toString())
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Validaciones
      if (!formData.nombre.trim()) {
        throw new Error("El nombre es requerido")
      }
      if (!formData.sku.trim()) {
        throw new Error("El SKU es requerido")
      }
      if (!formData.categoria_id) {
        throw new Error("La categoría es requerida")
      }
      if (variants.some((v) => !v.talle.trim() || !v.color.trim())) {
        throw new Error("Todas las variantes deben tener talle y color")
      }

      const skusVariantes = variants.map((v) => v.sku_variante).filter(Boolean)
      const skusUnicos = new Set(skusVariantes)
      if (skusVariantes.length !== skusUnicos.size) {
        throw new Error("Hay combinaciones de talle y color duplicadas")
      }

      // Si estamos editando, eliminar variantes existentes
      if (product) {
        const { error: deleteError } = await supabase.from("productos").delete().eq("sku", product.sku)

        if (deleteError) throw deleteError
      }

      // Crear todas las variantes del producto
      const productVariants = variants.map((variant) => ({
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || null,
        precio: Number.parseFloat(formData.precio) || 0,
        costo: Number.parseFloat(formData.costo) || 0,
        categoria_id: formData.categoria_id,
        sku: variant.sku_variante || generateVariantSKU(formData.sku, variant.talle, variant.color),
        talle: variant.talle.trim(),
        color: variant.color.trim(),
        stock: variant.stock,
        stock_minimo: variant.stock_minimo,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      const { error } = await supabase.from("productos").insert(productVariants)

      if (error) throw error

      onSuccess()
    } catch (error: any) {
      setError(error.message || "Error al guardar el producto")
    } finally {
      setLoading(false)
    }
  }

  const calculateMargin = () => {
    const precio = Number.parseFloat(formData.precio) || 0
    const costo = Number.parseFloat(formData.costo) || 0
    if (costo === 0) return 0
    return (((precio - costo) / costo) * 100).toFixed(1)
  }

  return (
    <div className="h-full overflow-y-auto">
      <form onSubmit={handleSubmit} className="space-y-8 p-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Columna 1: Información básica */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Información del Producto</h3>

              <div className="space-y-2">
                <Label htmlFor="nombre" className="text-base font-semibold">
                  Nombre *
                </Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => handleInputChange("nombre", e.target.value)}
                  placeholder="Nombre del producto"
                  className="h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku" className="text-base font-semibold">
                  SKU *
                </Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => handleInputChange("sku", e.target.value)}
                  placeholder="Código único del producto"
                  className="h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria" className="text-base font-semibold">
                  Categoría *
                </Label>
                <Select
                  key={formData.categoria_id}
                  value={formData.categoria_id}
                  onValueChange={(value) => handleInputChange("categoria_id", value)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion" className="text-base font-semibold">
                  Descripción
                </Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => handleInputChange("descripcion", e.target.value)}
                  placeholder="Descripción detallada del producto"
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>

            {/* Precios */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Precios</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="costo">Costo</Label>
                  <Input
                    id="costo"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.costo}
                    onChange={(e) => handleInputChange("costo", e.target.value)}
                    placeholder="0.00"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="precio">Precio de Venta</Label>
                  <Input
                    id="precio"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.precio}
                    onChange={(e) => handleInputChange("precio", e.target.value)}
                    placeholder="0.00"
                    className="h-11"
                  />
                </div>
              </div>

              {formData.precio && formData.costo && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Margen de ganancia:</span>
                    <Badge variant="secondary" className="text-sm">
                      {calculateMargin()}%
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Columna 2: Variantes con pestañas */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Variantes del Producto</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Variante
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="flex items-center gap-2 mb-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => navigateTab("prev")}
                      disabled={activeTab === "0"}
                      className="flex-shrink-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex-1 overflow-hidden">
                      <TabsList className="flex w-full overflow-x-auto scrollbar-hide gap-1 p-1">
                        {variants.map((variant, index) => (
                          <TabsTrigger
                            key={index}
                            value={index.toString()}
                            className="flex-shrink-0 text-xs whitespace-nowrap min-w-fit px-3"
                          >
                            {variant.talle && variant.color && (
                              <span className="ml-1 text-xs opacity-70">
                                ({variant.talle}-{variant.color})
                              </span>
                            )}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => navigateTab("next")}
                      disabled={activeTab === (variants.length - 1).toString()}
                      className="flex-shrink-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {variants.map((variant, index) => (
                    <TabsContent key={index} value={index.toString()} className="mt-0">
                      <Card className="p-4 bg-muted/30">
                        <div className="flex justify-between items-start mb-4">
                          <Badge variant="outline">Variante {index + 1}</Badge>
                          {variants.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeVariant(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label className="text-sm">Talle *</Label>
                              <Input
                                value={variant.talle}
                                onChange={(e) => handleVariantChange(index, "talle", e.target.value)}
                                placeholder="XS, S, M, L, XL"
                                className="h-9"
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm">Color *</Label>
                              <Input
                                value={variant.color}
                                onChange={(e) => handleVariantChange(index, "color", e.target.value)}
                                placeholder="Rojo, Azul, Negro"
                                className="h-9"
                                required
                              />
                            </div>
                          </div>

                          {variant.sku_variante && (
                            <div className="p-3 bg-blue-50 rounded border">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">SKU generado:</span>
                                <Badge variant="secondary" className="text-xs font-mono">
                                  {variant.sku_variante}
                                </Badge>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label className="text-sm">Stock</Label>
                              <Input
                                type="number"
                                min="0"
                                value={variant.stock}
                                onChange={(e) =>
                                  handleVariantChange(index, "stock", Number.parseInt(e.target.value) || 0)
                                }
                                placeholder="0"
                                className="h-9"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm">Stock Mínimo</Label>
                              <Input
                                type="number"
                                min="0"
                                value={variant.stock_minimo}
                                onChange={(e) =>
                                  handleVariantChange(index, "stock_minimo", Number.parseInt(e.target.value) || 0)
                                }
                                placeholder="0"
                                className="h-9"
                              />
                            </div>
                          </div>
                        </div>
                      </Card>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button type="button" variant="outline" onClick={onCancel} className="px-8 bg-transparent">
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="px-8">
            {loading ? "Guardando..." : product ? "Actualizar Producto" : "Crear Producto"}
          </Button>
        </div>
      </form>
    </div>
  )
}
