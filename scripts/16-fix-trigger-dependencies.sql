-- Corregir dependencias de triggers y funciones
-- Este script maneja correctamente las dependencias entre triggers y funciones

-- Primero eliminar los triggers existentes si existen
DROP TRIGGER IF EXISTS trigger_generar_numero_venta ON ventas;
DROP TRIGGER IF EXISTS trigger_generar_numero_presupuesto ON presupuestos;

-- Luego eliminar las funciones existentes si existen
DROP FUNCTION IF EXISTS generar_numero_venta() CASCADE;
DROP FUNCTION IF EXISTS generar_numero_presupuesto() CASCADE;
DROP FUNCTION IF EXISTS asignar_numero_venta() CASCADE;
DROP FUNCTION IF EXISTS asignar_numero_presupuesto() CASCADE;

-- Agregar columnas si no existen
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS numero_venta TEXT;
ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS numero_presupuesto TEXT;

-- Crear secuencias si no existen
CREATE SEQUENCE IF NOT EXISTS seq_numero_venta START 1;
CREATE SEQUENCE IF NOT EXISTS seq_numero_presupuesto START 1;

-- Función para generar número de venta con formato 00000001
CREATE OR REPLACE FUNCTION generar_numero_venta()
RETURNS TEXT AS $$
BEGIN
    RETURN LPAD(nextval('seq_numero_venta')::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- Función para generar número de presupuesto con formato 00000001
CREATE OR REPLACE FUNCTION generar_numero_presupuesto()
RETURNS TEXT AS $$
BEGIN
    RETURN LPAD(nextval('seq_numero_presupuesto')::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- Función trigger para asignar número de venta
CREATE OR REPLACE FUNCTION asignar_numero_venta()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_venta IS NULL THEN
        NEW.numero_venta := generar_numero_venta();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función trigger para asignar número de presupuesto
CREATE OR REPLACE FUNCTION asignar_numero_presupuesto()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_presupuesto IS NULL THEN
        NEW.numero_presupuesto := generar_numero_presupuesto();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers
CREATE TRIGGER trigger_generar_numero_venta
    BEFORE INSERT ON ventas
    FOR EACH ROW
    EXECUTE FUNCTION asignar_numero_venta();

CREATE TRIGGER trigger_generar_numero_presupuesto
    BEFORE INSERT ON presupuestos
    FOR EACH ROW
    EXECUTE FUNCTION asignar_numero_presupuesto();

-- Actualizar registros existentes que no tengan número asignado
UPDATE ventas 
SET numero_venta = LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 8, '0')
WHERE numero_venta IS NULL;

UPDATE presupuestos 
SET numero_presupuesto = LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 8, '0')
WHERE numero_presupuesto IS NULL;

-- Ajustar las secuencias para continuar desde el último número usado
SELECT setval('seq_numero_venta', 
    COALESCE((SELECT MAX(numero_venta::INTEGER) FROM ventas WHERE numero_venta ~ '^[0-9]+$'), 0) + 1, 
    false);

SELECT setval('seq_numero_presupuesto', 
    COALESCE((SELECT MAX(numero_presupuesto::INTEGER) FROM presupuestos WHERE numero_presupuesto ~ '^[0-9]+$'), 0) + 1, 
    false);
