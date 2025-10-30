"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, Grid3X3, List } from "lucide-react"
import { ProductForm } from "@/components/product-form"
import { DashboardLayout } from "@/components/dashboard-layout"

interface Product {
  id: string
  nombre: string
  descripcion: string | null
  precio: number
  costo: number
  stock: number
  stock_minimo: number
  categoria_id: string
  sku: string
  talle: string | null
  color: string | null
  created_at: string
  updated_at: string
  categorias: {
    id: string
    nombre: string
  }
}

interface Category {
  id: string
  nombre: string
}

export default function ProductsPage() {
  const { isAdmin } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("todas")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedSize, setSelectedSize] = useState<string>("todos")
  const [selectedColor, setSelectedColor] = useState<string>("todos")
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("productos")
        .select(`
          *,
          categorias (
            id,
            nombre
          )
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error("Error fetching productos:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("categorias").select("*").order("nombre")

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categorias:", error)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este producto?")) return

    try {
      const { error } = await supabase.from("productos").delete().eq("id", productId)

      if (error) throw error

      setProducts(products.filter((p) => p.id !== productId))
    } catch (error) {
      console.error("Error deleting producto:", error)
      alert("Error al eliminar el producto")
    }
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "todas" || product.categoria_id === selectedCategory
    const matchesSize = selectedSize === "todos" || product.talle === selectedSize
    const matchesColor = selectedColor === "todos" || product.color === selectedColor
    return matchesSearch && matchesCategory && matchesSize && matchesColor
  })

  const uniqueSizes = [...new Set(products.filter((p) => p.talle).map((p) => p.talle))].sort()
  const uniqueColors = [...new Set(products.filter((p) => p.color).map((p) => p.color))].sort()

  const lowStockProducts = products.filter((p) => p.stock <= p.stock_minimo)

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p>Cargando productos...</p>
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
            <h1 className="text-3xl font-bold">Productos</h1>
            <p className="text-muted-foreground">Gestiona tu inventario de productos</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center border rounded-lg p-1">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="h-8 px-3"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="h-8 px-3"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            {isAdmin && (
              <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingProduct(null)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Producto
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-screen max-w-[95vw] sm:max-w-[90vw] lg:max-w-[80vw] h-[90vh] overflow-y-auto p-6 mx-auto">
                  <div className="h-full flex flex-col">
                    <DialogHeader className="px-6 py-4 border-b">
                      <DialogTitle>{editingProduct ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
                      <DialogDescription>
                        {editingProduct ? "Modifica los datos del producto" : "Agrega un nuevo producto al inventario"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden">
                      <ProductForm
                        product={editingProduct}
                        categories={categories}
                        onSuccess={() => {
                          setShowForm(false)
                          setEditingProduct(null)
                          fetchProducts()
                        }}
                        onCancel={() => {
                          setShowForm(false)
                          setEditingProduct(null)
                        }}
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Total</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.reduce((sum, p) => sum + p.stock, 0)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{lowStockProducts.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar productos por nombre o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las categorías</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSize} onValueChange={setSelectedSize}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Todos los talles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los talles</SelectItem>
                {uniqueSizes.map((size) => (
                  <SelectItem key={size} value={size}>
                    Talle {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedColor} onValueChange={setSelectedColor}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Todos los colores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los colores</SelectItem>
                {uniqueColors.map((color) => (
                  <SelectItem key={color} value={color}>
                    {color}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Products Display */}
        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay productos</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm || selectedCategory !== "todas" || selectedSize !== "todos" || selectedColor !== "todos"
                  ? "No se encontraron productos con los filtros aplicados"
                  : "Comienza agregando tu primer producto al inventario"}
              </p>
              {isAdmin &&
                !searchTerm &&
                selectedCategory === "todas" &&
                selectedSize === "todos" &&
                selectedColor === "todos" && (
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Producto
                  </Button>
                )}
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg line-clamp-1">{product.nombre}</CardTitle>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingProduct(product)
                            setShowForm(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(product.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <CardDescription className="line-clamp-2">{product.descripcion || "Sin descripción"}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">SKU:</span>
                      <span className="text-sm font-mono">{product.sku}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Precio:</span>
                      <span className="text-sm font-semibold">${product.precio.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Stock:</span>
                      <Badge variant={product.stock <= product.stock_minimo ? "destructive" : "secondary"}>
                        {product.stock} unidades
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Categoría:</span>
                      <Badge variant="outline">{product.categorias.nombre}</Badge>
                    </div>
                    {(product.talle || product.color) && (
                      <div className="flex gap-2 pt-2">
                        {product.talle && (
                          <Badge variant="secondary" className="text-xs">
                            {product.talle}
                          </Badge>
                        )}
                        {product.color && (
                          <Badge variant="secondary" className="text-xs">
                            {product.color}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{product.nombre}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {product.descripcion || "Sin descripción"}
                          </p>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-1 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingProduct(product)
                                setShowForm(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(product.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-6 mt-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">SKU:</span>
                          <span className="text-sm font-mono">{product.sku}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Precio:</span>
                          <span className="text-sm font-semibold">${product.precio.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Stock:</span>
                          <Badge variant={product.stock <= product.stock_minimo ? "destructive" : "secondary"}>
                            {product.stock} unidades
                          </Badge>
                        </div>
                        <Badge variant="outline">{product.categorias.nombre}</Badge>
                        {product.talle && (
                          <Badge variant="secondary" className="text-xs">
                            Talle {product.talle}
                          </Badge>
                        )}
                        {product.color && (
                          <Badge variant="secondary" className="text-xs">
                            {product.color}
                          </Badge>
                        )}
                        {product.stock <= product.stock_minimo && <Badge variant="destructive">Stock Bajo</Badge>}
                      </div>
                    </div>
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
