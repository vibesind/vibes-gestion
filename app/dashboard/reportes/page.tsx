"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { TrendingUp, DollarSign, Package, ShoppingCart, AlertTriangle, Download } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { DashboardLayout } from "@/components/dashboard-layout"

interface SalesData {
  fecha: string
  total: number
  cantidad: number
}

interface ProductSales {
  producto: string
  cantidad: number
  total: number
}

interface StockAlert {
  id: string
  nombre: string
  stock_actual: number
  stock_minimo: number
  categoria: string
}

interface ProfitData {
  fecha: string
  ganancia: number
  margen: number
}

interface ProductProfit {
  producto: string
  cantidad: number
  costo_total: number
  venta_total: number
  ganancia: number
  margen: number
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

export default function ReportesPage() {
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [productSales, setProductSales] = useState<ProductSales[]>([])
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([])
  const [profitData, setProfitData] = useState<ProfitData[]>([])
  const [productProfits, setProductProfits] = useState<ProductProfit[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState("30")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // Métricas generales
  const [metrics, setMetrics] = useState({
    totalVentas: 0,
    ventasHoy: 0,
    productosVendidos: 0,
    ticketPromedio: 0,
    crecimiento: 0,
    gananciaBruta: 0,
    margenPromedio: 0,
  })

  const { isAdmin } = useAuth()

  useEffect(() => {
    fetchReports()
  }, [dateRange, startDate, endDate])

  const fetchReports = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchSalesData(),
        fetchProductSales(),
        fetchStockAlerts(),
        fetchMetrics(),
        fetchProfitData(),
        fetchProductProfits(),
      ])
    } catch (error) {
      console.error("Error fetching reports:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSalesData = async () => {
    let query = supabase.from("ventas").select("fecha, total").order("fecha", { ascending: true })

    if (dateRange !== "custom") {
      const days = Number.parseInt(dateRange)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      query = query.gte("fecha", startDate.toISOString().split("T")[0])
    } else if (startDate && endDate) {
      query = query.gte("fecha", startDate).lte("fecha", endDate)
    }

    const { data, error } = await query

    if (error) throw error

    // Agrupar por fecha
    const groupedData: { [key: string]: { total: number; cantidad: number } } = {}
    data?.forEach((venta) => {
      const fecha = venta.fecha
      if (!groupedData[fecha]) {
        groupedData[fecha] = { total: 0, cantidad: 0 }
      }
      groupedData[fecha].total += venta.total
      groupedData[fecha].cantidad += 1
    })

    const chartData = Object.entries(groupedData).map(([fecha, data]) => ({
      fecha: new Date(fecha).toLocaleDateString(),
      total: data.total,
      cantidad: data.cantidad,
    }))

    setSalesData(chartData)
  }

  const fetchProductSales = async () => {
    const { data, error } = await supabase.from("ventas_detalle").select(`
        cantidad,
        precio_unitario,
        productos (nombre)
      `)

    if (error) throw error

    // Agrupar por producto
    const productMap: { [key: string]: { cantidad: number; total: number } } = {}
    data?.forEach((detalle) => {
      const producto = detalle.productos?.nombre || "Producto desconocido"
      if (!productMap[producto]) {
        productMap[producto] = { cantidad: 0, total: 0 }
      }
      productMap[producto].cantidad += detalle.cantidad
      productMap[producto].total += detalle.cantidad * detalle.precio_unitario
    })

    const productSalesData = Object.entries(productMap)
      .map(([producto, data]) => ({
        producto,
        cantidad: data.cantidad,
        total: data.total,
      }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10)

    setProductSales(productSalesData)
  }

  const fetchStockAlerts = async () => {
    const { data, error } = await supabase
      .from("productos")
      .select("id, nombre, stock, stock_minimo, categorias(nombre)")
      .order("stock", { ascending: true })

    if (error) throw error

    const alerts =
      data
        ?.filter((producto) => producto.stock <= producto.stock_minimo)
        .map((producto) => ({
          id: producto.id,
          nombre: producto.nombre,
          stock_actual: producto.stock,
          stock_minimo: producto.stock_minimo,
          categoria: producto.categorias?.nombre || "Sin categoría",
        })) || []

    setStockAlerts(alerts)
  }

  const fetchMetrics = async () => {
    // Ventas totales del período
    const { data: ventasTotal } = await supabase.from("ventas").select("total")

    // Ventas de hoy
    const today = new Date().toISOString().split("T")[0]
    const { data: ventasHoy } = await supabase.from("ventas").select("total").eq("fecha", today)

    // Productos vendidos
    const { data: productosVendidos } = await supabase.from("ventas_detalle").select("cantidad")

    const { data: gananciasData } = await supabase.from("ventas_detalle").select(`
        cantidad,
        precio_unitario,
        productos!inner(costo)
      `)

    const totalVentas = ventasTotal?.reduce((sum, venta) => sum + venta.total, 0) || 0
    const ventasHoyTotal = ventasHoy?.reduce((sum, venta) => sum + venta.total, 0) || 0
    const totalProductos = productosVendidos?.reduce((sum, detalle) => sum + detalle.cantidad, 0) || 0
    const ticketPromedio = ventasTotal?.length ? totalVentas / ventasTotal.length : 0

    let gananciaBruta = 0
    let ventaTotal = 0
    gananciasData?.forEach((detalle) => {
      const ganancia = (detalle.precio_unitario - detalle.productos.costo) * detalle.cantidad
      const venta = detalle.precio_unitario * detalle.cantidad
      gananciaBruta += ganancia
      ventaTotal += venta
    })
    const margenPromedio = ventaTotal > 0 ? (gananciaBruta / ventaTotal) * 100 : 0

    setMetrics({
      totalVentas,
      ventasHoy: ventasHoyTotal,
      productosVendidos: totalProductos,
      ticketPromedio,
      crecimiento: 12.5, // Placeholder - calcular crecimiento real
      gananciaBruta,
      margenPromedio,
    })
  }

  const fetchProfitData = async () => {
    let query = supabase
      .from("ventas_detalle")
      .select(`
        cantidad,
        precio_unitario,
        ventas!inner(fecha),
        productos!inner(costo)
      `)
      .order("fecha", { ascending: true, foreignTable: "ventas" })

    if (dateRange !== "custom") {
      const days = Number.parseInt(dateRange)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      query = query.gte("ventas.fecha", startDate.toISOString().split("T")[0])
    } else if (startDate && endDate) {
      query = query.gte("ventas.fecha", startDate).lte("ventas.fecha", endDate)
    }

    const { data, error } = await query

    if (error) throw error

    // Agrupar por fecha y calcular ganancias
    const groupedData: { [key: string]: { ganancia: number; venta_total: number; costo_total: number } } = {}
    data?.forEach((detalle) => {
      const fecha = detalle.ventas.fecha
      const ganancia = (detalle.precio_unitario - detalle.productos.costo) * detalle.cantidad
      const venta = detalle.precio_unitario * detalle.cantidad
      const costo = detalle.productos.costo * detalle.cantidad

      if (!groupedData[fecha]) {
        groupedData[fecha] = { ganancia: 0, venta_total: 0, costo_total: 0 }
      }
      groupedData[fecha].ganancia += ganancia
      groupedData[fecha].venta_total += venta
      groupedData[fecha].costo_total += costo
    })

    const chartData = Object.entries(groupedData).map(([fecha, data]) => ({
      fecha: new Date(fecha).toLocaleDateString(),
      ganancia: data.ganancia,
      margen: data.venta_total > 0 ? (data.ganancia / data.venta_total) * 100 : 0,
    }))

    setProfitData(chartData)
  }

  const fetchProductProfits = async () => {
    const { data, error } = await supabase.from("ventas_detalle").select(`
        cantidad,
        precio_unitario,
        productos (nombre, costo)
      `)

    if (error) throw error

    // Agrupar por producto y calcular ganancias
    const productMap: { [key: string]: { cantidad: number; costo_total: number; venta_total: number } } = {}
    data?.forEach((detalle) => {
      const producto = detalle.productos?.nombre || "Producto desconocido"
      const costo = detalle.productos?.costo || 0
      const venta = detalle.precio_unitario * detalle.cantidad
      const costoTotal = costo * detalle.cantidad

      if (!productMap[producto]) {
        productMap[producto] = { cantidad: 0, costo_total: 0, venta_total: 0 }
      }
      productMap[producto].cantidad += detalle.cantidad
      productMap[producto].costo_total += costoTotal
      productMap[producto].venta_total += venta
    })

    const productProfitsData = Object.entries(productMap)
      .map(([producto, data]) => ({
        producto,
        cantidad: data.cantidad,
        costo_total: data.costo_total,
        venta_total: data.venta_total,
        ganancia: data.venta_total - data.costo_total,
        margen: data.venta_total > 0 ? ((data.venta_total - data.costo_total) / data.venta_total) * 100 : 0,
      }))
      .sort((a, b) => b.ganancia - a.ganancia)
      .slice(0, 10)

    setProductProfits(productProfitsData)
  }

  const exportReport = () => {
    // Implementar exportación a CSV/PDF
    console.log("Exportando reporte...")
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">Cargando reportes...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Reportes y Análisis</h1>
            <p className="text-muted-foreground">Analiza el rendimiento de tu negocio</p>
          </div>
          <Button onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${metrics.totalVentas.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />+{metrics.crecimiento}% vs mes anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ventas Hoy</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${metrics.ventasHoy.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Ingresos del día</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ganancia Bruta</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${metrics.gananciaBruta.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Ganancia total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Margen Promedio</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.margenPromedio.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Rentabilidad promedio</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="ventas" className="space-y-4">
          <TabsList>
            <TabsTrigger value="ventas">Ventas</TabsTrigger>
            <TabsTrigger value="productos">Productos</TabsTrigger>
            <TabsTrigger value="ganancias">Ganancias</TabsTrigger>
            <TabsTrigger value="stock">Stock</TabsTrigger>
          </TabsList>

          <TabsContent value="ventas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Filtros de Fecha</CardTitle>
                <div className="flex space-x-4">
                  <div className="space-y-2">
                    <Label>Período</Label>
                    <Select value={dateRange} onValueChange={setDateRange}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Últimos 7 días</SelectItem>
                        <SelectItem value="30">Últimos 30 días</SelectItem>
                        <SelectItem value="90">Últimos 3 meses</SelectItem>
                        <SelectItem value="custom">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {dateRange === "custom" && (
                    <>
                      <div className="space-y-2">
                        <Label>Fecha Inicio</Label>
                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Fecha Fin</Label>
                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                      </div>
                    </>
                  )}
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Evolución de Ventas</CardTitle>
                <CardDescription>Ingresos diarios en el período seleccionado</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    total: {
                      label: "Ventas",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesData}>
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
          </TabsContent>

          <TabsContent value="productos" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Productos Más Vendidos</CardTitle>
                  <CardDescription>Top 10 productos por cantidad</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      cantidad: {
                        label: "Cantidad",
                        color: "hsl(var(--chart-2))",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={productSales} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="producto" type="category" width={100} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="cantidad" fill="var(--color-cantidad)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ingresos por Producto</CardTitle>
                  <CardDescription>Distribución de ingresos</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      total: {
                        label: "Total",
                        color: "hsl(var(--chart-3))",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={productSales.slice(0, 5)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ producto, percent }) => `${producto} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="total"
                        >
                          {productSales.slice(0, 5).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ganancias" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Evolución de Ganancias</CardTitle>
                  <CardDescription>Ganancias diarias en el período seleccionado</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      ganancia: {
                        label: "Ganancia",
                        color: "hsl(var(--chart-1))",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={profitData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="fecha" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="ganancia" stroke="var(--color-ganancia)" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Margen por Día</CardTitle>
                  <CardDescription>Porcentaje de margen diario</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      margen: {
                        label: "Margen %",
                        color: "hsl(var(--chart-2))",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={profitData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="fecha" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="margen" fill="var(--color-margen)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Productos Más Rentables</CardTitle>
                <CardDescription>Top 10 productos por ganancia</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cantidad Vendida</TableHead>
                      <TableHead>Costo Total</TableHead>
                      <TableHead>Venta Total</TableHead>
                      <TableHead>Ganancia</TableHead>
                      <TableHead>Margen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productProfits.map((profit, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{profit.producto}</TableCell>
                        <TableCell>{profit.cantidad}</TableCell>
                        <TableCell>${profit.costo_total.toFixed(2)}</TableCell>
                        <TableCell>${profit.venta_total.toFixed(2)}</TableCell>
                        <TableCell className="font-semibold text-green-600">${profit.ganancia.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={profit.margen > 30 ? "default" : profit.margen > 15 ? "secondary" : "destructive"}
                          >
                            {profit.margen.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stock" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                  Alertas de Stock Bajo
                </CardTitle>
                <CardDescription>Productos que necesitan reposición</CardDescription>
              </CardHeader>
              <CardContent>
                {stockAlerts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No hay productos con stock bajo</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Stock Actual</TableHead>
                        <TableHead>Stock Mínimo</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockAlerts.map((alert) => (
                        <TableRow key={alert.id}>
                          <TableCell className="font-medium">{alert.nombre}</TableCell>
                          <TableCell>{alert.categoria}</TableCell>
                          <TableCell>{alert.stock_actual}</TableCell>
                          <TableCell>{alert.stock_minimo}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">Crítico</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
