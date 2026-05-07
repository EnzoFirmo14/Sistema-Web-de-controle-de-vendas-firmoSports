import { createContext, useState, useCallback, type ReactNode } from 'react';

export interface StoreInfo {
  name: string;
  logoUrl: string;
  description: string;
}

export interface StoreContextType {
  storeInfo: StoreInfo | null;
  setStoreInfo: (uid: string, info: StoreInfo) => void;
  clearStoreInfo: () => void;
  loadStoreForUser: (uid: string) => void;
}

export const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [storeInfo, setStoreInfoState] = useState<StoreInfo | null>(null);

  const loadStoreForUser = useCallback((uid: string) => {
    try {
      const stored = localStorage.getItem('storeInfo_' + uid);
      if (stored) {
        setStoreInfoState(JSON.parse(stored));
      } else {
        setStoreInfoState(null);
      }
    } catch {
      setStoreInfoState(null);
    }
  }, []);

  const setStoreInfo = useCallback((uid: string, info: StoreInfo) => {
    const clean: StoreInfo = {
      name: info.name?.trim() || '',
      logoUrl: info.logoUrl?.trim() || '',
      description: info.description?.trim() || '',
    };
    localStorage.setItem('storeInfo_' + uid, JSON.stringify(clean));
    setStoreInfoState(clean);
  }, []);

  const clearStoreInfo = useCallback(() => {
    setStoreInfoState(null);
  }, []);

  return (
    <StoreContext.Provider value={{ storeInfo, setStoreInfo, clearStoreInfo, loadStoreForUser }}>
      {children}
    </StoreContext.Provider>
  );
}
