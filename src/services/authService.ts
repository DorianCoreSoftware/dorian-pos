import { supabase } from "./supabase";

/**
 * Inicia sesión utilizando correo y contraseña en Supabase Auth
 */
export const signInWithEmail = async (email: string, pass: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });
  if (error) throw error;
  return data;
};

/**
 * Recupera el perfil y el rol del usuario desde la tabla 'profiles'
 * adaptado a las columnas 'first_name' y 'last_name'
 */
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, first_name, last_name') // Solicitamos los campos reales de tu base de datos
    .eq('id', userId)
    .single();

  if (error) throw error;

  // Concatenamos el nombre completo y devolvemos la misma estructura que espera tu Context
  return {
    role: data.role,
    full_name: `${data.first_name || ''} ${data.last_name || ''}`.trim()
  };
};

/**
 * Cierra la sesión activa del usuario
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};