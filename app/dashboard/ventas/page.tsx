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
import { Plus, Search, Eye, ShoppingCart, Calendar, DollarSign, Package, Trash2, CalendarDays } from "lucide-react"
import { SaleForm } from "@/components/sale-form"
import { SaleDetails } from "@/components/sale-details"
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

interface Sale {
  id: string
  cliente_nombre: string
  cliente_email: string | null
  cliente_telefono: string | null
  subtotal: number
  impuesto: number
  descuento: number
  total: number
  metodo_pago: string
  notas: string | null
  created_at: string
  usuarios: {
    nombre_completo: string | null
  }
  numero_venta?: string // Agregando numero_venta como opcional
}

export default function SalesPage() {
  const { profile } = useAuth()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [paymentFilter, setPaymentFilter] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [showNewSale, setShowNewSale] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [showSaleDetails, setShowSaleDetails] = useState(false)

  useEffect(() => {
    fetchSales()
  }, [])

  const fetchSales = async () => {
    try {
      const { data, error } = await supabase
        .from("ventas")
        .select(`
          *,
          usuarios (
            nombre_completo
          )
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setSales(data || [])
    } catch (error) {
      console.error("Error fetching sales:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSales = sales.filter((sale) => {
    const matchesSearch =
      sale.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.cliente_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPayment = paymentFilter === "all" || sale.metodo_pago === paymentFilter

    let matchesDate = true
    if (dateFrom || dateTo) {
      const saleDate = new Date(sale.created_at)
      if (dateFrom) {
        const fromDate = new Date(dateFrom)
        matchesDate = matchesDate && saleDate >= fromDate
      }
      if (dateTo) {
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999) // Incluir todo el día
        matchesDate = matchesDate && saleDate <= toDate
      }
    }

    return matchesSearch && matchesPayment && matchesDate
  })

  const todaySales = sales.filter((sale) => {
    const today = new Date()
    const saleDate = new Date(sale.created_at)
    return saleDate.toDateString() === today.toDateString()
  })

  const todayTotal = todaySales.reduce((sum, sale) => sum + sale.total, 0)
  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0)

  const handleDeleteSale = async (saleId: string) => {
    try {
      // Eliminar detalles de venta primero
      const { error: detailsError } = await supabase.from("ventas_detalle").delete().eq("venta_id", saleId)

      if (detailsError) throw detailsError

      // Eliminar la venta
      const { error: saleError } = await supabase.from("ventas").delete().eq("id", saleId)

      if (saleError) throw saleError

      fetchSales()
    } catch (error) {
      console.error("Error deleting sale:", error)
      alert("Error al eliminar la venta")
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p>Cargando ventas...</p>
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
            <h1 className="text-3xl font-bold">Ventas</h1>
            <p className="text-muted-foreground">Gestiona las ventas y consulta el historial</p>
          </div>
          <Dialog open={showNewSale} onOpenChange={setShowNewSale}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Venta
              </Button>
            </DialogTrigger>
            <DialogContent className="w-screen max-w-[95vw] sm:max-w-[90vw] lg:max-w-[80vw] h-[90vh] overflow-y-auto p-6 mx-auto">
              <DialogHeader>
                <DialogTitle>Nueva Venta</DialogTitle>
                <DialogDescription>Registra una nueva venta seleccionando productos y cliente</DialogDescription>
              </DialogHeader>
              <SaleForm
                onSuccess={() => {
                  setShowNewSale(false)
                  fetchSales()
                }}
                onCancel={() => setShowNewSale(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ventas Hoy</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todaySales.length}</div>
              <p className="text-xs text-muted-foreground">${todayTotal.toFixed(2)} total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sales.length}</div>
              <p className="text-xs text-muted-foreground">Todas las ventas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalSales.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Acumulado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio por Venta</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${sales.length > 0 ? (totalSales / sales.length).toFixed(2) : "0.00"}
              </div>
              <p className="text-xs text-muted-foreground">Ticket promedio</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, email o ID de venta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                placeholder="Desde"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="pl-10 w-40"
              />
            </div>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                placeholder="Hasta"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="pl-10 w-40"
              />
            </div>
          </div>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Método de pago" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los métodos</SelectItem>
              <SelectItem value="efectivo">Efectivo</SelectItem>
              <SelectItem value="tarjeta">Tarjeta</SelectItem>
              <SelectItem value="transferencia">Transferencia</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sales List */}
        {filteredSales.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay ventas</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm || paymentFilter !== "all" || dateFrom || dateTo
                  ? "No se encontraron ventas con los filtros aplicados"
                  : "Comienza registrando tu primera venta"}
              </p>
              {!searchTerm && paymentFilter === "all" && !dateFrom && !dateTo && (
                <Button onClick={() => setShowNewSale(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Venta
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredSales.map((sale) => (
              <Card key={sale.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{sale.cliente_nombre}</h3>
                        <Badge variant="outline" className="text-xs">
                          #{sale.numero_venta || sale.id.slice(-8)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {sale.cliente_email && <p>Email: {sale.cliente_email}</p>}
                        {sale.cliente_telefono && <p>Teléfono: {sale.cliente_telefono}</p>}
                        <p>Vendedor: {sale.usuarios?.nombre_completo || "N/A"}</p>
                        <p>Fecha: {format(new Date(sale.created_at), "dd/MM/yyyy HH:mm", { locale: es })}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold mb-2">${sale.total.toFixed(2)}</div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={
                            sale.metodo_pago === "efectivo"
                              ? "default"
                              : sale.metodo_pago === "tarjeta"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {sale.metodo_pago.charAt(0).toUpperCase() + sale.metodo_pago.slice(1)}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSale(sale)
                          setShowSaleDetails(true)
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalles
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="ml-2 bg-transparent">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar venta?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Se eliminará permanentemente la venta #
                              {sale.numero_venta || sale.id.slice(-8)}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteSale(sale.id)}>Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Sale Details Dialog */}
        <Dialog open={showSaleDetails} onOpenChange={setShowSaleDetails}>
          <DialogContent className="w-screen max-w-[95vw] sm:max-w-[90vw] lg:max-w-[80vw] h-[90vh] overflow-y-auto p-6 mx-auto">
            <DialogHeader>
              <DialogTitle>Detalles de Venta</DialogTitle>
              <DialogDescription>Información completa de la venta</DialogDescription>
            </DialogHeader>
            {selectedSale && (
              <SaleDetails
                sale={selectedSale}
                onClose={() => {
                  setShowSaleDetails(false)
                  setSelectedSale(null)
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
