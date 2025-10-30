-- Asegurar que todas las columnas necesarias existan en la tabla presupuestos
ALTER TABLE presupuestos 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS cliente TEXT,
ADD COLUMN IF NOT EXISTS total NUMERIC(10,2) DEFAULT 0,
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
ADD COLUMN IF NOT EXISTS numero_presupuesto TEXT UNIQUE;

-- Migrar datos de cliente a cliente_nombre si es necesario
UPDATE presupuestos 
SET cliente_nombre = cliente 
WHERE cliente_nombre IS NULL AND cliente IS NOT NULL;

-- Establecer fecha de validez por defecto si no existe
UPDATE presupuestos 
SET valido_hasta = (COALESCE(fecha, created_at, NOW()) + INTERVAL '30 days')::date
WHERE valido_hasta IS NULL;

-- Asegurar que created_at tenga un valor
UPDATE presupuestos 
SET created_at = COALESCE(fecha, NOW())
WHERE created_at IS NULL;

-- Asegurar que updated_at tenga un valor
UPDATE presupuestos 
SET updated_at = COALESCE(created_at, NOW())
WHERE updated_at IS NULL;

-- Crear función para actualizar updated_at automáticamente si no existe
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
