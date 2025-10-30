"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Package, User, CreditCard, FileText, X } from "lucide-react"

interface Sale {
  id: string
  cliente_nombre: string
  cliente_email: string | null
  cliente_telefono: string | null
  subtotal: number
  descuento: number
  total: number
  metodo_pago: string
  notas: string | null
  created_at: string
  usuarios?: {
    nombre_completo: string | null
  }
  numero_venta?: string
}

interface SaleItem {
  id: string
  cantidad: number
  precio_unitario: number
  productos: {
    id: string
    nombre: string
    sku: string
  }
}

interface SaleDetailsProps {
  sale: Sale
  onClose: () => void
}

export function SaleDetails({ sale, onClose }: SaleDetailsProps) {
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSaleItems()
  }, [sale.id])

  const fetchSaleItems = async () => {
    try {
      const { data, error } = await supabase
        .from("ventas_detalle")
        .select(`
          *,
          productos (
            id,
            nombre,
            sku
          )
        `)
        .eq("venta_id", sale.id)

      if (error) throw error
      setSaleItems(data || [])
    } catch (error) {
      console.error("Error fetching sale items:", error)
    } finally {
      setLoading(false)
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
      {/* Sale Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Venta #{sale.numero_venta || sale.id.slice(-8)}</h3>
          <p className="text-sm text-muted-foreground">
            {format(new Date(sale.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Customer Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <User className="h-4 w-4 mr-2" />
            Información del Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Nombre:</span>
            <span className="text-sm font-medium">{sale.cliente_nombre}</span>
          </div>
          {sale.cliente_email && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Email:</span>
              <span className="text-sm">{sale.cliente_email}</span>
            </div>
          )}
          {sale.cliente_telefono && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Teléfono:</span>
              <span className="text-sm">{sale.cliente_telefono}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Vendedor:</span>
            <span className="text-sm">{sale.usuarios?.nombre_completo || "N/A"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <Package className="h-4 w-4 mr-2" />
            Productos Vendidos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {saleItems.map((item) => {
            const totalPrice = (item.cantidad || 0) * (item.precio_unitario || 0)

            return (
              <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="w-12 h-12 relative bg-slate-100 rounded">
                  <div className="flex items-center justify-center h-full">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{item.productos.nombre}</h4>
                  <p className="text-xs text-muted-foreground">SKU: {item.productos.sku}</p>
                  <p className="text-xs text-muted-foreground">
                    ${(item.precio_unitario || 0).toFixed(2)} × {item.cantidad || 0}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${totalPrice.toFixed(2)}</p>
                  <Badge variant="secondary" className="text-xs">
                    {item.cantidad || 0} unidades
                  </Badge>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Payment Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <CreditCard className="h-4 w-4 mr-2" />
            Información de Pago
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Subtotal:</span>
            <span className="text-sm">${(sale.subtotal || 0).toFixed(2)}</span>
          </div>
          {(sale.descuento || 0) > 0 && (
            <div className="flex justify-between text-green-600">
              <span className="text-sm">Descuento:</span>
              <span className="text-sm">-${(sale.descuento || 0).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total:</span>
            <span>${(sale.total || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between mt-3">
            <span className="text-sm text-muted-foreground">Método de pago:</span>
            <Badge
              variant={
                sale.metodo_pago === "efectivo" ? "default" : sale.metodo_pago === "tarjeta" ? "secondary" : "outline"
              }
            >
              {(sale.metodo_pago || "").charAt(0).toUpperCase() + (sale.metodo_pago || "").slice(1)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {sale.notas && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <FileText className="h-4 w-4 mr-2" />
              Notas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{sale.notas}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
