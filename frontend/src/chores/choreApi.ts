import axios from "axios";
import { Chore, CreateChoreRequest, UpdateChoreRequest } from "../types/chore";

const API_URL = "/api/chores"; // use Vite proxy via same origin

// Add token to requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const choreApi = {
  getChores: ({
    page = 1,
    limit = 5,
    status,
    q,
  }: {
    page?: number;
    limit?: number;
    status?: "pending" | "in-progress" | "completed";
    q?: string;
  }) => {
    return axios.get<{
      items: Chore[];
      total: number;
      page: number;
      limit: number;
    }>(API_URL, {
      params: { page, limit, status, q },
    });
  },

  getChore: (id: number) => {
    return axios.get<Chore>(`${API_URL}/${id}`);
  },

  createChore: (chore: CreateChoreRequest) => {
    return axios.post<Chore>(API_URL, chore);
  },

  updateChore: (id: number, chore: UpdateChoreRequest) => {
    return axios.put<Chore>(`${API_URL}/${id}`, chore);
  },

  deleteChore: (id: number) => {
    return axios.delete(`${API_URL}/${id}`);
  },
};
