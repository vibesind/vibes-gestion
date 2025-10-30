-- Script final para corregir la numeración de ventas y asegurar que funcione correctamente

-- Primero, eliminar triggers y funciones existentes si existen
DROP TRIGGER IF EXISTS trigger_asignar_numero_venta ON ventas;
DROP TRIGGER IF EXISTS trigger_asignar_numero_presupuesto ON presupuestos;
DROP FUNCTION IF EXISTS asignar_numero_venta() CASCADE;
DROP FUNCTION IF EXISTS asignar_numero_presupuesto() CASCADE;

-- Eliminar secuencias existentes si existen
DROP SEQUENCE IF EXISTS seq_numero_venta CASCADE;
DROP SEQUENCE IF EXISTS seq_numero_presupuesto CASCADE;

-- Agregar columnas numero_venta y numero_presupuesto si no existen
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS numero_venta TEXT;
ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS numero_presupuesto TEXT;

-- Crear secuencias para numeración
CREATE SEQUENCE seq_numero_venta START 1;
CREATE SEQUENCE seq_numero_presupuesto START 1;

-- Función para asignar número de venta
CREATE OR REPLACE FUNCTION asignar_numero_venta()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_venta IS NULL THEN
        NEW.numero_venta := LPAD(nextval('seq_numero_venta')::TEXT, 8, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para asignar número de presupuesto
CREATE OR REPLACE FUNCTION asignar_numero_presupuesto()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_presupuesto IS NULL THEN
        NEW.numero_presupuesto := LPAD(nextval('seq_numero_presupuesto')::TEXT, 8, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers
CREATE TRIGGER trigger_asignar_numero_venta
    BEFORE INSERT ON ventas
    FOR EACH ROW
    EXECUTE FUNCTION asignar_numero_venta();

CREATE TRIGGER trigger_asignar_numero_presupuesto
    BEFORE INSERT ON presupuestos
    FOR EACH ROW
    EXECUTE FUNCTION asignar_numero_presupuesto();

-- Asignar números a registros existentes que no los tengan
DO $$
DECLARE
    venta_record RECORD;
    presupuesto_record RECORD;
    contador INTEGER;
BEGIN
    -- Asignar números a ventas existentes
    contador := 1;
    FOR venta_record IN 
        SELECT id FROM ventas 
        WHERE numero_venta IS NULL 
        ORDER BY created_at ASC
    LOOP
        UPDATE ventas 
        SET numero_venta = LPAD(contador::TEXT, 8, '0')
        WHERE id = venta_record.id;
        contador := contador + 1;
    END LOOP;
    
    -- Ajustar secuencia de ventas
    IF contador > 1 THEN
        PERFORM setval('seq_numero_venta', contador);
    END IF;
    
    -- Asignar números a presupuestos existentes
    contador := 1;
    FOR presupuesto_record IN 
        SELECT id FROM presupuestos 
        WHERE numero_presupuesto IS NULL 
        ORDER BY created_at ASC
    LOOP
        UPDATE presupuestos 
        SET numero_presupuesto = LPAD(contador::TEXT, 8, '0')
        WHERE id = presupuesto_record.id;
        contador := contador + 1;
    END LOOP;
    
    -- Ajustar secuencia de presupuestos
    IF contador > 1 THEN
        PERFORM setval('seq_numero_presupuesto', contador);
    END IF;
END $$;
