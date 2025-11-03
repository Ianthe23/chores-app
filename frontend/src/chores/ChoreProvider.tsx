import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { Chore, CreateChoreRequest, UpdateChoreRequest } from "../types/chore";
import { choreApi } from "./choreApi";
import { subscribeWS } from "../wsClient"; // <-- use ESM import
import { useNetwork } from "../network/NetworkProvider";
import { useAuth } from "../auth/AuthProvider";

interface ChoreContextType {
  chores: Chore[];
  isLoading: boolean;
  error: string | null;
  fetchChores: (
    page?: number,
    filters?: { status?: "pending" | "in-progress" | "completed"; q?: string }
  ) => Promise<void>;
  createChore: (chore: CreateChoreRequest) => Promise<Chore>;
  updateChore: (id: number, chore: UpdateChoreRequest) => Promise<Chore>;
  deleteChore: (id: number) => Promise<void>;
  getChoreById: (id: number) => Chore | undefined;
  page: number;
  hasMore: boolean;
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
  const [page, setPage] = useState(1);
  const limit = 5;
  const [hasMore, setHasMore] = useState(true);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const { isOnline } = useNetwork();
  const { user } = useAuth();

  const [currentFilters, setCurrentFilters] = useState<{
    status?: "pending" | "in-progress" | "completed";
    q?: string;
  }>({});

  const OUTBOX_KEY = "chore_outbox";
  const CACHE_KEY = "chore_cache";

  const loadOutbox = () => {
    try {
      return JSON.parse(localStorage.getItem(OUTBOX_KEY) || "[]");
    } catch {
      return [];
    }
  };

  const saveOutbox = (items: any[]) => {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
    setUnsyncedCount(items.length);
  };

  const saveCache = (items: Chore[]) => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(items));
  };

  const loadCache = (): Chore[] => {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
    } catch {
      return [];
    }
  };

  const fetchChores = async (
    nextPage: number = 1,
    filters?: { status?: "pending" | "in-progress" | "completed"; q?: string }
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const applied = filters ?? currentFilters;
      const response = await choreApi.getChores({
        page: nextPage,
        limit,
        status: applied.status,
        q: applied.q,
      });
      const { items, total, page: respPage, limit: respLimit } = response.data;

      setChores(items);
      setPage(respPage);
      setHasMore(respPage * respLimit < total);
      setCurrentFilters(applied);
    } catch (error: any) {
      setError(error.response?.data?.error || "Failed to fetch chores");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchChores(1, currentFilters);
    } else {
      setChores([]);
    }
  }, [user]);

  const createChore = async (choreData: CreateChoreRequest): Promise<Chore> => {
    if (!navigator.onLine) {
      const temp: Chore = {
        id: -Date.now(),
        title: choreData.title,
        description: choreData.description,
        status: "pending",
        priority: choreData.priority ?? "medium",
        due_date: choreData.due_date,
        points: choreData.points ?? 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: JSON.parse(localStorage.getItem("user") || "{}")?.id || 0,
      };
      setChores((prev) => [temp, ...prev]);
      const outbox = loadOutbox();
      outbox.push({ op: "create", payload: choreData, tempId: temp.id });
      saveOutbox(outbox);
      throw new Error("Offline: chore queued to sync");
    }

    try {
      const response = await choreApi.createChore(choreData);
      const newChore = response.data;
      setChores((prev) => [
        newChore,
        ...prev.filter((c) => c.id !== newChore.id),
      ]);
      saveCache([newChore, ...chores.filter((c) => c.id !== newChore.id)]);
      return newChore;
    } catch (error: any) {
      // Online but REST failed: queue
      const tempId = -Date.now();
      const temp: Chore = {
        id: tempId,
        title: choreData.title,
        description: choreData.description,
        status: "pending",
        priority: choreData.priority ?? "medium",
        due_date: choreData.due_date,
        points: choreData.points ?? 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: JSON.parse(localStorage.getItem("user") || "{}")?.id || 0,
      };
      setChores((prev) => [temp, ...prev]);
      const outbox = loadOutbox();
      outbox.push({ op: "create", payload: choreData, tempId });
      saveOutbox(outbox);
      throw new Error(
        error.response?.data?.error || "Failed to create chore (queued)"
      );
    }
  };

  const updateChore = async (
    id: number,
    choreData: UpdateChoreRequest
  ): Promise<Chore> => {
    if (!navigator.onLine) {
      setChores((prev) =>
        prev.map((c) =>
          c.id === id
            ? ({
                ...c,
                ...choreData,
                updated_at: new Date().toISOString(),
              } as any)
            : c
        )
      );
      const outbox = loadOutbox();
      outbox.push({ op: "update", id, payload: choreData });
      saveOutbox(outbox);
      throw new Error("Offline: update queued to sync");
    }
    try {
      const response = await choreApi.updateChore(id, choreData);
      const updatedChore = response.data;
      setChores((prev) =>
        prev.map((chore) => (chore.id === id ? updatedChore : chore))
      );
      saveCache(
        chores.map((chore) => (chore.id === id ? updatedChore : chore))
      );
      return updatedChore;
    } catch (error: any) {
      const outbox = loadOutbox();
      outbox.push({ op: "update", id, payload: choreData });
      saveOutbox(outbox);
      throw new Error(
        error.response?.data?.error || "Failed to update chore (queued)"
      );
    }
  };

  const deleteChore = async (id: number): Promise<void> => {
    if (!navigator.onLine) {
      setChores((prev) => prev.filter((chore) => chore.id !== id));
      const outbox = loadOutbox();
      outbox.push({ op: "delete", id });
      saveOutbox(outbox);
      throw new Error("Offline: delete queued to sync");
    }
    try {
      await choreApi.deleteChore(id);
      setChores((prev) => prev.filter((chore) => chore.id !== id));
      saveCache(chores.filter((chore) => chore.id !== id));
    } catch (error: any) {
      const outbox = loadOutbox();
      outbox.push({ op: "delete", id });
      saveOutbox(outbox);
      throw new Error(
        error.response?.data?.error || "Failed to delete chore (queued)"
      );
    }
  };

  const getChoreById = (id: number) => {
    return chores.find((chore) => chore.id === id);
  };

  // Prevent concurrent sync runs
  const syncingRef = useRef(false);

  const syncOutbox = async () => {
    if (syncingRef.current) return; // guard against re-entrancy
    syncingRef.current = true;
    try {
      // Try even if navigator.onLine is false; mobile can report stale values
      let outbox = loadOutbox();
      if (outbox.length === 0) return;

      const newChores = [...chores];
      const remaining: any[] = [];

      for (const item of outbox) {
        try {
          if (item.op === "create") {
            const res = await choreApi.createChore(item.payload);
            const created = res.data;
            const idx = newChores.findIndex((c) => c.id === item.tempId);
            if (idx >= 0) newChores[idx] = created;
          } else if (item.op === "update") {
            const res = await choreApi.updateChore(item.id, item.payload);
            const updated = res.data;
            const idx = newChores.findIndex((c) => c.id === item.id);
            if (idx >= 0) newChores[idx] = updated;
          } else if (item.op === "delete") {
            await choreApi.deleteChore(item.id);
            const idx = newChores.findIndex((c) => c.id === item.id);
            if (idx >= 0) newChores.splice(idx, 1);
          }
        } catch {
          // If any request fails, keep it for a later retry
          remaining.push(item);
        }
      }

      setChores(newChores);
      saveCache(newChores);
      saveOutbox(remaining);
    } finally {
      syncingRef.current = false;
    }
  };

  useEffect(() => {
    if (user) {
      fetchChores(1);
    } else {
      setChores([]);
    }
  }, [user]);

  useEffect(() => {
    if (isOnline) {
      syncOutbox();
    }
  }, [isOnline]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        syncOutbox();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    const onOnline = () => syncOutbox();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [chores]);

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
    page,
    hasMore,
  };

  return (
    <ChoreContext.Provider value={value}>{children}</ChoreContext.Provider>
  );
};
