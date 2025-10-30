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
import { Plus, Minus, Trash2, Search, ShoppingCart, Package } from "lucide-react"

interface Product {
  id: string
  nombre: string
  precio: number
  stock: number
  sku: string
  categorias: {
    nombre: string
  }
}

interface Client {
  id: string
  nombre: string
  telefono: string | null
  email: string | null
  direccion: string | null
}

interface CartItem {
  product: Product
  quantity: number
}

interface SaleFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export function SaleForm({ onSuccess, onCancel }: SaleFormProps) {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [clientSearch, setClientSearch] = useState("")
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showNewClientForm, setShowNewClientForm] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [customerData, setCustomerData] = useState({
    nombre: "",
    telefono: "",
  })
  const [paymentMethod, setPaymentMethod] = useState("")
  const [discount, setDiscount] = useState(0)
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchProducts()
    fetchClients()
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
        .gt("stock", 0)
        .order("nombre")

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error("Error fetching products:", error)
    }
  }

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase.from("clientes").select("*").order("nombre")

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error("Error fetching clients:", error)
    }
  }

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.product.id === product.id)
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        setCart(cart.map((item) => (item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)))
      }
    } else {
      setCart([...cart, { product, quantity: 1 }])
    }
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }

    const product = products.find((p) => p.id === productId)
    if (product && newQuantity <= product.stock) {
      setCart(cart.map((item) => (item.product.id === productId ? { ...item, quantity: newQuantity } : item)))
    }
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId))
  }

  const subtotal = cart.reduce((sum, item) => sum + item.product.precio * item.quantity, 0)
  const discountAmount = (subtotal * discount) / 100
  const total = subtotal - discountAmount

  const filteredProducts = products.filter(
    (product) =>
      product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredClients = clients.filter(
    (client) =>
      client.nombre.toLowerCase().includes(clientSearch.toLowerCase()) ||
      (client.telefono && client.telefono.includes(clientSearch)),
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (!customerData.nombre.trim()) {
        throw new Error("El nombre del cliente es requerido")
      }
      if (!paymentMethod) {
        throw new Error("El método de pago es requerido")
      }
      if (cart.length === 0) {
        throw new Error("Debe agregar al menos un producto")
      }

      let clientId = selectedClient?.id
      if (!selectedClient && showNewClientForm) {
        const { data: newClient, error: clientError } = await supabase
          .from("clientes")
          .insert([
            {
              nombre: customerData.nombre.trim(),
              telefono: customerData.telefono.trim() || null,
            },
          ])
          .select()
          .single()

        if (clientError) throw clientError
        clientId = newClient.id
      }

      // Crear la venta
      const { data: saleData, error: saleError } = await supabase
        .from("ventas")
        .insert([
          {
            cliente_nombre: customerData.nombre.trim(),
            cliente_telefono: customerData.telefono.trim() || null,
            cliente_id: clientId || null,
            subtotal,
            descuento: discountAmount,
            total,
            metodo_pago: paymentMethod,
            notas: notes.trim() || null,
            usuario_id: user?.id,
          },
        ])
        .select()
        .single()

      if (saleError) throw saleError

      // Crear los items de la venta
      const saleItems = cart.map((item) => ({
        venta_id: saleData.id,
        producto_id: item.product.id,
        cantidad: item.quantity,
        precio_unitario: item.product.precio,
        precio_total: item.product.precio * item.quantity,
      }))

      const { error: itemsError } = await supabase.from("ventas_detalle").insert(saleItems)

      if (itemsError) throw itemsError

      // Actualizar stock de productos
      for (const item of cart) {
        const { error: stockError } = await supabase
          .from("productos")
          .update({ stock: item.product.stock - item.quantity })
          .eq("id", item.product.id)

        if (stockError) throw stockError
      }

      onSuccess()
    } catch (error: any) {
      setError(error.message || "Error al procesar la venta")
    } finally {
      setLoading(false)
    }
  }

  const selectClient = (client: Client) => {
    setSelectedClient(client)
    setCustomerData({
      nombre: client.nombre,
      telefono: client.telefono || "",
    })
    setClientSearch(client.nombre)
    setShowNewClientForm(false)
  }

  const createNewClient = () => {
    setSelectedClient(null)
    setCustomerData({ nombre: "", telefono: "" })
    setClientSearch("")
    setShowNewClientForm(true)
  }

  return (
    <div className="max-h-[85vh] overflow-y-auto">
      <div className="p-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna 1: Búsqueda y selección de productos */}
          <div className="space-y-6">
            <div>
              <Label htmlFor="search" className="text-base font-semibold">
                Buscar Productos
              </Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar por nombre o SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Productos Disponibles</h3>
              <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 relative bg-slate-100 rounded-lg flex-shrink-0 flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{product.nombre}</h4>
                        <p className="text-xs text-muted-foreground">{product.sku}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            ${product.precio.toFixed(2)}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            Stock: {product.stock}
                          </Badge>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => addToCart(product)} disabled={product.stock === 0}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Columna 2: Carrito de compras */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Carrito de Compras
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No hay productos en el carrito</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-64 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.product.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.product.nombre}</p>
                          <p className="text-xs text-muted-foreground">${item.product.precio.toFixed(2)} c/u</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stock}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-sm font-medium w-20 text-right">
                          ${(item.product.precio * item.quantity).toFixed(2)}
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => removeFromCart(item.product.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Totales */}
            {cart.length > 0 && (
              <Card>
                <CardContent className="p-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Descuento ({discount}%):</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-xl border-t pt-3">
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Columna 3: Información del cliente y pago */}
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Información del Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientSearch">Buscar Cliente Existente</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="clientSearch"
                        placeholder="Buscar por nombre o teléfono..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="pl-10 h-11"
                      />
                    </div>

                    {/* Lista de clientes encontrados */}
                    {clientSearch && !selectedClient && filteredClients.length > 0 && (
                      <div className="border rounded-md max-h-32 overflow-y-auto">
                        {filteredClients.slice(0, 5).map((client) => (
                          <div
                            key={client.id}
                            className="p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                            onClick={() => selectClient(client)}
                          >
                            <div className="font-medium text-sm">{client.nombre}</div>
                            {client.telefono && <div className="text-xs text-muted-foreground">{client.telefono}</div>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Botón para crear nuevo cliente */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={createNewClient}
                      className="w-full bg-transparent"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Nuevo Cliente
                    </Button>
                  </div>

                  {/* Campos del cliente */}
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Nombre *</Label>
                    <Input
                      id="customerName"
                      value={customerData.nombre}
                      onChange={(e) => setCustomerData({ ...customerData, nombre: e.target.value })}
                      placeholder="Nombre del cliente"
                      className="h-11"
                      required
                      disabled={selectedClient && !showNewClientForm}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerPhone">Teléfono</Label>
                    <Input
                      id="customerPhone"
                      value={customerData.telefono}
                      onChange={(e) => setCustomerData({ ...customerData, telefono: e.target.value })}
                      placeholder="Teléfono del cliente"
                      className="h-11"
                      disabled={selectedClient && !showNewClientForm}
                    />
                  </div>

                  {/* Mostrar información del cliente seleccionado */}
                  {selectedClient && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm text-green-800">Cliente Seleccionado</div>
                          <div className="text-xs text-green-600">{selectedClient.nombre}</div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedClient(null)
                            setClientSearch("")
                            setCustomerData({ nombre: "", telefono: "" })
                          }}
                        >
                          Cambiar
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detalles de Pago</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Método de Pago *</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Selecciona método de pago" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                        <SelectItem value="tarjeta">Tarjeta</SelectItem>
                        <SelectItem value="transferencia">Transferencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount">Descuento (%)</Label>
                    <Input
                      id="discount"
                      type="number"
                      min="0"
                      max="100"
                      value={discount}
                      onChange={(e) => setDiscount(Number.parseFloat(e.target.value) || 0)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notas</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notas adicionales sobre la venta"
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                </CardContent>
              </Card>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onCancel} className="px-8 bg-transparent">
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading || cart.length === 0} className="px-8">
                  {loading ? "Procesando..." : "Completar Venta"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
