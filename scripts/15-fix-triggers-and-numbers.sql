-- Corregir problemas con triggers y numeración automática

-- Eliminar triggers existentes
DROP TRIGGER IF EXISTS trigger_asignar_numero_venta ON ventas;
DROP TRIGGER IF EXISTS trigger_asignar_numero_presupuesto ON presupuestos;

-- Eliminar funciones existentes
DROP FUNCTION IF EXISTS asignar_numero_venta();
DROP FUNCTION IF EXISTS asignar_numero_presupuesto();
DROP FUNCTION IF EXISTS generar_numero_venta();
DROP FUNCTION IF EXISTS generar_numero_presupuesto();

-- Recrear secuencias
DROP SEQUENCE IF EXISTS ventas_numero_seq;
DROP SEQUENCE IF EXISTS presupuestos_numero_seq;

CREATE SEQUENCE ventas_numero_seq START 1;
CREATE SEQUENCE presupuestos_numero_seq START 1;

-- Función simplificada para generar número de venta
CREATE OR REPLACE FUNCTION generar_numero_venta()
RETURNS TEXT AS $$
BEGIN
    RETURN LPAD(nextval('ventas_numero_seq')::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- Función simplificada para generar número de presupuesto  
CREATE OR REPLACE FUNCTION generar_numero_presupuesto()
RETURNS TEXT AS $$
BEGIN
    RETURN LPAD(nextval('presupuestos_numero_seq')::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger function para ventas
CREATE OR REPLACE FUNCTION trigger_generar_numero_venta()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_venta IS NULL OR NEW.numero_venta = '' THEN
        NEW.numero_venta := generar_numero_venta();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function para presupuestos
CREATE OR REPLACE FUNCTION trigger_generar_numero_presupuesto()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_presupuesto IS NULL OR NEW.numero_presupuesto = '' THEN
        NEW.numero_presupuesto := generar_numero_presupuesto();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers
CREATE TRIGGER trigger_numero_venta
    BEFORE INSERT ON ventas
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generar_numero_venta();

CREATE TRIGGER trigger_numero_presupuesto
    BEFORE INSERT ON presupuestos
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generar_numero_presupuesto();

-- Actualizar registros existentes sin número (usando un enfoque seguro)
DO $$
DECLARE
    venta_record RECORD;
    presupuesto_record RECORD;
    contador INTEGER := 1;
BEGIN
    -- Actualizar ventas sin número
    FOR venta_record IN SELECT id FROM ventas WHERE numero_venta IS NULL OR numero_venta = '' ORDER BY created_at
    LOOP
        UPDATE ventas 
        SET numero_venta = LPAD(contador::TEXT, 8, '0')
        WHERE id = venta_record.id;
        contador := contador + 1;
    END LOOP;
    
    -- Reiniciar contador para presupuestos
    contador := 1;
    
    -- Actualizar presupuestos sin número
    FOR presupuesto_record IN SELECT id FROM presupuestos WHERE numero_presupuesto IS NULL OR numero_presupuesto = '' ORDER BY created_at
    LOOP
        UPDATE presupuestos 
        SET numero_presupuesto = LPAD(contador::TEXT, 8, '0')
        WHERE id = presupuesto_record.id;
        contador := contador + 1;
    END LOOP;
    
    -- Ajustar secuencias al siguiente valor disponible
    PERFORM setval('ventas_numero_seq', COALESCE((SELECT MAX(numero_venta::INTEGER) FROM ventas WHERE numero_venta ~ '^[0-9]+$'), 0) + 1);
    PERFORM setval('presupuestos_numero_seq', COALESCE((SELECT MAX(numero_presupuesto::INTEGER) FROM presupuestos WHERE numero_presupuesto ~ '^[0-9]+$'), 0) + 1);
END $$;
