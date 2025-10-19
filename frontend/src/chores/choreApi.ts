import axios from 'axios';
import { Chore, CreateChoreRequest, UpdateChoreRequest } from '../types/chore';

const API_URL = '/api/chores';

// Add token to requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const choreApi = {
  getChores: () => {
    return axios.get<Chore[]>(API_URL);
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
  }
};