-- Habilitar RLS (Row Level Security)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_proveedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_proveedor_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_stock ENABLE ROW LEVEL SECURITY;

-- Políticas para usuarios
CREATE POLICY "Los usuarios pueden ver su propio perfil" ON usuarios
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Los admins pueden ver todos los usuarios" ON usuarios
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id = auth.uid() AND rol = 'admin'
        )
    );

CREATE POLICY "Los admins pueden insertar usuarios" ON usuarios
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id = auth.uid() AND rol = 'admin'
        )
    );

-- Políticas generales para tablas (acceso completo para usuarios autenticados)
CREATE POLICY "Acceso completo para usuarios autenticados" ON categorias
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Acceso completo para usuarios autenticados" ON productos
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Acceso completo para usuarios autenticados" ON proveedores
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Acceso completo para usuarios autenticados" ON ventas
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Acceso completo para usuarios autenticados" ON ventas_detalle
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Acceso completo para usuarios autenticados" ON pedidos_proveedor
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Acceso completo para usuarios autenticados" ON pedidos_proveedor_detalle
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Acceso completo para usuarios autenticados" ON presupuestos
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Acceso completo para usuarios autenticados" ON presupuestos_detalle
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Acceso completo para usuarios autenticados" ON movimientos_stock
    FOR ALL USING (auth.uid() IS NOT NULL);
