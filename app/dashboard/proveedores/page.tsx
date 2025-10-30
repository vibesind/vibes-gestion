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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Plus, Search, Edit, Trash2, Users, Package, Clock, CheckCircle, XCircle, Truck } from "lucide-react"
import { SupplierForm } from "@/components/supplier-form"
import { OrderForm } from "@/components/order-form"
import { OrderDetails } from "@/components/order-details"
import { DashboardLayout } from "@/components/dashboard-layout"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Supplier {
  id: string
  nombre: string
  nombre_contacto: string | null
  email: string | null
  telefono: string | null
  direccion: string | null
  created_at: string
}

interface Order {
  id: string
  proveedor_id: string
  estado: "pendiente" | "enviado" | "recibido" | "cancelado"
  total: number
  notas: string | null
  created_at: string
  fecha_esperada: string | null
  fecha_recibido: string | null
  proveedores: {
    nombre: string
  }
}

export default function SuppliersPage() {
  const { isAdmin, usuario } = useAuth()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showSupplierForm, setShowSupplierForm] = useState(false)
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)

  useEffect(() => {
    fetchSuppliers()
    fetchOrders()
  }, [])

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase.from("proveedores").select("*").order("nombre")

      if (error) throw error
      setSuppliers(data || [])
    } catch (error) {
      console.error("Error fetching suppliers:", error)
    }
  }

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("pedidos_proveedor")
        .select(`
          *,
          proveedores (
            nombre
          )
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error("Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSupplier = async (supplierId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este proveedor?")) return

    try {
      const { error } = await supabase.from("proveedores").delete().eq("id", supplierId)

      if (error) throw error

      setSuppliers(suppliers.filter((s) => s.id !== supplierId))
    } catch (error) {
      console.error("Error deleting supplier:", error)
      alert("Error al eliminar el proveedor")
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const updateData: any = { estado: newStatus }

      if (newStatus === "recibido") {
        updateData.fecha_recibido = new Date().toISOString()
      }

      const { error } = await supabase.from("pedidos_proveedor").update(updateData).eq("id", orderId)

      if (error) throw error

      fetchOrders()
    } catch (error) {
      console.error("Error updating order status:", error)
      alert("Error al actualizar el estado del pedido")
    }
  }

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.nombre_contacto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.proveedores.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || order.estado === statusFilter
    return matchesSearch && matchesStatus
  })

  const pendingOrders = orders.filter((o) => o.estado === "pendiente").length
  const totalOrders = orders.length
  const totalOrderValue = orders.reduce((sum, order) => sum + order.total, 0)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pendiente":
        return <Clock className="h-4 w-4" />
      case "enviado":
        return <Truck className="h-4 w-4" />
      case "recibido":
        return <CheckCircle className="h-4 w-4" />
      case "cancelado":
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendiente":
        return "default"
      case "enviado":
        return "secondary"
      case "recibido":
        return "outline"
      case "cancelado":
        return "destructive"
      default:
        return "default"
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p>Cargando proveedores...</p>
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
            <h1 className="text-3xl font-bold">Proveedores</h1>
            <p className="text-muted-foreground">Gestiona proveedores y pedidos</p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <>
                <Dialog open={showSupplierForm} onOpenChange={setShowSupplierForm}>
                  <DialogTrigger asChild>
                    <Button variant="outline" onClick={() => setEditingSupplier(null)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo Proveedor
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
                      <DialogDescription>
                        {editingSupplier ? "Modifica los datos del proveedor" : "Agrega un nuevo proveedor"}
                      </DialogDescription>
                    </DialogHeader>
                    <SupplierForm
                      supplier={editingSupplier}
                      onSuccess={() => {
                        setShowSupplierForm(false)
                        setEditingSupplier(null)
                        fetchSuppliers()
                      }}
                      onCancel={() => {
                        setShowSupplierForm(false)
                        setEditingSupplier(null)
                      }}
                    />
                  </DialogContent>
                </Dialog>
                <Dialog open={showOrderForm} onOpenChange={setShowOrderForm}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo Pedido
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-screen max-w-[95vw] sm:max-w-[90vw] lg:max-w-[80vw] h-[90vh] overflow-y-auto p-6 mx-auto">
                    <DialogHeader>
                      <DialogTitle>Nuevo Pedido a Proveedor</DialogTitle>
                      <DialogDescription>Crea un pedido seleccionando proveedor y productos</DialogDescription>
                    </DialogHeader>
                    <OrderForm
                      suppliers={suppliers}
                      onSuccess={() => {
                        setShowOrderForm(false)
                        fetchOrders()
                      }}
                      onCancel={() => setShowOrderForm(false)}
                    />
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Proveedores</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{suppliers.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{pendingOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalOrderValue.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
            <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar pedidos por proveedor o ID..."
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
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="recibido">Recibido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No hay pedidos</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {searchTerm || statusFilter !== "all"
                      ? "No se encontraron pedidos con los filtros aplicados"
                      : "Comienza creando tu primer pedido a proveedor"}
                  </p>
                  {isAdmin && !searchTerm && statusFilter === "all" && (
                    <Button onClick={() => setShowOrderForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo Pedido
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{order.proveedores.nombre}</h3>
                            <Badge variant="outline" className="text-xs">
                              #{order.id.slice(-8)}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Creado: {format(new Date(order.created_at), "dd/MM/yyyy", { locale: es })}</p>
                            {order.fecha_esperada && (
                              <p>
                                Fecha esperada: {format(new Date(order.fecha_esperada), "dd/MM/yyyy", { locale: es })}
                              </p>
                            )}
                            {order.fecha_recibido && (
                              <p>Recibido: {format(new Date(order.fecha_recibido), "dd/MM/yyyy", { locale: es })}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold mb-2">${order.total.toFixed(2)}</div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={getStatusColor(order.estado) as any} className="flex items-center gap-1">
                              {getStatusIcon(order.estado)}
                              {order.estado
                                ? order.estado.charAt(0).toUpperCase() + order.estado.slice(1)
                                : "Sin estado"}
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order)
                                setShowOrderDetails(true)
                              }}
                            >
                              Ver Detalles
                            </Button>
                            {isAdmin && order.estado !== "recibido" && order.estado !== "cancelado" && (
                              <Select
                                value={order.estado}
                                onValueChange={(value) => updateOrderStatus(order.id, value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pendiente">Pendiente</SelectItem>
                                  <SelectItem value="enviado">Enviado</SelectItem>
                                  <SelectItem value="recibido">Recibido</SelectItem>
                                  <SelectItem value="cancelado">Cancelado</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="suppliers" className="space-y-4">
            {/* Suppliers Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar proveedores por nombre, contacto o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Suppliers Grid */}
            {filteredSuppliers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No hay proveedores</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {searchTerm
                      ? "No se encontraron proveedores con el término de búsqueda"
                      : "Comienza agregando tu primer proveedor"}
                  </p>
                  {isAdmin && !searchTerm && (
                    <Button onClick={() => setShowSupplierForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Proveedor
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSuppliers.map((supplier) => (
                  <Card key={supplier.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{supplier.nombre}</CardTitle>
                        {isAdmin && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingSupplier(supplier)
                                setShowSupplierForm(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteSupplier(supplier.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      {supplier.nombre_contacto && (
                        <CardDescription>Contacto: {supplier.nombre_contacto}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2 text-sm">
                        {supplier.email && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Email:</span>
                            <span>{supplier.email}</span>
                          </div>
                        )}
                        {supplier.telefono && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Teléfono:</span>
                            <span>{supplier.telefono}</span>
                          </div>
                        )}
                        {supplier.direccion && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Dirección:</span>
                            <span className="text-right">{supplier.direccion}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Registrado:</span>
                          <span>{format(new Date(supplier.created_at), "dd/MM/yyyy", { locale: es })}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Order Details Dialog */}
        <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
          <DialogContent className="w-screen max-w-[95vw] sm:max-w-[90vw] lg:max-w-[80vw] h-[90vh] overflow-y-auto p-6 mx-auto">
            <DialogHeader>
              <DialogTitle>Detalles del Pedido</DialogTitle>
              <DialogDescription>Información completa del pedido</DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <OrderDetails
                order={selectedOrder}
                onClose={() => {
                  setShowOrderDetails(false)
                  setSelectedOrder(null)
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
