"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Plus, Search, Eye, FileText, ShoppingCart, Clock, CheckCircle, XCircle, Edit, Trash2 } from "lucide-react"
import { QuoteForm } from "@/components/quote-form"
import { QuoteDetails } from "@/components/quote-details"
import { DashboardLayout } from "@/components/dashboard-layout"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Quote {
  id: string
  cliente_nombre: string
  cliente_telefono: string | null
  estado: "borrador" | "enviado" | "aprobado" | "rechazado" | "convertido"
  subtotal: number
  impuesto: number
  total: number
  valido_hasta: string
  notas: string | null
  created_at: string
  updated_at: string
  usuarios: {
    nombre_completo: string | null
  }
}

export default function QuotesPage() {
  const { profile } = useAuth()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showQuoteForm, setShowQuoteForm] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [showQuoteDetails, setShowQuoteDetails] = useState(false)
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null)

  useEffect(() => {
    fetchQuotes()
  }, [])

  const fetchQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from("presupuestos")
        .select(`
          *,
          usuarios (
            nombre_completo
          )
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setQuotes(data || [])
    } catch (error) {
      console.error("Error fetching quotes:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateQuoteStatus = async (quoteId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("presupuestos")
        .update({
          estado: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", quoteId)

      if (error) throw error

      fetchQuotes()
    } catch (error) {
      console.error("Error updating quote status:", error)
      alert("Error al actualizar el estado del presupuesto")
    }
  }

  const convertToSale = async (quote: Quote) => {
    if (!confirm("¿Convertir este presupuesto en una venta?")) return

    try {
      // Obtener los items del presupuesto
      const { data: quoteItems, error: itemsError } = await supabase
        .from("presupuestos_detalle")
        .select(`
          *,
          productos (
            id,
            stock
          )
        `)
        .eq("presupuesto_id", quote.id)

      if (itemsError) throw itemsError

      // Verificar stock disponible
      for (const item of quoteItems || []) {
        if (item.productos.stock < item.cantidad) {
          alert(`Stock insuficiente para ${item.productos.nombre}. Stock disponible: ${item.productos.stock}`)
          return
        }
      }

      // Crear la venta
      const { data: saleData, error: saleError } = await supabase
        .from("ventas")
        .insert([
          {
            cliente_nombre: quote.cliente_nombre,
            cliente_telefono: quote.cliente_telefono,
            subtotal: quote.subtotal,
            impuesto: quote.impuesto,
            total: quote.total,
            metodo_pago: "pendiente",
            notas: `Convertido desde presupuesto #${quote.id.slice(-8)}`,
            usuario_id: profile?.id,
          },
        ])
        .select()
        .single()

      if (saleError) throw saleError

      // Crear los items de la venta
      const saleItems = (quoteItems || []).map((item) => ({
        venta_id: saleData.id,
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        precio_total: item.precio_total,
      }))

      const { error: saleItemsError } = await supabase.from("ventas_detalle").insert(saleItems)

      if (saleItemsError) throw saleItemsError

      // Actualizar stock de productos
      for (const item of quoteItems || []) {
        const { error: stockError } = await supabase
          .from("productos")
          .update({ stock: item.productos.stock - item.cantidad })
          .eq("id", item.producto_id)

        if (stockError) throw stockError
      }

      // Marcar presupuesto como convertido
      await updateQuoteStatus(quote.id, "convertido")

      alert("Presupuesto convertido a venta exitosamente")
    } catch (error) {
      console.error("Error converting quote to sale:", error)
      alert("Error al convertir el presupuesto")
    }
  }

  const handleDeleteQuote = async (quoteId: string) => {
    try {
      // Eliminar detalles del presupuesto primero
      const { error: detailsError } = await supabase.from("presupuestos_detalle").delete().eq("presupuesto_id", quoteId)

      if (detailsError) throw detailsError

      // Eliminar el presupuesto
      const { error: quoteError } = await supabase.from("presupuestos").delete().eq("id", quoteId)

      if (quoteError) throw quoteError

      fetchQuotes()
    } catch (error) {
      console.error("Error deleting quote:", error)
      alert("Error al eliminar el presupuesto")
    }
  }

  const filteredQuotes = quotes.filter((quote) => {
    const matchesSearch =
      quote.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || quote.estado === statusFilter
    return matchesSearch && matchesStatus
  })

  const pendingQuotes = quotes.filter((q) => q.estado === "enviado").length
  const approvedQuotes = quotes.filter((q) => q.estado === "aprobado").length
  const totalQuotes = quotes.length
  const totalQuoteValue = quotes.reduce((sum, quote) => sum + quote.total, 0)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "borrador":
        return <Edit className="h-4 w-4" />
      case "enviado":
        return <Clock className="h-4 w-4" />
      case "aprobado":
        return <CheckCircle className="h-4 w-4" />
      case "rechazado":
        return <XCircle className="h-4 w-4" />
      case "convertido":
        return <ShoppingCart className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "borrador":
        return "secondary"
      case "enviado":
        return "default"
      case "aprobado":
        return "outline"
      case "rechazado":
        return "destructive"
      case "convertido":
        return "outline"
      default:
        return "default"
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p>Cargando presupuestos...</p>
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
            <h1 className="text-3xl font-bold">Presupuestos</h1>
            <p className="text-muted-foreground">Crea y gestiona presupuestos para clientes</p>
          </div>
          <Dialog open={showQuoteForm} onOpenChange={setShowQuoteForm}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingQuote(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Presupuesto
              </Button>
            </DialogTrigger>
            <DialogContent className="w-screen max-w-[95vw] sm:max-w-[90vw] lg:max-w-[80vw] h-[90vh] overflow-y-auto p-6 mx-auto">
              <DialogHeader>
                <DialogTitle>{editingQuote ? "Editar Presupuesto" : "Nuevo Presupuesto"}</DialogTitle>
                <DialogDescription>
                  {editingQuote
                    ? "Modifica el presupuesto existente"
                    : "Crea un presupuesto seleccionando productos y cliente"}
                </DialogDescription>
              </DialogHeader>
              <QuoteForm
                quote={editingQuote}
                onSuccess={() => {
                  setShowQuoteForm(false)
                  setEditingQuote(null)
                  fetchQuotes()
                }}
                onCancel={() => {
                  setShowQuoteForm(false)
                  setEditingQuote(null)
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{pendingQuotes}</div>
              <p className="text-xs text-muted-foreground">Enviados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aprobados</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{approvedQuotes}</div>
              <p className="text-xs text-muted-foreground">Listos para convertir</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Presupuestos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalQuotes}</div>
              <p className="text-xs text-muted-foreground">Todos los presupuestos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalQuoteValue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Valor acumulado</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por clienteo o ID de presupuesto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="borrador">Borrador</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
              <SelectItem value="aprobado">Aprobado</SelectItem>
              <SelectItem value="rechazado">Rechazado</SelectItem>
              <SelectItem value="convertido">Convertido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quotes List */}
        {filteredQuotes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay presupuestos</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm || statusFilter !== "all"
                  ? "No se encontraron presupuestos con los filtros aplicados"
                  : "Comienza creando tu primer presupuesto"}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Button onClick={() => setShowQuoteForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Presupuesto
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredQuotes.map((quote) => (
              <Card key={quote.numero_presupuesto} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{quote.cliente_nombre}</h3>
                        <Badge variant="outline" className="text-xs">
                          #{quote.numero_presupuesto.slice(-8)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {quote.cliente_telefono && <p>Teléfono: {quote.cliente_telefono}</p>}
                        <p>Creado: {format(new Date(quote.created_at), "dd/MM/yyyy", { locale: es })}</p>
                        <p>Válido hasta: {format(new Date(quote.valido_hasta), "dd/MM/yyyy", { locale: es })}</p>
                        <p>Creado por: {quote.usuarios?.nombre_completo || "N/A"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold mb-2">${quote.total.toFixed(2)}</div>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant={getStatusColor(quote.estado) as any} className="flex items-center gap-1">
                          {getStatusIcon(quote.estado)}
                          {quote.estado.charAt(0).toUpperCase() + quote.estado.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedQuote(quote)
                            setShowQuoteDetails(true)
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver
                        </Button>
                        {quote.estado === "borrador" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingQuote(quote)
                              setShowQuoteForm(true)
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                        )}
                        {quote.estado === "aprobado" && (
                          <Button variant="default" size="sm" onClick={() => convertToSale(quote)}>
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Convertir
                          </Button>
                        )}
                        {quote.estado !== "borrador" && (
                          <Select value={quote.estado} onValueChange={(value) => updateQuoteStatus(quote.id, value)}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="enviado">Enviado</SelectItem>
                              <SelectItem value="aprobado">Aprobado</SelectItem>
                              <SelectItem value="rechazado">Rechazado</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar presupuesto?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará permanentemente el presupuesto #
                                {quote.numero_presupuesto.slice(-8)}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteQuote(quote.id)}>
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quote Details Dialog */}
        <Dialog open={showQuoteDetails} onOpenChange={setShowQuoteDetails}>
          <DialogContent className="w-screen max-w-[95vw] sm:max-w-[90vw] lg:max-w-[80vw] h-[90vh] overflow-y-auto p-6 mx-auto">
            <DialogHeader>
              <DialogTitle>Detalles del Presupuesto</DialogTitle>
              <DialogDescription>Información completa del presupuesto</DialogDescription>
            </DialogHeader>
            {selectedQuote && (
              <QuoteDetails
                quote={selectedQuote}
                onClose={() => {
                  setShowQuoteDetails(false)
                  setSelectedQuote(null)
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
