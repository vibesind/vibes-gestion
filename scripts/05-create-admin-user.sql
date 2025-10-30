-- Crear tabla de usuarios personalizada para login con usuario/contraseña
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nombre_completo VARCHAR(100) NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'vendedor')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Función para hashear contraseñas (usando crypt de pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insertar usuario admin inicial
-- Usuario: admin, Contraseña: admin123
INSERT INTO usuarios (usuario, password_hash, nombre_completo, rol) 
VALUES ('admin', crypt('admin123', gen_salt('bf')), 'Administrador Principal', 'admin')
ON CONFLICT (usuario) DO NOTHING;

-- Función para verificar contraseñas
CREATE OR REPLACE FUNCTION verificar_usuario(p_usuario TEXT, p_password TEXT)
RETURNS TABLE(
  id UUID,
  usuario VARCHAR(50),
  nombre_completo VARCHAR(100),
  rol VARCHAR(20),
  activo BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.usuario, u.nombre_completo, u.rol, u.activo
  FROM usuarios u
  WHERE u.usuario = p_usuario 
    AND u.password_hash = crypt(p_password, u.password_hash)
    AND u.activo = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para crear nuevos usuarios
CREATE OR REPLACE FUNCTION crear_usuario(
  p_usuario TEXT,
  p_password TEXT,
  p_nombre_completo TEXT,
  p_rol TEXT
) RETURNS UUID AS $$
DECLARE
  nuevo_id UUID;
BEGIN
  INSERT INTO usuarios (usuario, password_hash, nombre_completo, rol)
  VALUES (p_usuario, crypt(p_password, gen_salt('bf')), p_nombre_completo, p_rol)
  RETURNING id INTO nuevo_id;
  
  RETURN nuevo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
