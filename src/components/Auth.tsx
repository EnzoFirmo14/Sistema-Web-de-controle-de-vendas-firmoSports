import React, { useState } from 'react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-[420px] rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-10 text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-lg bg-slate-900 dark:bg-slate-700 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.38 3.4a2.5 2.5 0 0 0-3.54 0l-.5.5a.5.5 0 0 1-.5 0l-2.12-1.18a2.5 2.5 0 0 0-2.42 0l-.5.28a.5.5 0 0 1-.46 0l-.5-.28a2.5 2.5 0 0 0-2.42 0l-1.62.9a2.5 2.5 0 0 0-1.3 2.24v2.12a.5.5 0 0 1-.18.38l-1.18 1.04a2.5 2.5 0 0 0 0 3.54l1.04 1.18a.5.5 0 0 1 .38-.18h2.12a2.5 2.5 0 0 0 2.24-1.3l.9-1.62a2.5 2.5 0 0 0 0-2.42l-.28-.5a.5.5 0 0 1 .01-.46l.28-.5a2.5 2.5 0 0 0 0-2.42L7.62 6.04a.5.5 0 0 1 0-.5l.5-.5a2.5 2.5 0 0 0 3.54 0l1.18 2.12a.5.5 0 0 1 .5 0l.5.5a2.5 2.5 0 0 0 0-3.54z"/>
            </svg>
          </div>
        </div>

        {/* Header */}
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight mb-2">
          Gerencie sua loja de camisas de time
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          Controle pedidos, lotes e vendas em um só lugar.
        </p>

        {/* Google Button */}
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-sm py-3 px-6 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-slate-300 dark:hover:border-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {isLoading ? 'Entrando...' : 'Entrar com Google'}
        </button>

        {/* Footer */}
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-6">
          Sua loja, seus dados.
        </p>
      </div>
    </div>
  );
}
