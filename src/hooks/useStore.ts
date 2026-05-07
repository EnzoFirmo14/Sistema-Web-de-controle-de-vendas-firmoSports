import { useContext } from 'react';
import { StoreContext, type StoreContextType } from '../context/StoreContext';

/**
 * Hook to access store context.
 * Throws if used outside StoreProvider.
 */
export function useStore(): StoreContextType {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
