import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Obtener el usuario de las cookies
  const userCookie = request.cookies.get("vibes_user")
  let user = null

  if (userCookie) {
    try {
      user = JSON.parse(userCookie.value)
    } catch (error) {
      // Cookie inválida, limpiarla
      const response = NextResponse.next()
      response.cookies.delete("vibes_user")
      return response
    }
  }

  // Proteger rutas del dashboard
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    if (!user || !user.activo) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    // Verificar permisos de admin para rutas específicas
    if (request.nextUrl.pathname.startsWith("/dashboard/usuarios")) {
      if (user.rol !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }
    }
  }

  // Redirigir usuarios autenticados desde login
  if (request.nextUrl.pathname === "/login") {
    if (user && user.activo) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  // Redirigir root a dashboard si está autenticado, sino a login
  if (request.nextUrl.pathname === "/") {
    if (user && user.activo) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    } else {
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
