import logoFallback from '../Design_sem_nome__2_-removebg-preview.png';
import { Settings } from 'lucide-react';
import { useStore } from '../hooks/useStore';

interface StoreHeaderProps {
  onOpenProfile: () => void;
}

export default function StoreHeader({ onOpenProfile }: StoreHeaderProps) {
  const { storeInfo } = useStore();

  const displayName = storeInfo?.name || '';
  const displayLogo = storeInfo?.logoUrl || logoFallback;

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2.5">
        <img
          src={displayLogo}
          alt="Store logo"
          className="w-7 h-7 object-contain rounded-md"
        />
        <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
          {displayName}
        </span>
      </div>
      <button
        onClick={onOpenProfile}
        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
        aria-label="Store settings"
      >
        <Settings className="w-4 h-4" />
      </button>
    </div>
  );
}
