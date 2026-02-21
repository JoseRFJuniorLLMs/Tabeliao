import { create } from "zustand";
import { persist } from "zustand/middleware";
import toast from "react-hot-toast";
import { authApi } from "@/lib/api";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerUser: (data: {
    name: string;
    email: string;
    password: string;
    cpf: string;
    cnpj?: string;
  }) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login(email, password);
          const { token, user } = response.data;

          localStorage.setItem("tabeliao_token", token);

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          toast.success("Login realizado com sucesso!");
          window.location.href = "/dashboard";
        } catch (error: unknown) {
          set({ isLoading: false });
          const err = error as { response?: { data?: { message?: string } } };
          toast.error(
            err.response?.data?.message || "Erro ao fazer login. Verifique suas credenciais."
          );
        }
      },

      registerUser: async (data) => {
        set({ isLoading: true });
        try {
          const response = await authApi.register(data);
          const { token, user } = response.data;

          localStorage.setItem("tabeliao_token", token);

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          toast.success("Conta criada com sucesso!");
          window.location.href = "/dashboard";
        } catch (error: unknown) {
          set({ isLoading: false });
          const err = error as { response?: { data?: { message?: string } } };
          toast.error(
            err.response?.data?.message || "Erro ao criar conta. Tente novamente."
          );
        }
      },

      logout: () => {
        localStorage.removeItem("tabeliao_token");
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
        toast.success("Logout realizado.");
        window.location.href = "/login";
      },

      fetchUser: async () => {
        try {
          const response = await authApi.me();
          set({ user: response.data, isAuthenticated: true });
        } catch {
          set({ user: null, token: null, isAuthenticated: false });
        }
      },

      setUser: (user: User) => {
        set({ user });
      },
    }),
    {
      name: "tabeliao-auth",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
