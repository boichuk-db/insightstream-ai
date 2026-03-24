import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

export function useSocket(userId: string | undefined, onFeedbackUpdated: () => void) {
  const socketRef = useRef<Socket | null>(null);
  const callbackRef = useRef(onFeedbackUpdated);

  // Keep the callback ref up to date
  useEffect(() => {
    callbackRef.current = onFeedbackUpdated;
  }, [onFeedbackUpdated]);

  useEffect(() => {
    if (!userId) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket'], // Force websocket to avoid huge amount of polling requests
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to socket server');
    });

    socket.on(`feedbackUpdated:${userId}`, () => {
      console.log('Real-time feedback update received!');
      callbackRef.current();
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]); // Only depend on userId

  return socketRef.current;
}
