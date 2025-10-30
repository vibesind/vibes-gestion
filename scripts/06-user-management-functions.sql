-- Función para actualizar usuario con contraseña
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
