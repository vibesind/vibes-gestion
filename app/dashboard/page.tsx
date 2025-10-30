"use client"

import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, ShoppingCart, Users, TrendingUp, FileText, Settings, AlertTriangle, Receipt } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from "recharts"
import Link from "next/link"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

interface DashboardStats {
  totalProductos: number
  ventasHoy: number
  transaccionesHoy: number
  stockBajo: number
  pedidosPendientes: number
  ventasUltimos7Dias: Array<{ fecha: string; total: number }>
}

export default function DashboardPage() {
  const { usuario, loading, isAdmin } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalProductos: 0,
    ventasHoy: 0,
    transaccionesHoy: 0,
    stockBajo: 0,
    pedidosPendientes: 0,
    ventasUltimos7Dias: [],
  })
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      // Total productos
      const { count: totalProductos } = await supabase.from("productos").select("*", { count: "exact", head: true })

      const today = new Date()
      const todayStr = today.toISOString().split("T")[0]

      const { data: ventasHoy } = await supabase
        .from("ventas")
        .select("total")
        .gte("fecha", todayStr)
        .lt("fecha", new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0])

      const { data: productos } = await supabase.from("productos").select("stock, stock_minimo")
      const stockBajo = productos?.filter((p) => p.stock <= (p.stock_minimo || 0)).length || 0

      // Pedidos pendientes
      const { count: pedidosPendientes } = await supabase
        .from("pedidos_proveedor")
        .select("*", { count: "exact", head: true })
        .eq("estado", "pendiente")

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const { data: ventasSemanales } = await supabase
        .from("ventas")
        .select("fecha, total")
        .gte("fecha", sevenDaysAgo.toISOString().split("T")[0])
        .lte("fecha", todayStr)
        .order("fecha", { ascending: true })

      // Agrupar ventas por día
      const ventasPorDia: { [key: string]: number } = {}
      ventasSemanales?.forEach((venta) => {
        const fecha = venta.fecha
        ventasPorDia[fecha] = (ventasPorDia[fecha] || 0) + venta.total
      })

      const ventasUltimos7Dias = Object.entries(ventasPorDia).map(([fecha, total]) => ({
        fecha: new Date(fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }),
        total,
      }))

      const ventasHoyTotal = ventasHoy?.reduce((sum, venta) => sum + venta.total, 0) || 0
      const transaccionesHoy = ventasHoy?.length || 0

      setStats({
        totalProductos: totalProductos || 0,
        ventasHoy: ventasHoyTotal,
        transaccionesHoy,
        stockBajo,
        pedidosPendientes: pedidosPendientes || 0,
        ventasUltimos7Dias,
      })
    } catch (error) {
      console.error("Error fetching dashboard stats:", error)
    } finally {
      setLoadingStats(false)
    }
  }

  if (loading || loadingStats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Cargando...</h1>
          <p className="text-muted-foreground">Verificando autenticación</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Bienvenido, {usuario?.nombre_completo}</h2>
          <p className="text-muted-foreground">Gestiona tu inventario, ventas y más desde aquí</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Productos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProductos}</div>
              <p className="text-xs text-muted-foreground">Total en inventario</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ventas Hoy</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.ventasHoy.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{stats.transaccionesHoy} transacciones</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.stockBajo}</div>
              <p className="text-xs text-muted-foreground">Productos por reponer</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pedidosPendientes}</div>
              <p className="text-xs text-muted-foreground">Pendientes</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de ventas */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Ventas Últimos 7 Días</CardTitle>
            <CardDescription>Evolución de ingresos diarios</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                total: {
                  label: "Ventas",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[200px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.ventasUltimos7Dias}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="total" stroke="var(--color-total)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/dashboard/productos">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Productos
                </CardTitle>
                <CardDescription>Gestiona tu inventario, categorías y stock</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/dashboard/ventas">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Ventas
                </CardTitle>
                <CardDescription>Registra ventas y consulta historial</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/dashboard/presupuestos">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Presupuestos
                </CardTitle>
                <CardDescription>Crea y gestiona presupuestos para clientes</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/dashboard/reportes">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Reportes
                </CardTitle>
                <CardDescription>Analiza ventas, stock y rendimiento</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/dashboard/proveedores">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Proveedores
                </CardTitle>
                <CardDescription>Gestiona pedidos a proveedores</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          {isAdmin && (
            <Link href="/dashboard/usuarios">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Usuarios
                  </CardTitle>
                  <CardDescription>Gestiona usuarios y permisos del sistema</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )}

          <Link href="/dashboard/gastos">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Receipt className="h-5 w-5 mr-2" />
                  Gastos
                </CardTitle>
                <CardDescription>Registra gastos de alquiler, impuestos y más</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}
