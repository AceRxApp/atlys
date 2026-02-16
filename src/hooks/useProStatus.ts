import { useState, useEffect } from 'react';

const STORAGE_KEY = 'nxstops_pro_status';

export function useProStatus() {
  const [isPro, setIsPro] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isPro));
  }, [isPro]);

  const activatePro = () => setIsPro(true);
  const deactivatePro = () => setIsPro(false);

  return { isPro, activatePro, deactivatePro };
}
