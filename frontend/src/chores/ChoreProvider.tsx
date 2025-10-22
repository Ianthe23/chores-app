import React, { createContext, useContext, useEffect, useState } from "react";
import { Chore, CreateChoreRequest, UpdateChoreRequest } from "../types/chore";
import { choreApi } from "./choreApi";
import { subscribeWS } from "../wsClient"; // <-- use ESM import

interface ChoreContextType {
  chores: Chore[];
  isLoading: boolean;
  error: string | null;
  fetchChores: () => Promise<void>;
  createChore: (chore: CreateChoreRequest) => Promise<Chore>;
  updateChore: (id: number, chore: UpdateChoreRequest) => Promise<Chore>;
  deleteChore: (id: number) => Promise<void>;
  getChoreById: (id: number) => Chore | undefined;
}

const ChoreContext = createContext<ChoreContextType | undefined>(undefined);

export const useChores = () => {
  const context = useContext(ChoreContext);
  if (!context) {
    throw new Error("useChores must be used within a ChoreProvider");
  }
  return context;
};

interface ChoreProviderProps {
  children: React.ReactNode;
}

export const ChoreProvider: React.FC<ChoreProviderProps> = ({ children }) => {
  const [chores, setChores] = useState<Chore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChores = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await choreApi.getChores();
      setChores(response.data);
    } catch (error: any) {
      setError(error.response?.data?.error || "Failed to fetch chores");
    } finally {
      setIsLoading(false);
    }
  };

  const createChore = async (choreData: CreateChoreRequest): Promise<Chore> => {
    try {
      const response = await choreApi.createChore(choreData);
      const newChore = response.data;

      // Upsert uniquely: replace if exists, else prepend
      setChores((prev) => [
        newChore,
        ...prev.filter((c) => c.id !== newChore.id),
      ]);
      return newChore;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to create chore");
    }
  };

  const updateChore = async (
    id: number,
    choreData: UpdateChoreRequest
  ): Promise<Chore> => {
    try {
      const response = await choreApi.updateChore(id, choreData);
      const updatedChore = response.data;
      setChores((prev) =>
        prev.map((chore) => (chore.id === id ? updatedChore : chore))
      );
      return updatedChore;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to update chore");
    }
  };

  const deleteChore = async (id: number): Promise<void> => {
    try {
      await choreApi.deleteChore(id);
      setChores((prev) => prev.filter((chore) => chore.id !== id));
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to delete chore");
    }
  };

  const getChoreById = (id: number): Chore | undefined => {
    return chores.find((chore) => chore.id === id);
  };

  useEffect(() => {
    fetchChores();
  }, []);

  // Subscribe to WebSocket chore events
  // Updates local state when other tabs create/update/delete chores
  useEffect(() => {
    const unsubscribe = subscribeWS((msg: any) => {
      if (!msg || !msg.type) return;

      if (msg.type === "CHORE_CREATED" && msg.chore) {
        setChores((prev) => [
          msg.chore,
          ...prev.filter((c) => c.id !== msg.chore.id),
        ]);
      } else if (msg.type === "CHORE_UPDATED" && msg.chore) {
        setChores((prev) =>
          prev.map((c) => (c.id === msg.chore.id ? msg.chore : c))
        );
      } else if (
        msg.type === "CHORE_DELETED" &&
        typeof msg.choreId === "number"
      ) {
        setChores((prev) => prev.filter((c) => c.id !== msg.choreId));
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const value = {
    chores,
    isLoading,
    error,
    fetchChores,
    createChore,
    updateChore,
    deleteChore,
    getChoreById,
  };

  return (
    <ChoreContext.Provider value={value}>{children}</ChoreContext.Provider>
  );
};
