-- Eliminar columna imagen_url de productos
ALTER TABLE productos DROP COLUMN IF EXISTS imagen_url;

-- Agregar columna numero_presupuesto a presupuestos
ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS numero_presupuesto TEXT UNIQUE;

-- Crear secuencia para números de presupuestos
CREATE SEQUENCE IF NOT EXISTS presupuestos_numero_seq START 1;

-- Función para generar número de presupuesto con formato
CREATE OR REPLACE FUNCTION generar_numero_presupuesto()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT nextval('presupuestos_numero_seq') INTO next_num;
    RETURN LPAD(next_num::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger para asignar automáticamente el número de presupuesto
CREATE OR REPLACE FUNCTION asignar_numero_presupuesto()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_presupuesto IS NULL THEN
        NEW.numero_presupuesto := generar_numero_presupuesto();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_asignar_numero_presupuesto ON presupuestos;
CREATE TRIGGER trigger_asignar_numero_presupuesto
    BEFORE INSERT ON presupuestos
    FOR EACH ROW
    EXECUTE FUNCTION asignar_numero_presupuesto();

-- Actualizar presupuestos existentes que no tengan número
UPDATE presupuestos 
SET numero_presupuesto = generar_numero_presupuesto() 
WHERE numero_presupuesto IS NULL;
