-- Insertar categorías iniciales
INSERT INTO categorias (nombre) VALUES
    ('Remeras'),
    ('Pantalones'),
    ('Vestidos'),
    ('Abrigos'),
    ('Accesorios'),
    ('Calzado');

-- Insertar proveedores iniciales
INSERT INTO proveedores (nombre, telefono, email) VALUES
    ('Textil Argentina SA', '+54 11 4567-8901', 'ventas@textilargentina.com'),
    ('Confecciones del Sur', '+54 11 4567-8902', 'pedidos@confeccionesdelsur.com'),
    ('Moda Urbana SRL', '+54 11 4567-8903', 'contacto@modaurbana.com');

-- Insertar productos de ejemplo
INSERT INTO productos (nombre, categoria_id, talle, color, precio, costo, stock, imagen_url) VALUES
    ('Remera Básica', (SELECT id FROM categorias WHERE nombre = 'Remeras'), 'M', 'Blanco', 2500.00, 1200.00, 50, NULL),
    ('Jean Clásico', (SELECT id FROM categorias WHERE nombre = 'Pantalones'), '32', 'Azul', 4500.00, 2200.00, 30, NULL),
    ('Vestido Casual', (SELECT id FROM categorias WHERE nombre = 'Vestidos'), 'S', 'Negro', 3800.00, 1800.00, 25, NULL),
    ('Campera de Cuero', (SELECT id FROM categorias WHERE nombre = 'Abrigos'), 'L', 'Marrón', 8500.00, 4200.00, 15, NULL),
    ('Cinturón de Cuero', (SELECT id FROM categorias WHERE nombre = 'Accesorios'), 'Único', 'Negro', 1800.00, 900.00, 40, NULL);
