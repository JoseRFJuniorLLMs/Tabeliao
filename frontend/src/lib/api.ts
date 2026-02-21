import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("tabeliao_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("tabeliao_token");
        localStorage.removeItem("tabeliao_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  register: (data: {
    name: string;
    email: string;
    password: string;
    cpf: string;
    cnpj?: string;
  }) => api.post("/auth/register", data),
  me: () => api.get("/auth/me"),
  forgotPassword: (email: string) =>
    api.post("/auth/forgot-password", { email }),
};

export const contractsApi = {
  list: (params?: Record<string, string | number>) =>
    api.get("/contracts", { params }),
  get: (id: string) => api.get(`/contracts/${id}`),
  create: (data: Record<string, unknown>) => api.post("/contracts", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/contracts/${id}`, data),
  sign: (id: string) => api.post(`/contracts/${id}/sign`),
  generateWithAI: (prompt: string) =>
    api.post("/contracts/generate", { prompt }),
  reviewWithAI: (id: string) => api.post(`/contracts/${id}/review`),
  delete: (id: string) => api.delete(`/contracts/${id}`),
};

export const paymentsApi = {
  list: (params?: Record<string, string | number>) =>
    api.get("/payments", { params }),
  get: (id: string) => api.get(`/payments/${id}`),
  generatePix: (id: string) => api.post(`/payments/${id}/pix`),
  confirm: (id: string) => api.post(`/payments/${id}/confirm`),
};

export const disputesApi = {
  list: (params?: Record<string, string | number>) =>
    api.get("/disputes", { params }),
  get: (id: string) => api.get(`/disputes/${id}`),
  create: (data: Record<string, unknown>) => api.post("/disputes", data),
  addMessage: (id: string, message: string) =>
    api.post(`/disputes/${id}/messages`, { message }),
  addEvidence: (id: string, formData: FormData) =>
    api.post(`/disputes/${id}/evidence`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  resolve: (id: string, resolution: Record<string, unknown>) =>
    api.post(`/disputes/${id}/resolve`, resolution),
};
