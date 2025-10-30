"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Package, User, FileText, X, Clock, CheckCircle, XCircle, Truck } from "lucide-react"

interface Order {
  id: string
  proveedor_id: string
  estado: "pendiente" | "enviado" | "recibido" | "cancelado"
  total: number
  notas: string | null
  created_at: string
  fecha_esperada: string | null
  fecha_recibida: string | null
  proveedores: {
    nombre: string
  }
  usuarios: {
    nombre_completo: string | null
  }
}

interface OrderItem {
  id: string
  cantidad: number
  costo_unitario: number
  costo_total: number
  productos: {
    id: string
    nombre: string
    sku: string
  }
}

interface OrderDetailsProps {
  order: Order
  onClose: () => void
}

export function OrderDetails({ order, onClose }: OrderDetailsProps) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrderItems()
  }, [order.id])

  const fetchOrderItems = async () => {
    try {
      const { data, error } = await supabase
        .from("pedidos_proveedor_detalle")
        .select(`
          *,
          productos (
            id,
            nombre,
            sku
          )
        `)
        .eq("pedido_id", order.id)

      if (error) throw error
      setOrderItems(data || [])
    } catch (error) {
      console.error("Error fetching order items:", error)
    } finally {
      setLoading(false)
    }
  }

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
      <div className="flex items-center justify-center py-8">
        <p>Cargando detalles...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Pedido #{order.id.slice(-8)}</h3>
          <p className="text-sm text-muted-foreground">
            {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusColor(order.estado || "pendiente") as any} className="flex items-center gap-1">
            {getStatusIcon(order.estado || "pendiente")}
            {(order.estado || "pendiente").charAt(0).toUpperCase() + (order.estado || "pendiente").slice(1)}
          </Badge>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Supplier Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <User className="h-4 w-4 mr-2" />
            Información del Proveedor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Proveedor:</span>
            <span className="text-sm font-medium">{order.proveedores?.nombre || "N/A"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Creado por:</span>
            <span className="text-sm">{order.usuarios?.nombre_completo || "N/A"}</span>
          </div>
          {order.fecha_esperada && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Fecha esperada:</span>
              <span className="text-sm">{format(new Date(order.fecha_esperada), "dd/MM/yyyy", { locale: es })}</span>
            </div>
          )}
          {order.fecha_recibida && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Fecha recibido:</span>
              <span className="text-sm">{format(new Date(order.fecha_recibida), "dd/MM/yyyy", { locale: es })}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <Package className="h-4 w-4 mr-2" />
            Productos Pedidos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {orderItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="w-12 h-12 relative bg-slate-100 rounded flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm">{item.productos.nombre}</h4>
                <p className="text-xs text-muted-foreground">SKU: {item.productos.sku}</p>
                <p className="text-xs text-muted-foreground">
                  ${(item.costo_unitario || 0).toFixed(2)} × {item.cantidad || 0}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">${(item.costo_total || 0).toFixed(2)}</p>
                <Badge variant="secondary" className="text-xs">
                  {item.cantidad || 0} unidades
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Total */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between font-bold text-lg">
            <span>Total del Pedido:</span>
            <span>${(order.total || 0).toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {order.notas && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <FileText className="h-4 w-4 mr-2" />
              Notas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{order.notas}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
