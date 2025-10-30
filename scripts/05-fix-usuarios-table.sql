-- Eliminar la tabla usuarios existente y recrearla para el sistema personalizado
DROP TABLE IF EXISTS usuarios CASCADE;

-- Crear nueva tabla usuarios independiente
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('admin', 'vendedor')),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar usuario admin inicial
INSERT INTO usuarios (usuario, password_hash, nombre, rol) 
VALUES ('admin', crypt('admin123', gen_salt('bf')), 'Administrador', 'admin');

-- Recrear las tablas que dependían de usuarios con la nueva estructura
-- Actualizar tabla ventas
ALTER TABLE ventas DROP CONSTRAINT IF EXISTS ventas_usuario_id_fkey;
ALTER TABLE ventas ADD CONSTRAINT ventas_usuario_id_fkey 
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;

-- Actualizar tabla movimientos_stock
ALTER TABLE movimientos_stock DROP CONSTRAINT IF EXISTS movimientos_stock_usuario_id_fkey;
ALTER TABLE movimientos_stock ADD CONSTRAINT movimientos_stock_usuario_id_fkey 
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;
