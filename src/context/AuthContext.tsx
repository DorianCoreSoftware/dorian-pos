import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  AuthenticatedUser,
  getActiveUser,
  getUserProfile,
  listenToAuthChanges,
  signOut,
} from '../services/authService';

export interface UserSession {
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

const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined,
  );

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<
  AuthProviderProps
> = ({ children }) => {
  const [user, setUser] =
    useState<UserSession | null>(null);

  const [loading, setLoading] =
    useState(true);

  const fetchAndSetProfile =
    useCallback(
      async (
        authenticatedUser:
          AuthenticatedUser,
      ): Promise<void> => {
        try {
          const profile =
            await getUserProfile(
              authenticatedUser.id,
            );

          setUser({
            id: authenticatedUser.id,
            email:
              authenticatedUser.email,
            fullName:
              profile.fullName,
            role: profile.role,
          });
        } catch (error) {
          console.error(
            'Error al cargar el perfil del usuario:',
            error,
          );

          setUser(null);
        }
      },
      [],
    );

  useEffect(() => {
    let isMounted = true;

    const loadInitialSession =
      async (): Promise<void> => {
        try {
          const activeUser =
            await getActiveUser();

          if (
            activeUser &&
            isMounted
          ) {
            await fetchAndSetProfile(
              activeUser,
            );
          }
        } catch (error) {
          console.error(
            'Error al recuperar la sesión inicial:',
            error,
          );

          if (isMounted) {
            setUser(null);
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      };

    void loadInitialSession();

    const subscription =
      listenToAuthChanges(
        ({ user: authenticatedUser }) => {
          void (async () => {
            if (!isMounted) {
              return;
            }

            setLoading(true);

            try {
              if (authenticatedUser) {
                await fetchAndSetProfile(
                  authenticatedUser,
                );
              } else {
                setUser(null);
              }
            } finally {
              if (isMounted) {
                setLoading(false);
              }
            }
          })();
        },
      );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchAndSetProfile]);

  const logout =
    async (): Promise<void> => {
      try {
        setLoading(true);

        await signOut();
        setUser(null);
      } catch (error) {
        console.error(
          'Error al cerrar sesión:',
          error,
        );

        throw error;
      } finally {
        setLoading(false);
      }
    };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth debe usarse dentro de un AuthProvider',
    );
  }

  return context;
}