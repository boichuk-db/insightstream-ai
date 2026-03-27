import { useState, useEffect } from 'react';

const STORAGE_KEY = 'selectedProjectId';

export function useSelectedProject() {
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY);
  });

  const setSelectedProjectId = (id: string | null) => {
    setSelectedProjectIdState(id);
    if (id === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, id);
    }
  };

  return { selectedProjectId, setSelectedProjectId };
}
