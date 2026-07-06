import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function useSocket(
  userId: string | undefined,
  onFeedbackUpdated: () => void,
) {
  const socketRef = useRef<Socket | null>(null);
  const callbackRef = useRef(onFeedbackUpdated);

  useEffect(() => {
    callbackRef.current = onFeedbackUpdated;
  }, [onFeedbackUpdated]);

  useEffect(() => {
    if (!userId) return;

    const token = localStorage.getItem("access_token");
    if (!token) return;

    // No transports override: let Socket.io fall back to HTTP long-polling
    // when a WebSocket upgrade isn't available (API Gateway HTTP APIs don't
    // support WS). If the API ever scales past one instance, polling needs
    // ALB target-group stickiness to keep hitting the same instance.
    const socket = io(SOCKET_URL, {
      auth: { token },
    });
    socketRef.current = socket;

    socket.on("feedbackUpdated", () => {
      callbackRef.current();
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);
}
