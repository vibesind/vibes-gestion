-- Agregar campos faltantes a la tabla productos
ALTER TABLE productos 
ADD COLUMN IF NOT EXISTS sku TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stock_minimo INTEGER DEFAULT 5;

-- Generar SKUs para productos existentes si no los tienen
UPDATE productos 
SET sku = 'PROD-' || UPPER(SUBSTRING(id::text, 1, 8))
WHERE sku IS NULL;

-- Actualizar productos existentes con stock mínimo por defecto
UPDATE productos 
SET stock_minimo = 5
WHERE stock_minimo IS NULL;
