"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Package, User, FileText, X, Download, Edit, Clock, CheckCircle, XCircle, ShoppingCart } from "lucide-react"

interface Quote {
  id: string
  numero_presupuesto: string
  cliente_nombre: string
  cliente_email: string | null
  cliente_telefono: string | null
  estado: "borrador" | "enviado" | "aprobado" | "rechazado" | "convertido"
  subtotal: number
  impuesto: number
  descuento: number
  total: number
  valido_hasta: string
  notas: string | null
  created_at: string
  usuarios: {
    nombre_completo: string | null
  }
}

interface QuoteItem {
  id: string
  cantidad: number
  precio_unitario: number
  precio_total: number
  productos: {
    id: string
    nombre: string
    sku: string
  }
}

interface QuoteDetailsProps {
  quote: Quote
  onClose: () => void
}

const formatSafeDate = (dateString: string | null | undefined, formatStr: string) => {
  if (!dateString) return "N/A"
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return "Fecha inválida"
  return format(date, formatStr, { locale: es })
}

export function QuoteDetails({ quote, onClose }: QuoteDetailsProps) {
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQuoteItems()
  }, [quote.id])

  const fetchQuoteItems = async () => {
    try {
      const { data, error } = await supabase
        .from("presupuestos_detalle")
        .select(`
          *,
          productos (
            id,
            nombre,
            sku
          )
        `)
        .eq("presupuesto_id", quote.id)

      if (error) throw error
      setQuoteItems(data || [])
    } catch (error) {
      console.error("Error fetching quote items:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (estado: string) => {
    switch (estado) {
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

  const getStatusColor = (estado: string) => {
    switch (estado) {
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

  const generatePDF = async () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      alert("Por favor, permite las ventanas emergentes para generar el PDF")
      return
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Presupuesto #${quote.numero_presupuesto || quote.id.slice(-8)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; color: #333; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .logo { font-size: 32px; font-weight: bold; color: #333; margin-bottom: 10px; }
          .quote-title { font-size: 24px; color: #666; }
          .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .quote-info, .customer-info { width: 48%; }
          .quote-info h3, .customer-info h3 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 15px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .items-table th, .items-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          .items-table th { background-color: #f8f9fa; font-weight: bold; }
          .items-table tr:nth-child(even) { background-color: #f8f9fa; }
          .totals { text-align: right; margin-bottom: 30px; width: 300px; margin-left: auto; }
          .total-line { display: flex; justify-content: space-between; margin: 8px 0; padding: 5px 0; }
          .total-final { font-weight: bold; font-size: 18px; border-top: 2px solid #333; padding-top: 15px; margin-top: 15px; }
          .notes { margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-left: 4px solid #333; }
          .footer { margin-top: 50px; text-align: center; color: #666; border-top: 1px solid #ddd; padding-top: 20px; font-size: 14px; }
          @media print { 
            body { margin: 20px; } 
            .no-print { display: none; }
          }
          .print-button { 
            position: fixed; 
            top: 20px; 
            right: 20px; 
            padding: 10px 20px; 
            background: #333; 
            color: white; 
            border: none; 
            border-radius: 5px; 
            cursor: pointer; 
            font-size: 14px;
          }
          .print-button:hover { background: #555; }
        </style>
      </head>
      <body>
        <button class="print-button no-print" onclick="window.print(); window.close();">Imprimir PDF</button>
        
        <div class="header">
          <div class="logo">VIBES IND.</div>
          <div class="quote-title">Presupuesto #${quote.numero_presupuesto || quote.id.slice(-8)}</div>
        </div>
        
        <div class="info-section">
          <div class="quote-info">
            <h3>Información del Presupuesto</h3>
            <p><strong>Fecha:</strong> ${formatSafeDate(quote.created_at, "dd/MM/yyyy")}</p>
            <p><strong>Válido hasta:</strong> ${formatSafeDate(quote.valido_hasta, "dd/MM/yyyy")}</p>
            <p><strong>Estado:</strong> ${quote.estado?.charAt(0).toUpperCase() + quote.estado?.slice(1) || "N/A"}</p>
            <p><strong>Vendedor:</strong> ${quote.usuarios?.nombre_completo || "N/A"}</p>
          </div>
          
          <div class="customer-info">
            <h3>Cliente</h3>
            <p><strong>Nombre:</strong> ${quote.cliente_nombre}</p>
            ${quote.cliente_email ? `<p><strong>Email:</strong> ${quote.cliente_email}</p>` : ""}
            ${quote.cliente_telefono ? `<p><strong>Teléfono:</strong> ${quote.cliente_telefono}</p>` : ""}
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>SKU</th>
              <th style="text-align: center;">Cantidad</th>
              <th style="text-align: right;">Precio Unit.</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${quoteItems
              .map(
                (item) => `
              <tr>
                <td>${item.productos.nombre}</td>
                <td>${item.productos.sku}</td>
                <td style="text-align: center;">${item.cantidad}</td>
                <td style="text-align: right;">$${(item.precio_unitario || 0).toFixed(2)}</td>
                <td style="text-align: right;">$${((item.precio_unitario || 0) * (item.cantidad || 0)).toFixed(2)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-line">
            <span>Subtotal:</span>
            <span>$${(quote.subtotal || 0).toFixed(2)}</span>
          </div>
          ${
            (quote.descuento || 0) > 0
              ? `
          <div class="total-line" style="color: #28a745;">
            <span>Descuento:</span>
            <span>-$${quote.descuento.toFixed(2)}</span>
          </div>`
              : ""
          }
          <div class="total-final">
            <div class="total-line">
              <span>Total:</span>
              <span>$${(quote.total || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        ${
          quote.notas
            ? `
        <div class="notes">
          <h3>Notas</h3>
          <p>${quote.notas}</p>
        </div>
      `
            : ""
        }

        <div class="footer">
          <p><strong>Gracias por su preferencia</strong></p>
          <p>VIBES IND. - Sistema de Gestión de Ropa</p>
          <p>Este presupuesto es válido hasta la fecha indicada</p>
        </div>
      </body>
      </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.focus()
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
      {/* Quote Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Presupuesto #{quote.numero_presupuesto || quote.id.slice(-8)}</h3>
          <p className="text-sm text-muted-foreground">{formatSafeDate(quote.created_at, "dd/MM/yyyy HH:mm")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusColor(quote.estado) as any} className="flex items-center gap-1">
            {getStatusIcon(quote.estado)}
            {quote.estado?.charAt(0).toUpperCase() + quote.estado?.slice(1) || "N/A"}
          </Badge>
          <Button variant="outline" size="sm" onClick={generatePDF}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
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
            <span className="text-sm font-medium">{quote.cliente_nombre}</span>
          </div>
          {quote.cliente_email && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Email:</span>
              <span className="text-sm">{quote.cliente_email}</span>
            </div>
          )}
          {quote.cliente_telefono && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Teléfono:</span>
              <span className="text-sm">{quote.cliente_telefono}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Creado por:</span>
            <span className="text-sm">{quote.usuarios?.nombre_completo || "N/A"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Válido hasta:</span>
            <span className="text-sm">{formatSafeDate(quote.valido_hasta, "dd/MM/yyyy")}</span>
          </div>
        </CardContent>
      </Card>

      {/* Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <Package className="h-4 w-4 mr-2" />
            Productos Cotizados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {quoteItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="w-12 h-12 relative bg-slate-100 rounded flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm">{item.productos.nombre}</h4>
                <p className="text-xs text-muted-foreground">SKU: {item.productos.sku}</p>
                <p className="text-xs text-muted-foreground">
                  ${(item.precio_unitario || 0).toFixed(2)} × {item.cantidad}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">${(item.precio_total || 0).toFixed(2)}</p>
                <Badge variant="secondary" className="text-xs">
                  {item.cantidad} unidades
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>${(quote.subtotal || 0).toFixed(2)}</span>
          </div>
          {(quote.descuento || 0) > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Descuento:</span>
              <span>-${quote.descuento.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total:</span>
            <span>${(quote.total || 0).toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {quote.notas && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <FileText className="h-4 w-4 mr-2" />
              Notas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{quote.notas}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
