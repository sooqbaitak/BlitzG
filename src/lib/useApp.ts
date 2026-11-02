import { useContext } from 'react';
import { Ctx } from './appContextCore';

export function useApp() {
  const context = useContext(Ctx);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
