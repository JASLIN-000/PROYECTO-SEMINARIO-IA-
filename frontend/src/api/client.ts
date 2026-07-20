import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const ruta = localStorage.getItem('rutaNumero') ?? '15';
  config.headers = config.headers ?? {};
  config.headers['x-ruta-numero'] = ruta;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
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
