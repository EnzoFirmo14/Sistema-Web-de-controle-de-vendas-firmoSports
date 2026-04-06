import React from 'react';
import logo from '../Design_sem_nome__2_-removebg-preview.png';
import { signIn } from '../firebase';
import { LogIn, Shirt } from 'lucide-react';
import { motion } from 'motion/react';

export default function Auth() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-violet-700 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center transition-colors duration-300"
      >
        <div className="flex justify-center mb-6">
          <div className="p-1 bg-white rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <img 
              src={logo} 
              alt="Logo" 
              className="w-24 h-24 object-contain"
            />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Firmo Sports</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Gerencie seus pedidos de camisas de futebol de forma profissional e organizada.
        </p>
        <button
          onClick={signIn}
          className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-indigo-200 dark:hover:shadow-none"
        >
          <LogIn className="w-5 h-5" />
          Entrar com Google
        </button>
        <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">
          Acesso restrito para administradores da loja.
        </p>
      </motion.div>
    </div>
  );
}
