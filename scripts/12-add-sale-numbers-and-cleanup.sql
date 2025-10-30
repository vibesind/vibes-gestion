-- Agregar columna numero_venta a ventas
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS numero_venta TEXT UNIQUE;

-- Crear secuencia para números de ventas
CREATE SEQUENCE IF NOT EXISTS ventas_numero_seq START 1;

-- Función para generar número de venta con formato
CREATE OR REPLACE FUNCTION generar_numero_venta()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT nextval('ventas_numero_seq') INTO next_num;
    RETURN LPAD(next_num::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger para asignar automáticamente el número de venta
CREATE OR REPLACE FUNCTION asignar_numero_venta()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_venta IS NULL THEN
        NEW.numero_venta := generar_numero_venta();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_asignar_numero_venta ON ventas;
CREATE TRIGGER trigger_asignar_numero_venta
    BEFORE INSERT ON ventas
    FOR EACH ROW
    EXECUTE FUNCTION asignar_numero_venta();

-- Actualizar ventas existentes que no tengan número
UPDATE ventas 
SET numero_venta = generar_numero_venta() 
WHERE numero_venta IS NULL;
