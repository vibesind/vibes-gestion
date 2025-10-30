-- Script para corregir dependencias de triggers y asignar números secuenciales
-- sin usar funciones de ventana en UPDATE

-- Eliminar triggers existentes si existen
DROP TRIGGER IF EXISTS trigger_generar_numero_venta ON ventas;
DROP TRIGGER IF EXISTS trigger_generar_numero_presupuesto ON presupuestos;

-- Eliminar funciones existentes con CASCADE para manejar dependencias
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

-- Asignar números a registros existentes usando DO blocks
DO $$
DECLARE
    venta_record RECORD;
    contador INTEGER := 1;
BEGIN
    -- Asignar números a ventas existentes que no tienen número
    FOR venta_record IN 
        SELECT id FROM ventas 
        WHERE numero_venta IS NULL 
        ORDER BY created_at
    LOOP
        UPDATE ventas 
        SET numero_venta = LPAD(contador::TEXT, 8, '0')
        WHERE id = venta_record.id;
        contador := contador + 1;
    END LOOP;
    
    -- Ajustar la secuencia de ventas
    IF contador > 1 THEN
        PERFORM setval('seq_numero_venta', contador - 1);
    END IF;
END $$;

DO $$
DECLARE
    presupuesto_record RECORD;
    contador INTEGER := 1;
BEGIN
    -- Asignar números a presupuestos existentes que no tienen número
    FOR presupuesto_record IN 
        SELECT id FROM presupuestos 
        WHERE numero_presupuesto IS NULL 
        ORDER BY created_at
    LOOP
        UPDATE presupuestos 
        SET numero_presupuesto = LPAD(contador::TEXT, 8, '0')
        WHERE id = presupuesto_record.id;
        contador := contador + 1;
    END LOOP;
    
    -- Ajustar la secuencia de presupuestos
    IF contador > 1 THEN
        PERFORM setval('seq_numero_presupuesto', contador - 1);
    END IF;
END $$;

-- Crear función para generar número de venta
CREATE OR REPLACE FUNCTION trigger_asignar_numero_venta()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_venta IS NULL THEN
        NEW.numero_venta := LPAD(nextval('seq_numero_venta')::TEXT, 8, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear función para generar número de presupuesto
CREATE OR REPLACE FUNCTION trigger_asignar_numero_presupuesto()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_presupuesto IS NULL THEN
        NEW.numero_presupuesto := LPAD(nextval('seq_numero_presupuesto')::TEXT, 8, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers
CREATE TRIGGER trigger_generar_numero_venta
    BEFORE INSERT ON ventas
    FOR EACH ROW
    EXECUTE FUNCTION trigger_asignar_numero_venta();

CREATE TRIGGER trigger_generar_numero_presupuesto
    BEFORE INSERT ON presupuestos
    FOR EACH ROW
    EXECUTE FUNCTION trigger_asignar_numero_presupuesto();

-- Verificar que las columnas no sean nulas para nuevos registros
ALTER TABLE ventas ALTER COLUMN numero_venta SET NOT NULL;
ALTER TABLE presupuestos ALTER COLUMN numero_presupuesto SET NOT NULL;
