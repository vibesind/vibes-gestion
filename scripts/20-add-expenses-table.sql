-- Crear tabla de gastos
CREATE TABLE IF NOT EXISTS gastos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_gasto TEXT UNIQUE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    categoria TEXT NOT NULL CHECK (categoria IN ('alquiler', 'impuestos', 'personal', 'servicios', 'materiales', 'marketing', 'otros')),
    descripcion TEXT NOT NULL,
    monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
    proveedor TEXT,
    metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('efectivo', 'transferencia', 'tarjeta', 'cheque')),
    comprobante TEXT, -- URL o número de comprobante
    notas TEXT,
    usuario_id UUID REFERENCES usuarios(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear secuencia para numeración automática de gastos
CREATE SEQUENCE IF NOT EXISTS gastos_numero_seq START 1;

-- Función para generar número de gasto
CREATE OR REPLACE FUNCTION generar_numero_gasto()
RETURNS TEXT AS $$
BEGIN
    RETURN LPAD(nextval('gastos_numero_seq')::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger para asignar número automáticamente
CREATE OR REPLACE FUNCTION asignar_numero_gasto()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_gasto IS NULL THEN
        NEW.numero_gasto := generar_numero_gasto();
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_asignar_numero_gasto
    BEFORE INSERT OR UPDATE ON gastos
    FOR EACH ROW
    EXECUTE FUNCTION asignar_numero_gasto();

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha);
CREATE INDEX IF NOT EXISTS idx_gastos_categoria ON gastos(categoria);
CREATE INDEX IF NOT EXISTS idx_gastos_usuario ON gastos(usuario_id);
