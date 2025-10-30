-- Agregar columnas faltantes a la tabla presupuestos
ALTER TABLE presupuestos 
ADD COLUMN IF NOT EXISTS cliente_nombre TEXT,
ADD COLUMN IF NOT EXISTS cliente_email TEXT,
ADD COLUMN IF NOT EXISTS cliente_telefono TEXT,
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'borrador' CHECK (estado IN ('borrador', 'enviado', 'aprobado', 'rechazado', 'convertido')),
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS impuesto NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS descuento NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS valido_hasta DATE,
ADD COLUMN IF NOT EXISTS notas TEXT,
ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Migrar datos existentes de la columna 'cliente' a 'cliente_nombre'
UPDATE presupuestos 
SET cliente_nombre = cliente 
WHERE cliente_nombre IS NULL AND cliente IS NOT NULL;

-- Actualizar el total basado en subtotal + impuesto - descuento para registros existentes
UPDATE presupuestos 
SET subtotal = total, impuesto = 0, descuento = 0
WHERE subtotal = 0;

-- Establecer fecha de validez por defecto (30 días desde la fecha de creación)
UPDATE presupuestos 
SET valido_hasta = (fecha + INTERVAL '30 days')::date
WHERE valido_hasta IS NULL;

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para actualizar updated_at en presupuestos
DROP TRIGGER IF EXISTS update_presupuestos_updated_at ON presupuestos;
CREATE TRIGGER update_presupuestos_updated_at
    BEFORE UPDATE ON presupuestos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Agregar columnas faltantes a presupuestos_detalle
ALTER TABLE presupuestos_detalle 
ADD COLUMN IF NOT EXISTS precio_total NUMERIC(10,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED;
