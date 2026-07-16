import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { getUserProfile } from '../services/authService';

interface UserSession {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'seller';
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Revisar si ya hay una sesión activa al abrir la app
    const checkActiveSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchAndSetProfile(session.user.id, session.user.email || '');
        }
      } catch (err) {
        console.error('Error al recuperar sesión inicial:', err);
      } finally {
        setLoading(false);
      }
    };

    checkActiveSession();

    // 2. Escuchar cambios de estado en la autenticación (Login, Logout, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);
      if (session?.user) {
        await fetchAndSetProfile(session.user.id, session.user.email || '');
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Función auxiliar para traer el perfil
  const fetchAndSetProfile = async (uid: string, email: string) => {
    try {
      const profile = await getUserProfile(uid);
      setUser({
        id: uid,
        email: email,
        fullName: profile.full_name,
        role: profile.role,
      });
    } catch (err) {
      console.error('Error al obtener perfil:', err);
      setUser(null);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de un AuthProvider');
  return context;
};