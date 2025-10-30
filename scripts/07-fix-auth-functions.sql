-- Corregir la tabla usuarios para usar nombre_completo consistentemente
ALTER TABLE usuarios RENAME COLUMN nombre TO nombre_completo;

-- Función para verificar usuario y contraseña (la que falta)
CREATE OR REPLACE FUNCTION verificar_usuario(
  p_usuario TEXT,
  p_password TEXT
) RETURNS TABLE(
  id UUID,
  usuario TEXT,
  nombre_completo TEXT,
  rol TEXT,
  activo BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.usuario,
    u.nombre_completo,
    u.rol,
    u.activo
  FROM usuarios u
  WHERE u.usuario = p_usuario 
    AND u.password_hash = crypt(p_password, u.password_hash)
    AND u.activo = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para crear nuevo usuario
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

-- Función para actualizar usuario (corregida)
CREATE OR REPLACE FUNCTION actualizar_usuario_password(
  p_id UUID,
  p_password TEXT,
  p_nombre_completo TEXT,
  p_rol TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE usuarios 
  SET 
    password_hash = crypt(p_password, gen_salt('bf')),
    nombre_completo = p_nombre_completo,
    rol = p_rol,
    updated_at = NOW()
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para cambiar estado de usuario
CREATE OR REPLACE FUNCTION cambiar_estado_usuario(
  p_id UUID,
  p_activo BOOLEAN
) RETURNS VOID AS $$
BEGIN
  UPDATE usuarios 
  SET 
    activo = p_activo,
    updated_at = NOW()
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
