"use client"

import type React from "react"

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
import { Plus, Search, Edit, Trash2, Receipt, Calendar, TrendingDown } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Expense {
  id: string
  numero_gasto: string
  fecha: string
  categoria: string
  descripcion: string
  monto: number
  proveedor: string | null
  metodo_pago: string
  comprobante: string | null
  notas: string | null
  usuario_id: string
  created_at: string
  usuarios?: {
    nombre_completo: string
  }
}

const CATEGORIAS = [
  { value: "alquiler", label: "Alquiler" },
  { value: "impuestos", label: "Impuestos" },
  { value: "personal", label: "Personal" },
  { value: "servicios", label: "Servicios" },
  { value: "materiales", label: "Materiales" },
  { value: "marketing", label: "Marketing" },
  { value: "otros", label: "Otros" },
]

const METODOS_PAGO = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "cheque", label: "Cheque" },
]

export default function ExpensesPage() {
  const { usuario, isAdmin } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split("T")[0],
    categoria: "",
    descripcion: "",
    monto: "",
    proveedor: "",
    metodo_pago: "",
    comprobante: "",
    notas: "",
  })

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from("gastos")
        .select(`
          *,
          usuarios (
            nombre_completo
          )
        `)
        .order("fecha", { ascending: false })

      if (error) throw error
      setExpenses(data || [])
    } catch (error) {
      console.error("Error fetching expenses:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const expenseData = {
        ...formData,
        monto: Number.parseFloat(formData.monto),
        usuario_id: usuario?.id,
      }

      if (editingExpense) {
        const { error } = await supabase.from("gastos").update(expenseData).eq("id", editingExpense.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("gastos").insert([expenseData])

        if (error) throw error
      }

      setShowExpenseForm(false)
      setEditingExpense(null)
      resetForm()
      fetchExpenses()
    } catch (error) {
      console.error("Error saving expense:", error)
      alert("Error al guardar el gasto")
    }
  }

  const handleDelete = async (expenseId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este gasto?")) return

    try {
      const { error } = await supabase.from("gastos").delete().eq("id", expenseId)
      if (error) throw error

      setExpenses(expenses.filter((e) => e.id !== expenseId))
    } catch (error) {
      console.error("Error deleting expense:", error)
      alert("Error al eliminar el gasto")
    }
  }

  const resetForm = () => {
    setFormData({
      fecha: new Date().toISOString().split("T")[0],
      categoria: "",
      descripcion: "",
      monto: "",
      proveedor: "",
      metodo_pago: "",
      comprobante: "",
      notas: "",
    })
  }

  const openEditForm = (expense: Expense) => {
    setEditingExpense(expense)
    setFormData({
      fecha: expense.fecha,
      categoria: expense.categoria,
      descripcion: expense.descripcion,
      monto: expense.monto.toString(),
      proveedor: expense.proveedor || "",
      metodo_pago: expense.metodo_pago,
      comprobante: expense.comprobante || "",
      notas: expense.notas || "",
    })
    setShowExpenseForm(true)
  }

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (expense.proveedor && expense.proveedor.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory = categoryFilter === "all" || expense.categoria === categoryFilter

    const matchesDateFrom = !dateFrom || expense.fecha >= dateFrom
    const matchesDateTo = !dateTo || expense.fecha <= dateTo

    return matchesSearch && matchesCategory && matchesDateFrom && matchesDateTo
  })

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.monto, 0)
  const expensesThisMonth = expenses
    .filter((e) => {
      const expenseDate = new Date(e.fecha)
      const now = new Date()
      return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear()
    })
    .reduce((sum, expense) => sum + expense.monto, 0)

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      alquiler: "bg-blue-100 text-blue-800",
      impuestos: "bg-red-100 text-red-800",
      personal: "bg-green-100 text-green-800",
      servicios: "bg-yellow-100 text-yellow-800",
      materiales: "bg-purple-100 text-purple-800",
      marketing: "bg-pink-100 text-pink-800",
      otros: "bg-gray-100 text-gray-800",
    }
    return colors[category] || colors["otros"]
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p>Cargando gastos...</p>
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
            <h1 className="text-3xl font-bold">Gastos</h1>
            <p className="text-muted-foreground">Registra y gestiona los gastos del negocio</p>
          </div>
          <Dialog open={showExpenseForm} onOpenChange={setShowExpenseForm}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingExpense(null)
                  resetForm()
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Gasto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingExpense ? "Editar Gasto" : "Nuevo Gasto"}</DialogTitle>
                <DialogDescription>
                  {editingExpense ? "Modifica los datos del gasto" : "Registra un nuevo gasto del negocio"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Fecha *</label>
                    <Input
                      type="date"
                      value={formData.fecha}
                      onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Categoría *</label>
                    <Select
                      value={formData.categoria}
                      onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Descripción *</label>
                  <Input
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Descripción del gasto"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Monto *</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.monto}
                      onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Método de Pago *</label>
                    <Select
                      value={formData.metodo_pago}
                      onValueChange={(value) => setFormData({ ...formData, metodo_pago: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Método de pago" />
                      </SelectTrigger>
                      <SelectContent>
                        {METODOS_PAGO.map((metodo) => (
                          <SelectItem key={metodo.value} value={metodo.value}>
                            {metodo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Proveedor</label>
                    <Input
                      value={formData.proveedor}
                      onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                      placeholder="Nombre del proveedor"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Comprobante</label>
                    <Input
                      value={formData.comprobante}
                      onChange={(e) => setFormData({ ...formData, comprobante: e.target.value })}
                      placeholder="Número de factura/recibo"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Notas</label>
                  <Input
                    value={formData.notas}
                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                    placeholder="Notas adicionales"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowExpenseForm(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">{editingExpense ? "Actualizar" : "Guardar"} Gasto</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Gastos</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalExpenses.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Filtros aplicados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${expensesThisMonth.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Gastos del mes actual</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Registros</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredExpenses.length}</div>
              <p className="text-xs text-muted-foreground">Gastos encontrados</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar gastos por descripción, categoría o proveedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {CATEGORIAS.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            placeholder="Desde"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full sm:w-40"
          />
          <Input
            type="date"
            placeholder="Hasta"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>

        {/* Expenses List */}
        {filteredExpenses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay gastos</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm || categoryFilter !== "all" || dateFrom || dateTo
                  ? "No se encontraron gastos con los filtros aplicados"
                  : "Comienza registrando tu primer gasto"}
              </p>
              {!searchTerm && categoryFilter === "all" && !dateFrom && !dateTo && (
                <Button onClick={() => setShowExpenseForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Gasto
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredExpenses.map((expense) => (
              <Card key={expense.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{expense.descripcion}</h3>
                        <Badge className={getCategoryColor(expense.categoria)}>
                          {CATEGORIAS.find((c) => c.value === expense.categoria)?.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          #{expense.numero_gasto}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Fecha: {format(new Date(expense.fecha), "dd/MM/yyyy", { locale: es })}</p>
                        {expense.proveedor && <p>Proveedor: {expense.proveedor}</p>}
                        <p>Método: {METODOS_PAGO.find((m) => m.value === expense.metodo_pago)?.label}</p>
                        {expense.comprobante && <p>Comprobante: {expense.comprobante}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold mb-2">${expense.monto.toFixed(2)}</div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditForm(expense)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="outline" size="sm" onClick={() => handleDelete(expense.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
