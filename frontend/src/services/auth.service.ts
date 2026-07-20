import { apiClient } from '@/api/client';
import type { LoginPayload, LoginResponse } from '@/types/auth';

export async function login(payload: LoginPayload) {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);
  return data;
}
