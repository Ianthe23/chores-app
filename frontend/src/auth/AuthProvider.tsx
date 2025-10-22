import React, { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "./authApi";
import { connectWebSocket, closeWebSocket } from "../wsClient";

interface User {
  id: number;
  username: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      // Connect only after explicit login/register; no auto connect here
      // connectWebSocket(parsed.id);
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await authApi.login(username, password);
      const { user: userData, token: userToken } = response.data;

      setUser(userData);
      setToken(userToken);
      localStorage.setItem("token", userToken);
      localStorage.setItem("user", JSON.stringify(userData));

      connectWebSocket(userData.id); // connect after login
    } catch (error) {
      throw error;
    }
  };

  const register = async (username: string, password: string) => {
    try {
      const response = await authApi.register(username, password);
      const { user: userData, token: userToken } = response.data;

      setUser(userData);
      setToken(userToken);
      localStorage.setItem("token", userToken);
      localStorage.setItem("user", JSON.stringify(userData));

      connectWebSocket(userData.id); // connect after register
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    closeWebSocket();
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
