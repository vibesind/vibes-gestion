-- Fix the check constraint for pedidos_proveedor.estado to allow all status values used in the UI

-- Drop the existing constraint
ALTER TABLE pedidos_proveedor DROP CONSTRAINT IF EXISTS pedidos_proveedor_estado_check;

-- Add the new constraint with all four allowed values
ALTER TABLE pedidos_proveedor ADD CONSTRAINT pedidos_proveedor_estado_check 
CHECK (estado IN ('pendiente', 'enviado', 'recibido', 'cancelado'));

-- Update any existing records that might have invalid status values
UPDATE pedidos_proveedor 
SET estado = 'pendiente' 
WHERE estado NOT IN ('pendiente', 'enviado', 'recibido', 'cancelado');
