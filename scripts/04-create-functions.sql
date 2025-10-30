-- Función para actualizar stock automáticamente
CREATE OR REPLACE FUNCTION actualizar_stock_venta()
RETURNS TRIGGER AS $$
BEGIN
    -- Reducir stock del producto
    UPDATE productos 
    SET stock = stock - NEW.cantidad,
        updated_at = NOW()
    WHERE id = NEW.producto_id;
    
    -- Registrar movimiento de stock
    INSERT INTO movimientos_stock (producto_id, tipo, cantidad, motivo, usuario_id)
    VALUES (NEW.producto_id, 'venta', -NEW.cantidad, 'Venta realizada', 
            (SELECT usuario_id FROM ventas WHERE id = NEW.venta_id));
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar stock en ventas
CREATE TRIGGER trigger_actualizar_stock_venta
    AFTER INSERT ON ventas_detalle
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_stock_venta();

-- Función para actualizar stock al recibir pedido
CREATE OR REPLACE FUNCTION actualizar_stock_pedido()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo actualizar si el estado cambió a 'recibido'
    IF OLD.estado = 'pendiente' AND NEW.estado = 'recibido' THEN
        -- Aumentar stock de todos los productos del pedido
        UPDATE productos 
        SET stock = stock + ppd.cantidad,
            updated_at = NOW()
        FROM pedidos_proveedor_detalle ppd
        WHERE productos.id = ppd.producto_id 
        AND ppd.pedido_id = NEW.id;
        
        -- Registrar movimientos de stock
        INSERT INTO movimientos_stock (producto_id, tipo, cantidad, motivo)
        SELECT ppd.producto_id, 'pedido', ppd.cantidad, 'Pedido recibido'
        FROM pedidos_proveedor_detalle ppd
        WHERE ppd.pedido_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar stock al recibir pedidos
CREATE TRIGGER trigger_actualizar_stock_pedido
    AFTER UPDATE ON pedidos_proveedor
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_stock_pedido();

-- Función para obtener productos con stock bajo
CREATE OR REPLACE FUNCTION productos_stock_bajo(limite INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    nombre TEXT,
    categoria TEXT,
    stock INTEGER,
    precio NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.nombre, c.nombre as categoria, p.stock, p.precio
    FROM productos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE p.stock <= limite
    ORDER BY p.stock ASC;
END;
$$ LANGUAGE plpgsql;
