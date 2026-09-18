import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  AuthenticatedUser,
  getActiveUser,
  getUserProfile,
  listenToAuthChanges,
  signOut,
} from '../services/authService';
import { UserRole } from '../types/auth';

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext =
  createContext<
    AuthContextType | undefined
  >(
    undefined,
  );

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider:
  React.FC<AuthProviderProps> = ({
    children,
  }) => {
    const [
      user,
      setUser,
    ] =
      useState<
        UserSession | null
      >(null);

    const [
      loading,
      setLoading,
    ] =
      useState(true);

    const isMountedRef =
      useRef(true);

    /*
     * Cada sincronización recibe un
     * identificador.
     *
     * Si una operación más nueva comienza
     * antes de que termine la anterior,
     * la anterior ya no puede modificar
     * el estado.
     */
    const syncIdRef =
      useRef(0);

    const syncAuthenticatedUser =
      useCallback(
        async (
          authenticatedUser:
            AuthenticatedUser | null,
        ): Promise<void> => {
          const syncId =
            ++syncIdRef.current;

          if (
            !authenticatedUser
          ) {
            if (
              isMountedRef.current &&
              syncId ===
                syncIdRef.current
            ) {
              setUser(null);
            }

            return;
          }

          try {
            const profile =
              await getUserProfile(
                authenticatedUser.id,
              );

            if (
              !isMountedRef.current ||
              syncId !==
                syncIdRef.current
            ) {
              return;
            }

            setUser({
              id:
                authenticatedUser.id,

              email:
                authenticatedUser.email,

              fullName:
                profile.fullName,

              role:
                profile.role,
            });
          } catch (error) {
            console.error(
              'Error al cargar el perfil del usuario:',
              error,
            );

            if (
              isMountedRef.current &&
              syncId ===
                syncIdRef.current
            ) {
              setUser(null);
            }
          }
        },
        [],
      );

    useEffect(() => {
      isMountedRef.current =
        true;

      /*
       * El listener se registra primero
       * para no perder ningún cambio de
       * sesión que ocurra durante la
       * inicialización.
       */
      const subscription =
        listenToAuthChanges(
          ({
            user:
              authenticatedUser,
          }) => {
            void (async () => {
              if (
                !isMountedRef.current
              ) {
                return;
              }

              setLoading(true);

              try {
                await syncAuthenticatedUser(
                  authenticatedUser,
                );
              } finally {
                if (
                  isMountedRef.current
                ) {
                  setLoading(false);
                }
              }
            })();
          },
        );

      const initializeAuth =
        async (): Promise<void> => {
          try {
            const activeUser =
              await getActiveUser();

            if (
              !isMountedRef.current
            ) {
              return;
            }

            await syncAuthenticatedUser(
              activeUser,
            );
          } catch (error) {
            console.error(
              'Error al recuperar la sesión inicial:',
              error,
            );

            if (
              isMountedRef.current
            ) {
              setUser(null);
            }
          } finally {
            if (
              isMountedRef.current
            ) {
              setLoading(false);
            }
          }
        };

      void initializeAuth();

      return () => {
        isMountedRef.current =
          false;

        /*
         * Invalida cualquier operación
         * async pendiente.
         */
        syncIdRef.current += 1;

        subscription.unsubscribe();
      };
    }, [
      syncAuthenticatedUser,
    ]);

    const logout =
      async (): Promise<void> => {
        try {
          setLoading(true);

          /*
           * Invalida cualquier carga de
           * perfil que pudiera seguir
           * pendiente.
           */
          syncIdRef.current += 1;

          await signOut();

          if (
            isMountedRef.current
          ) {
            setUser(null);
          }
        } catch (error) {
          console.error(
            'Error al cerrar sesión:',
            error,
          );

          throw error;
        } finally {
          if (
            isMountedRef.current
          ) {
            setLoading(false);
          }
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

export function useAuth():
  AuthContextType {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth debe usarse dentro de un AuthProvider',
    );
  }

  return context;
}