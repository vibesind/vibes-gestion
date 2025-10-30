-- Crear tabla de clientes
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefono VARCHAR(50),
    direccion TEXT,
    ciudad VARCHAR(100),
    codigo_postal VARCHAR(20),
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);
CREATE INDEX IF NOT EXISTS idx_clientes_telefono ON clientes(telefono);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_clientes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clientes_updated_at
    BEFORE UPDATE ON clientes
    FOR EACH ROW
    EXECUTE FUNCTION update_clientes_updated_at();

-- Agregar numeración autoincremental para ventas
CREATE SEQUENCE IF NOT EXISTS ventas_numero_seq START 1;

ALTER TABLE ventas ADD COLUMN IF NOT EXISTS numero_venta VARCHAR(8) DEFAULT '';

-- Función para generar número de venta
CREATE OR REPLACE FUNCTION generar_numero_venta()
RETURNS TRIGGER AS $$
BEGIN
    NEW.numero_venta = LPAD(nextval('ventas_numero_seq')::text, 8, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para generar número de venta automáticamente
DROP TRIGGER IF EXISTS trigger_generar_numero_venta ON ventas;
CREATE TRIGGER trigger_generar_numero_venta
    BEFORE INSERT ON ventas
    FOR EACH ROW
    EXECUTE FUNCTION generar_numero_venta();

-- Actualizar ventas existentes con números
UPDATE ventas 
SET numero_venta = LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::text, 8, '0')
WHERE numero_venta = '' OR numero_venta IS NULL;
