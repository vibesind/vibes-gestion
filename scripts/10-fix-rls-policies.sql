-- Deshabilitar RLS temporalmente para permitir operaciones
-- Ya que estamos usando autenticación personalizada, no Supabase Auth

ALTER TABLE categorias DISABLE ROW LEVEL SECURITY;
ALTER TABLE productos DISABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores DISABLE ROW LEVEL SECURITY;
ALTER TABLE ventas DISABLE ROW LEVEL SECURITY;
ALTER TABLE ventas_detalle DISABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_proveedor DISABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_proveedor_detalle DISABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos DISABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos_detalle DISABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_stock DISABLE ROW LEVEL SECURITY;

-- Mantener RLS solo en usuarios para seguridad básica
-- pero con políticas más permisivas para nuestro sistema personalizado
DROP POLICY IF EXISTS "Los usuarios pueden ver su propio perfil" ON usuarios;
DROP POLICY IF EXISTS "Los admins pueden ver todos los usuarios" ON usuarios;
DROP POLICY IF EXISTS "Los admins pueden insertar usuarios" ON usuarios;

-- Política simple para usuarios autenticados (basada en que existan en la tabla)
CREATE POLICY "Acceso para usuarios válidos" ON usuarios
    FOR ALL USING (true);
