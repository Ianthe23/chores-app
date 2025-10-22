let socket: WebSocket | null = null;
let pendingUserId: number | null = null;

type WSListener = (data: any) => void;
const listeners = new Set<WSListener>();

function handleMessage(ev: MessageEvent) {
  try {
    const data = JSON.parse(ev.data);
    for (const listener of listeners) {
      listener(data);
    }
  } catch (error) {
    console.error("WS parse error:", error);
  }
}

export function connectWebSocket(userId: number) {
  // Ensure single socket across OPEN and CONNECTING states
  if (socket) {
    socket.onmessage = handleMessage;

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "AUTH", userId }));
    } else if (socket.readyState === WebSocket.CONNECTING) {
      pendingUserId = userId;
      socket.addEventListener(
        "open",
        () => {
          if (pendingUserId != null) {
            socket?.send(
              JSON.stringify({ type: "AUTH", userId: pendingUserId })
            );
            pendingUserId = null;
          }
        },
        { once: true }
      );
    }
    return socket;
  }

  const url = import.meta.env.VITE_WS_URL || "ws://localhost:3000";
  socket = new WebSocket(url);
  pendingUserId = userId;

  socket.onopen = () => {
    if (pendingUserId != null) {
      socket?.send(JSON.stringify({ type: "AUTH", userId: pendingUserId }));
      pendingUserId = null;
    }
  };

  socket.onmessage = handleMessage;

  return socket;
}

export function closeWebSocket() {
  if (socket) {
    try {
      socket.close();
    } finally {
      socket = null;
      pendingUserId = null;
    }
  }
}

export function sendWS(message: unknown) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

export function subscribeWS(listener: WSListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}