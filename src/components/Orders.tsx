import React, { useState, useMemo } from 'react';
import { Order, Batch, OrderStatus } from '../types';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  ExternalLink,
  ChevronRight,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  Copy,
  ClipboardList,
  Share2,
  XCircle,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface OrdersProps {
  orders: Order[];
  batches: Batch[];
  onEdit: (order: Order) => void;
  onDelete: (id: string) => void;
  onDuplicate: (order: Order) => void;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
}

export default function Orders({ orders, batches, onEdit, onDelete, onDuplicate, onUpdateStatus }: OrdersProps) {
  const [search, setSearch] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = order.clientName.toLowerCase().includes(search.toLowerCase()) || 
                           order.shirtName.toLowerCase().includes(search.toLowerCase());
      
      let matchesBatch = true;
      if (selectedBatchId === 'all') {
        matchesBatch = true;
      } else if (selectedBatchId === 'none') {
        matchesBatch = !order.batchId;
      } else {
        matchesBatch = order.batchId === selectedBatchId;
      }

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesBatch && matchesStatus;
    });
  }, [orders, search, selectedBatchId, statusFilter]);

  const stats = useMemo(() => {
    const total = filteredOrders.length;
    const totalBrl = filteredOrders.reduce((acc, o) => acc + (o.priceBrl || 0), 0);
    const paidBrl = filteredOrders.reduce((acc, o) => acc + (o.paidAmount || 0), 0);
    const pendingBrl = totalBrl - paidBrl;
    return { total, totalBrl, paidBrl, pendingBrl };
  }, [filteredOrders]);

  const shareOnWhatsApp = (order: Order) => {
    const message = `Olá! Confirmando seu pedido:\n\n👕 *${order.shirtName}*\n📏 Tamanho: ${order.size}\n👤 Cliente: ${order.clientName}\n💰 Valor: R$ ${order.priceBrl?.toFixed(2)}\n✅ Status: ${order.status}\n\nObrigado pela preferência!`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const confirmDelete = (id: string) => {
    onDelete(id);
    setDeletingId(null);
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'Pendente': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'Enviado ao fornecedor': return <Truck className="w-4 h-4 text-indigo-500" />;
      case 'A caminho': return <Truck className="w-4 h-4 text-blue-500" />;
      case 'Recebido': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    }
  };

  const getStatusClass = (status: OrderStatus) => {
    switch (status) {
      case 'Pendente': return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/50';
      case 'Enviado ao fornecedor': return 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50';
      case 'A caminho': return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/50';
      case 'Recebido': return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Excluir Pedido?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmDelete(deletingId)}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-100 dark:shadow-none"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gerenciar Camisas</h2>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cliente ou camisa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
          >
            <option value="all">Todos Status</option>
            <option value="Pendente">Pendente</option>
            <option value="Enviado ao fornecedor">Enviado</option>
            <option value="A caminho">A caminho</option>
            <option value="Recebido">Recebido</option>
          </select>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Camisas</p>
          <p className="text-xl font-black text-slate-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total Geral</p>
          <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">R$ {stats.totalBrl.toFixed(2)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Total Pago</p>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">R$ {stats.paidBrl.toFixed(2)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">A Receber</p>
          <p className="text-xl font-black text-amber-600 dark:text-amber-400">R$ {stats.pendingBrl.toFixed(2)}</p>
        </div>
      </div>

      {/* Batch Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setSelectedBatchId('all')}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
            selectedBatchId === 'all' 
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none" 
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
          )}
        >
          Todos os Envios
        </button>
        <button
          onClick={() => setSelectedBatchId('none')}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2",
            selectedBatchId === 'none' 
              ? "bg-amber-500 text-white shadow-md shadow-amber-100 dark:shadow-none" 
              : "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-amber-100 dark:border-amber-900/50"
          )}
        >
          <Clock className="w-4 h-4" />
          Aguardando Envio
        </button>
        {batches.map(batch => (
          <button
            key={batch.id}
            onClick={() => setSelectedBatchId(batch.id)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
              selectedBatchId === batch.id 
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none" 
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
            )}
          >
            {batch.name}
          </button>
        ))}
      </div>

      {/* Orders Table/Grid */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors duration-300">
        {/* Mobile View: Cards */}
        <div className="lg:hidden divide-y divide-slate-50 dark:divide-slate-700">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <div key={order.id} className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-600">
                      {order.photoUrl ? (
                        <img src={order.photoUrl} alt={order.shirtName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Shirt className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{order.shirtName}</p>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{order.model} • {order.size}</p>
                      {!order.batchId && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-1">
                          <Clock className="w-3 h-3" />
                          AGUARDANDO ENVIO
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">R$ {(order.priceBrl || 0).toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">{format(order.date.toDate(), "dd/MM", { locale: ptBR })}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400">Cliente:</span>
                    <span className="font-medium text-slate-900 dark:text-white flex items-center gap-1">
                      {order.isStock && <Package className="w-3 h-3 text-indigo-500" />}
                      {order.clientName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      order.isPaid 
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" 
                        : (order.paidAmount || 0) > 0 
                          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                    )}>
                      {order.isPaid ? 'PAGO' : (order.paidAmount || 0) > 0 ? 'PARCIAL' : 'PENDENTE'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={order.status}
                    onChange={(e) => onUpdateStatus(order.id, e.target.value as OrderStatus)}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-xl text-xs font-semibold border outline-none cursor-pointer transition-all",
                      getStatusClass(order.status)
                    )}
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Enviado ao fornecedor">Enviado</option>
                    <option value="A caminho">A caminho</option>
                    <option value="Recebido">Recebido</option>
                  </select>
                  
                  <div className="flex gap-1">
                    <button 
                      onClick={() => shareOnWhatsApp(order)}
                      className="p-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onDuplicate(order)}
                      className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 dark:bg-slate-700 rounded-xl"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onEdit(order)}
                      className="p-2 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setDeletingId(order.id)}
                      className="p-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-700">
              <Clock className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Fila de Espera Vazia</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                {selectedBatchId === 'none' 
                  ? 'Você não tem camisas aguardando envio. Todas as camisas estão organizadas!' 
                  : 'Nenhuma camisa encontrada para este filtro.'}
              </p>
            </div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Camisa / Modelo</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tamanho</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Valores</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pagamento</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-600">
                          {order.photoUrl ? (
                            <img src={order.photoUrl} alt={order.shirtName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Shirt className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{order.shirtName}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{order.model}</p>
                            {!order.batchId && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                <Clock className="w-3 h-3" />
                                AGUARDANDO ENVIO
                              </span>
                            )}
                          </div>
                          {order.notes && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 italic line-clamp-1 max-w-[150px]" title={order.notes}>
                              {order.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                          {order.isStock && <Package className="w-3 h-3 text-indigo-500" />}
                          {order.clientName}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{format(order.date.toDate(), "dd/MM", { locale: ptBR })}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {order.size}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">R$ {(order.priceBrl || 0).toFixed(2)}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">$ {(order.priceUsd || 0).toFixed(2)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded",
                            order.isPaid 
                              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" 
                              : (order.paidAmount || 0) > 0 
                                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                          )}>
                            {order.isPaid ? 'PAGO' : (order.paidAmount || 0) > 0 ? 'PARCIAL' : 'PENDENTE'}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            R$ {(order.paidAmount || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all duration-500",
                              order.isPaid ? "bg-emerald-500" : "bg-amber-500"
                            )}
                            style={{ width: `${Math.min(100, ((order.paidAmount || 0) / (order.priceBrl || 1)) * 100)}%` }}
                          />
                        </div>
                        {!order.isPaid && (
                          <button
                            onClick={() => onUpdateStatus(order.id, { ...order, isPaid: true, paidAmount: order.priceBrl } as any)}
                            className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                          >
                            Quitar Total
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={order.status}
                        onChange={(e) => onUpdateStatus(order.id, e.target.value as OrderStatus)}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-semibold border outline-none cursor-pointer transition-all",
                          getStatusClass(order.status)
                        )}
                      >
                        <option value="Pendente">Pendente</option>
                        <option value="Enviado ao fornecedor">Enviado</option>
                        <option value="A caminho">A caminho</option>
                        <option value="Recebido">Recebido</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => shareOnWhatsApp(order)}
                          className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all"
                          title="Enviar p/ WhatsApp"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onDuplicate(order)}
                          className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                          title="Duplicar Pedido"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onEdit(order)}
                          className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                          title="Editar Pedido"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setDeletingId(order.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                          title="Excluir Pedido"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Clock className="w-12 h-12 text-slate-200 dark:text-slate-700" />
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Fila de Espera Vazia</h3>
                      <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                        {selectedBatchId === 'none' 
                          ? 'Você não tem camisas aguardando envio. Todas as camisas estão organizadas!' 
                          : 'Nenhuma camisa encontrada para este filtro.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Shirt(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
    </svg>
  );
}
