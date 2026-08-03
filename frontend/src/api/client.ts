import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const STORAGE_TOKEN_KEY = 'auth:token';
const STORAGE_USER_KEY = 'auth:user';
const STORAGE_ROUTE_KEY = 'rutaNumero';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  config.headers = config.headers ?? {};
  if (token?.trim()) {
    config.headers.Authorization = `Bearer ${token.trim()}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_USER_KEY);
      localStorage.removeItem(STORAGE_ROUTE_KEY);
    }

    const message =
      error?.response?.data?.message ??
      error?.message ??
      'Ocurrio un error inesperado consumiendo la API.';

    if (Array.isArray(message)) {
      throw new Error(message.join(', '));
    }

    throw new Error(String(message));
  },
);
