import axios from 'axios';

const API_URL = '/api/auth';

export const authApi = {
  login: (username: string, password: string) => {
    return axios.post(`${API_URL}/login`, { username, password });
  },

  register: (username: string, password: string) => {
    return axios.post(`${API_URL}/register`, { username, password });
  }
};