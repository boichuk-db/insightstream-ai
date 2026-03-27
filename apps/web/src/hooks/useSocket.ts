import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useSocket(userId: string | undefined, onFeedbackUpdated: () => void) {
  const socketRef = useRef<Socket | null>(null);
  const callbackRef = useRef(onFeedbackUpdated);

  useEffect(() => {
    callbackRef.current = onFeedbackUpdated;
  }, [onFeedbackUpdated]);

  useEffect(() => {
    if (!userId) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('feedbackUpdated', () => {
      callbackRef.current();
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);

}
