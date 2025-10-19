const userConnections = new Map();

export const setupWebSocket = (wss) => {
  wss.on("connection", (ws, req) => {
    console.log("📱 New WebSocket connection");

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message);

        if (data.type === "AUTH" && data.userId) {
          userConnections.set(data.userId, ws);
          console.log(`👤 User ${data.userId} connected via WebSocket`);
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      // Remove user connection
      for (const [userId, connection] of userConnections.entries()) {
        if (connection === ws) {
          userConnections.delete(userId);
          console.log(`👤 User ${userId} disconnected from WebSocket`);
          break;
        }
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });
};

export const broadcastToUser = (userId, message) => {
  const connection = userConnections.get(userId);
  if (connection && connection.readyState === 1) {
    // WebSocket.OPEN
    connection.send(JSON.stringify(message));
  }
};
