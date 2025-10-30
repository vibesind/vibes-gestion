"use client"

import type React from "react"
import { Tag, UserCheck, Receipt } from "lucide-react" // Added Receipt icon for Gastos

import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Package, ShoppingCart, Users, TrendingUp, FileText, Settings, LogOut, Home, Menu, X } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface DashboardLayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Productos", href: "/dashboard/productos", icon: Package },
  { name: "Categorías", href: "/dashboard/categorias", icon: Tag },
  { name: "Clientes", href: "/dashboard/clientes", icon: UserCheck },
  { name: "Ventas", href: "/dashboard/ventas", icon: ShoppingCart },
  { name: "Presupuestos", href: "/dashboard/presupuestos", icon: FileText },
  { name: "Proveedores", href: "/dashboard/proveedores", icon: Users },
  { name: "Gastos", href: "/dashboard/gastos", icon: Receipt }, // Added Gastos to navigation
  { name: "Reportes", href: "/dashboard/reportes", icon: TrendingUp },
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { usuario, signOut, isAdmin } = useAuth()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar */}
      <div className={cn("fixed inset-0 z-50 lg:hidden", sidebarOpen ? "block" : "hidden")}>
        <div className="fixed inset-0 bg-black/20" onClick={() => setSidebarOpen(false)} />
        <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg">
          <div className="flex items-center justify-between p-4 border-b">
            <Image src="/images/vibes-logo.png" alt="VIBES IND." width={120} height={48} className="h-8 w-auto" />
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <nav className="p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {item.name}
                </Link>
              )
            })}
            {isAdmin && (
              <Link
                href="/dashboard/usuarios"
                className={cn(
                  "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname === "/dashboard/usuarios"
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <Settings className="h-4 w-4 mr-3" />
                Usuarios
              </Link>
            )}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-slate-200">
          <div className="flex items-center px-4 py-4 border-b border-slate-200">
            <Image src="/images/vibes-logo.png" alt="VIBES IND." width={120} height={48} className="h-8 w-auto" />
          </div>
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  )}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {item.name}
                </Link>
              )
            })}
            {isAdmin && (
              <Link
                href="/dashboard/usuarios"
                className={cn(
                  "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname === "/dashboard/usuarios"
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                <Settings className="h-4 w-4 mr-3" />
                Usuarios
              </Link>
            )}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="bg-white border-b border-slate-200 px-4 py-4 lg:px-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-4 w-4" />
            </Button>

            <div className="flex items-center space-x-4 ml-auto">
              <div className="text-right">
                <p className="font-medium text-sm">{usuario?.nombre_completo}</p>
                <Badge variant={isAdmin ? "default" : "secondary"} className="text-xs">
                  {usuario?.rol === "admin" ? "Administrador" : "Vendedor"}
                </Badge>
              </div>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
