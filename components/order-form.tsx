"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Plus, Minus, Trash2, Search, Package } from "lucide-react"

interface Supplier {
  id: string
  nombre: string
}

interface Product {
  id: string
  nombre: string
  costo: number
  stock: number
  sku: string
  categorias: {
    nombre: string
  }
}

interface OrderItem {
  product: Product
  quantity: number
  cost: number
}

interface OrderFormProps {
  suppliers: Supplier[]
  onSuccess: () => void
  onCancel: () => void
}

export function OrderForm({ suppliers, onSuccess, onCancel }: OrderFormProps) {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSupplier, setSelectedSupplier] = useState("")
  const [expectedDate, setExpectedDate] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("productos")
        .select(`
          *,
          categorias (
            nombre
          )
        `)
        .order("nombre")

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error("Error fetching products:", error)
    }
  }

  const addToOrder = (product: Product) => {
    const existingItem = orderItems.find((item) => item.product.id === product.id)
    if (existingItem) {
      setOrderItems(
        orderItems.map((item) => (item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)),
      )
    } else {
      setOrderItems([...orderItems, { product, quantity: 1, cost: product.costo }])
    }
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromOrder(productId)
      return
    }

    setOrderItems(orderItems.map((item) => (item.product.id === productId ? { ...item, quantity: newQuantity } : item)))
  }

  const updateCost = (productId: string, newCost: number) => {
    setOrderItems(orderItems.map((item) => (item.product.id === productId ? { ...item, cost: newCost } : item)))
  }

  const removeFromOrder = (productId: string) => {
    setOrderItems(orderItems.filter((item) => item.product.id !== productId))
  }

  const total = orderItems.reduce((sum, item) => sum + item.cost * item.quantity, 0)

  const filteredProducts = products.filter(
    (product) =>
      (product.nombre?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (product.sku?.toLowerCase() || "").includes(searchTerm.toLowerCase()),
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (!selectedSupplier) {
        throw new Error("Debe seleccionar un proveedor")
      }
      if (orderItems.length === 0) {
        throw new Error("Debe agregar al menos un producto")
      }

      // Crear el pedido
      const { data: orderData, error: orderError } = await supabase
        .from("pedidos_proveedor")
        .insert([
          {
            proveedor_id: selectedSupplier,
            estado: "pendiente",
            total,
            notas: notes.trim() || null,
            fecha_esperada: expectedDate || null,
            usuario_id: user?.id,
          },
        ])
        .select()
        .single()

      if (orderError) throw orderError

      // Crear los items del pedido
      const orderItemsData = orderItems.map((item) => ({
        pedido_id: orderData.id,
        producto_id: item.product.id,
        cantidad: item.quantity,
        costo_unitario: item.cost,
      }))

      const { error: itemsError } = await supabase.from("pedidos_proveedor_detalle").insert(orderItemsData)

      if (itemsError) throw itemsError

      onSuccess()
    } catch (error: any) {
      setError(error.message || "Error al crear el pedido")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Products Selection */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="search">Buscar Productos</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Buscar por nombre o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto space-y-2">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="p-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 bg-slate-100 rounded">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{product.nombre}</h4>
                  <p className="text-xs text-muted-foreground">{product.sku}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      Costo: ${product.costo?.toFixed(2) || "0.00"}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Stock: {product.stock || 0}
                    </Badge>
                  </div>
                </div>
                <Button size="sm" onClick={() => addToOrder(product)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Order Details */}
      <div className="space-y-4">
        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Productos del Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {orderItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No hay productos en el pedido</p>
            ) : (
              orderItems.map((item) => (
                <div key={item.product.id} className="space-y-2 p-3 border rounded">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.product.nombre}</p>
                      <p className="text-xs text-muted-foreground">{item.product.sku}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeFromOrder(item.product.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Cantidad</Label>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Costo Unit.</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.cost}
                        onChange={(e) => updateCost(item.product.id, Number.parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Total</Label>
                      <div className="h-8 flex items-center text-sm font-medium">
                        ${(item.cost * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Total */}
        {orderItems.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between font-bold text-lg">
                <span>Total del Pedido:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalles del Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="supplier">Proveedor *</Label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="expectedDate">Fecha Esperada de Entrega</Label>
                <Input
                  id="expectedDate"
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas adicionales sobre el pedido"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || orderItems.length === 0}>
              {loading ? "Creando..." : "Crear Pedido"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
