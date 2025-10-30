"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Eye, EyeOff } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"

interface Usuario {
  id: string
  usuario: string
  nombre_completo: string
  rol: "admin" | "vendedor"
  activo: boolean
  created_at: string
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Form states
  const [formData, setFormData] = useState({
    usuario: "",
    password: "",
    nombre_completo: "",
    rol: "vendedor" as "admin" | "vendedor",
  })

  const { isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAdmin) {
      router.push("/dashboard")
      return
    }
    fetchUsuarios()
  }, [isAdmin, router])

  const fetchUsuarios = async () => {
    try {
      const { data, error } = await supabase.from("usuarios").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setUsuarios(data || [])
    } catch (error) {
      console.error("Error fetching usuarios:", error)
      setError("Error al cargar usuarios")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    try {
      if (editingUser) {
        // Actualizar usuario existente
        const updates: any = {
          nombre_completo: formData.nombre_completo,
          rol: formData.rol,
        }

        if (formData.password) {
          // Si se proporciona nueva contraseña, actualizarla
          const { error } = await supabase.rpc("actualizar_usuario_password", {
            p_id: editingUser.id,
            p_password: formData.password,
            p_nombre_completo: formData.nombre_completo,
            p_rol: formData.rol,
          })
          if (error) throw error
        } else {
          // Solo actualizar datos sin contraseña
          const { error } = await supabase.from("usuarios").update(updates).eq("id", editingUser.id)
          if (error) throw error
        }

        setSuccess("Usuario actualizado exitosamente")
      } else {
        // Crear nuevo usuario
        const { error } = await supabase.rpc("crear_usuario", {
          p_usuario: formData.usuario,
          p_password: formData.password,
          p_nombre_completo: formData.nombre_completo,
          p_rol: formData.rol,
        })

        if (error) throw error
        setSuccess("Usuario creado exitosamente")
      }

      setDialogOpen(false)
      setEditingUser(null)
      setFormData({ usuario: "", password: "", nombre_completo: "", rol: "vendedor" })
      fetchUsuarios()
    } catch (error: any) {
      setError(error.message || "Error al procesar usuario")
    }
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("usuarios").update({ activo: !currentStatus }).eq("id", userId)

      if (error) throw error
      setSuccess(`Usuario ${!currentStatus ? "activado" : "desactivado"} exitosamente`)
      fetchUsuarios()
    } catch (error: any) {
      setError(error.message || "Error al cambiar estado del usuario")
    }
  }

  const openEditDialog = (usuario: Usuario) => {
    setEditingUser(usuario)
    setFormData({
      usuario: usuario.usuario,
      password: "",
      nombre_completo: usuario.nombre_completo,
      rol: usuario.rol,
    })
    setDialogOpen(true)
  }

  const openCreateDialog = () => {
    setEditingUser(null)
    setFormData({ usuario: "", password: "", nombre_completo: "", rol: "vendedor" })
    setDialogOpen(true)
  }

  if (!isAdmin) {
    return null
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">Cargando usuarios...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
            <p className="text-muted-foreground">Administra los usuarios del sistema</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingUser ? "Editar Usuario" : "Crear Nuevo Usuario"}</DialogTitle>
                <DialogDescription>
                  {editingUser ? "Modifica los datos del usuario" : "Completa los datos para crear un nuevo usuario"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="usuario">Usuario</Label>
                  <Input
                    id="usuario"
                    value={formData.usuario}
                    onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}
                    disabled={!!editingUser}
                    required={!editingUser}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña {editingUser && "(dejar vacío para mantener actual)"}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombre_completo">Nombre Completo</Label>
                  <Input
                    id="nombre_completo"
                    value={formData.nombre_completo}
                    onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rol">Rol</Label>
                  <Select
                    value={formData.rol}
                    onValueChange={(value: "admin" | "vendedor") => setFormData({ ...formData, rol: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="vendedor">Vendedor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  {editingUser ? "Actualizar Usuario" : "Crear Usuario"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuarios</CardTitle>
            <CardDescription>Todos los usuarios registrados en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Nombre Completo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Creación</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell className="font-medium">{usuario.usuario}</TableCell>
                    <TableCell>{usuario.nombre_completo}</TableCell>
                    <TableCell>
                      <Badge variant={usuario.rol === "admin" ? "default" : "secondary"}>
                        {usuario.rol === "admin" ? "Administrador" : "Vendedor"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={usuario.activo ? "default" : "destructive"}>
                        {usuario.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(usuario.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(usuario)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleUserStatus(usuario.id, usuario.activo)}
                        >
                          {usuario.activo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
