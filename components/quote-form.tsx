"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Plus, Minus, Trash2, Search, Package } from "lucide-react"

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

interface QuoteItem {
  product: Product
  cantidad: number
}

interface Quote {
  id: string
  cliente_nombre: string
  cliente_telefono: string | null
  estado: string
  subtotal: number
  descuento: number
  total: number
  valido_hasta: string
  notas: string | null
}

interface QuoteFormProps {
  quote?: Quote | null
  onSuccess: () => void
  onCancel: () => void
}

export function QuoteForm({ quote, onSuccess, onCancel }: QuoteFormProps) {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [clientSearch, setClientSearch] = useState("")
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showNewClientForm, setShowNewClientForm] = useState(false)
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [customerData, setCustomerData] = useState({
    name: "",
    phone: "",
  })
  const [discount, setDiscount] = useState(0)
  const [validUntil, setValidUntil] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchProducts()
    fetchClients()

    // Set default valid until date (30 days from now)
    const defaultDate = new Date()
    defaultDate.setDate(defaultDate.getDate() + 30)
    setValidUntil(defaultDate.toISOString().split("T")[0])

    if (quote) {
      setCustomerData({
        name: quote.cliente_nombre,
        phone: quote.cliente_telefono || "",
      })
      setDiscount((quote.descuento / quote.subtotal) * 100)
      setValidUntil(quote.valido_hasta.split("T")[0])
      setNotes(quote.notas || "")
      fetchQuoteItems()
    }
  }, [quote])

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase.from("clientes").select("*").order("nombre")

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error("Error fetching clients:", error)
    }
  }

  const selectClient = (client: Client) => {
    setSelectedClient(client)
    setCustomerData({
      name: client.nombre,
      phone: client.telefono || "",
    })
    setClientSearch(client.nombre)
    setShowNewClientForm(false)
  }

  const createNewClient = () => {
    setSelectedClient(null)
    setCustomerData({ name: "", phone: "" })
    setClientSearch("")
    setShowNewClientForm(true)
  }

  const filteredClients = clients.filter(
    (client) =>
      client.nombre.toLowerCase().includes(clientSearch.toLowerCase()) ||
      (client.telefono && client.telefono.includes(clientSearch)),
  )

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

  const fetchQuoteItems = async () => {
    if (!quote) return

    try {
      const { data, error } = await supabase
        .from("presupuestos_detalle")
        .select(`
          *,
          productos (
            *,
            categorias (
              nombre
            )
          )
        `)
        .eq("presupuesto_id", quote.id)

      if (error) throw error

      const items = (data || []).map((item) => ({
        product: item.productos,
        cantidad: item.cantidad,
      }))

      setQuoteItems(items)
    } catch (error) {
      console.error("Error fetching quote items:", error)
    }
  }

  const addToQuote = (product: Product) => {
    const existingItem = quoteItems.find((item) => item.product.id === product.id)
    if (existingItem) {
      if (existingItem.cantidad < product.stock) {
        setQuoteItems(
          quoteItems.map((item) => (item.product.id === product.id ? { ...item, cantidad: item.cantidad + 1 } : item)),
        )
      }
    } else {
      setQuoteItems([...quoteItems, { product, cantidad: 1 }])
    }
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromQuote(productId)
      return
    }

    const product = products.find((p) => p.id === productId)
    if (product && newQuantity <= product.stock) {
      setQuoteItems(
        quoteItems.map((item) => (item.product.id === productId ? { ...item, cantidad: newQuantity } : item)),
      )
    }
  }

  const removeFromQuote = (productId: string) => {
    setQuoteItems(quoteItems.filter((item) => item.product.id !== productId))
  }

  const subtotal = quoteItems.reduce((sum, item) => sum + item.product.precio * item.cantidad, 0)
  const discountAmount = (subtotal * discount) / 100
  const total = subtotal - discountAmount

  const filteredProducts = products.filter(
    (product) =>
      product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (!customerData.name.trim()) {
        throw new Error("El nombre del cliente es requerido")
      }
      if (!validUntil) {
        throw new Error("La fecha de validez es requerida")
      }
      if (quoteItems.length === 0) {
        throw new Error("Debe agregar al menos un producto")
      }

      let clientId = selectedClient?.id
      if (!selectedClient && showNewClientForm) {
        const { data: newClient, error: clientError } = await supabase
          .from("clientes")
          .insert([
            {
              nombre: customerData.name.trim(),
              telefono: customerData.phone.trim() || null,
            },
          ])
          .select()
          .single()

        if (clientError) throw clientError
        clientId = newClient.id
      }

      const quoteData = {
        cliente_nombre: customerData.name.trim(),
        cliente_telefono: customerData.phone.trim() || null,
        cliente_id: clientId || null,
        estado: "borrador",
        subtotal,
        descuento: discountAmount,
        total,
        valido_hasta: validUntil,
        notas: notes.trim() || null,
        usuario_id: user?.id,
        updated_at: new Date().toISOString(),
      }

      let quoteId: string

      if (quote) {
        // Actualizar presupuesto existente
        const { error } = await supabase.from("presupuestos").update(quoteData).eq("id", quote.id)

        if (error) throw error

        // Eliminar items existentes
        const { error: deleteError } = await supabase
          .from("presupuestos_detalle")
          .delete()
          .eq("presupuesto_id", quote.id)

        if (deleteError) throw deleteError

        quoteId = quote.id
      } else {
        // Crear nuevo presupuesto
        const { data: newQuote, error } = await supabase
          .from("presupuestos")
          .insert([
            {
              ...quoteData,
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .single()

        if (error) throw error
        quoteId = newQuote.id
      }

      const quoteItemsData = quoteItems.map((item) => ({
        presupuesto_id: quoteId,
        producto_id: item.product.id,
        cantidad: item.cantidad,
        precio_unitario: item.product.precio,
      }))

      const { error: itemsError } = await supabase.from("presupuestos_detalle").insert(quoteItemsData)

      if (itemsError) throw itemsError

      onSuccess()
    } catch (error: any) {
      setError(error.message || "Error al guardar el presupuesto")
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
                <div className="w-12 h-12 relative bg-slate-100 rounded flex items-center justify-center">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{product.nombre}</h4>
                  <p className="text-xs text-muted-foreground">{product.sku}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      ${product.precio.toFixed(2)}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Stock: {product.stock}
                    </Badge>
                  </div>
                </div>
                <Button size="sm" onClick={() => addToQuote(product)} disabled={product.stock === 0}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Quote Items and Customer Info */}
      <div className="space-y-4">
        {/* Quote Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Productos del Presupuesto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quoteItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No hay productos en el presupuesto</p>
            ) : (
              quoteItems.map((item) => (
                <div key={item.product.id} className="flex items-center gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.product.nombre}</p>
                    <p className="text-xs text-muted-foreground">${item.product.precio.toFixed(2)} c/u</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.product.id, item.cantidad - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm">{item.cantidad}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.product.id, item.cantidad + 1)}
                      disabled={item.cantidad >= item.product.stock}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-sm font-medium w-16 text-right">
                    ${(item.product.precio * item.cantidad).toFixed(2)}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeFromQuote(item.product.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Totals */}
        {quoteItems.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-2">
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
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="clientSearch">Buscar Cliente Existente</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="clientSearch"
                    placeholder="Buscar por nombre o teléfono..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Lista de clientes encontrados */}
                {clientSearch && !selectedClient && filteredClients.length > 0 && (
                  <div className="border rounded-md max-h-32 overflow-y-auto mt-2">
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
                  className="w-full mt-2 bg-transparent"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Nuevo Cliente
                </Button>
              </div>

              <div>
                <Label htmlFor="customerName">Nombre *</Label>
                <Input
                  id="customerName"
                  value={customerData.name}
                  onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                  placeholder="Nombre del cliente"
                  required
                  disabled={selectedClient && !showNewClientForm}
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">Teléfono</Label>
                <Input
                  id="customerPhone"
                  value={customerData.phone}
                  onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                  placeholder="Teléfono del cliente"
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
                        setCustomerData({ name: "", phone: "" })
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
              <CardTitle className="text-lg">Detalles del Presupuesto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="discount">Descuento (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={(e) => setDiscount(Number.parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="validUntil">Válido hasta *</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas adicionales sobre el presupuesto"
                  rows={2}
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
            <Button type="submit" disabled={loading || quoteItems.length === 0}>
              {loading ? "Guardando..." : quote ? "Actualizar" : "Crear Presupuesto"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
