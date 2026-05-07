import React, { useState, useMemo } from 'react';
import { Order, Batch, OrderStatus } from '../types';
import {
  Search,
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
  DollarSign,
  Shirt
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Design tokens — Dark Theme — Firmo Sports
const COLORS = {
  bgGlobal:    '#0f1729',
  bgCard:      '#1a2540',
  bgHover:     '#222d45',
  bgActive:    '#3d4f7c',
  accent:      '#818cf8',
  accentPink:  '#f472b6',
  accentRed:   '#f87171',
  accentAmber: '#fbbf24',
  accentGreen: '#34d399',
  textPrimary: '#e2e8f0',
  textMuted:   '#94a3b8',
  border:      '#1e2d4a',
};

interface OrdersProps {
  orders: Order[];
  batches: Batch[];
  onEdit: (order: Order) => void;
  onDelete: (id: string) => void;
  onDuplicate: (order: Order) => void;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
}

// Status badge styles — dark tinted backgrounds
const getStatusBadge = (status: OrderStatus) => {
  switch (status) {
    case 'Pendente':
      return { background: '#1e1b4b', color: '#818cf8' };
    case 'Enviado ao fornecedor':
      return { background: '#2e1065', color: '#a78bfa' };
    case 'A caminho':
      return { background: '#500724', color: '#f472b6' };
    case 'Recebido':
      return { background: '#022c22', color: '#34d399' };
    default:
      return { background: '#450a0a', color: '#f87171' };
  }
};

export default function Orders({ orders, batches, onEdit, onDelete, onDuplicate, onUpdateStatus }: OrdersProps) {
  const [search, setSearch] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    return (orders || []).filter(order => {
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
    const message = `Olá! Confirmando seu pedido:\n\n👕 *${order?.shirtName || '-'}*\n📏 Tamanho: ${order?.size || '-'}\n👤 Cliente: ${order?.clientName || '-'}\n💰 Valor: R$ ${(order?.priceBrl || 0).toFixed(2)}\n✅ Status: ${order?.status || '-'}\n\nObrigado pela preferência!`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const confirmDelete = (id: string) => {
    onDelete(id);
    setDeletingId(null);
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'Pendente': return <Clock className="w-4 h-4" style={{ color: COLORS.accentAmber }} />;
      case 'Enviado ao fornecedor': return <Truck className="w-4 h-4" style={{ color: COLORS.accent }} />;
      case 'A caminho': return <Truck className="w-4 h-4" style={{ color: '#60a5fa' }} />;
      case 'Recebido': return <CheckCircle2 className="w-4 h-4" style={{ color: COLORS.accentGreen }} />;
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
    <div className="space-y-6 page-enter">
      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scale-in"
            style={{
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '16px',
              padding: '32px',
            }}
          >
            <h3 className="text-lg font-bold mb-2" style={{ color: COLORS.textPrimary }}>Excluir Pedido?</h3>
            <p className="text-sm mb-6" style={{ color: COLORS.textMuted }}>
              Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 px-4 py-2 font-bold rounded-xl btn-press"
                style={{
                  background: 'transparent',
                  color: COLORS.textMuted,
                  border: `1px solid ${COLORS.border}`,
                  transition: 'color 200ms ease, background-color 200ms ease, transform 160ms ease',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmDelete(deletingId)}
                className="flex-1 px-4 py-2 text-white font-bold rounded-xl btn-press"
                style={{
                  background: '#dc2626',
                  transition: 'background-color 200ms ease, transform 160ms ease',
                }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <h2 className="text-2xl font-bold" style={{ color: COLORS.textPrimary }}>Gerenciar Camisas</h2>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: COLORS.textMuted }} />
            <input
              type="text"
              placeholder="Buscar cliente ou camisa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl text-sm outline-none input-focus"
              style={{
                background: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                color: COLORS.textPrimary,
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-xl text-sm outline-none input-focus"
            style={{
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              color: COLORS.textPrimary,
            }}
          >
            <option value="all">Todos Status</option>
            <option value="Pendente">Pendente</option>
            <option value="Enviado ao fornecedor">Enviado</option>
            <option value="A caminho">A caminho</option>
            <option value="Recebido">Recebido</option>
          </select>
        </div>
      </div>

      {/* Quick Stats Bar — stagger entrance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
        {[
          { label: 'Camisas', value: stats.total, color: COLORS.textPrimary },
          { label: 'Total Geral', value: `R$ ${stats.totalBrl.toFixed(2)}`, color: COLORS.accent },
          { label: 'Total Pago', value: `R$ ${stats.paidBrl.toFixed(2)}`, color: COLORS.accentGreen },
          { label: 'A Receber', value: `R$ ${stats.pendingBrl.toFixed(2)}`, color: COLORS.accentAmber },
        ].map((s, i) => (
          <div
            key={i}
            className="p-4 rounded-xl card-hover cursor-default"
            style={{
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: COLORS.textMuted }}>{s.label}</p>
            <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Batch Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setSelectedBatchId('all')}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
          )}
          style={{
            background: selectedBatchId === 'all' ? COLORS.accent : COLORS.bgCard,
            color: selectedBatchId === 'all' ? '#fff' : COLORS.textMuted,
            border: `1px solid ${selectedBatchId === 'all' ? COLORS.accent : COLORS.border}`,
          }}
        >
          Todos os Envios
        </button>
        <button
          onClick={() => setSelectedBatchId('none')}
          className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2"
          style={{
            background: selectedBatchId === 'none' ? COLORS.accentAmber : COLORS.bgCard,
            color: selectedBatchId === 'none' ? '#fff' : COLORS.accentAmber,
            border: `1px solid ${selectedBatchId === 'none' ? COLORS.accentAmber : COLORS.border}`,
          }}
        >
          <Clock className="w-4 h-4" />
          Aguardando Envio
        </button>
        {batches.map(batch => (
          <button
            key={batch.id}
            onClick={() => setSelectedBatchId(batch.id)}
            className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all"
            style={{
              background: selectedBatchId === batch.id ? COLORS.accent : COLORS.bgCard,
              color: selectedBatchId === batch.id ? '#fff' : COLORS.textMuted,
              border: `1px solid ${selectedBatchId === batch.id ? COLORS.accent : COLORS.border}`,
            }}
          >
            {batch.name}
          </button>
        ))}
      </div>

      {/* Orders Table/Grid */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: COLORS.bgCard,
          border: `1px solid ${COLORS.border}`,
        }}
      >
        {/* Mobile View: Cards */}
        <div className="lg:hidden divide-y" style={{ borderColor: COLORS.border }}>
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <div key={order.id} className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden"
                      style={{
                        background: COLORS.bgHover,
                        border: `1px solid ${COLORS.border}`,
                      }}
                    >
                      {order.photoUrl ? (
                        <img src={order.photoUrl} alt={order.shirtName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Shirt className="w-6 h-6" style={{ color: COLORS.textMuted }} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: COLORS.textPrimary }}>{order.shirtName}</p>
                      <p className="text-xs font-medium" style={{ color: COLORS.accent }}>{order.model} • {order.size}</p>
                      {!order.batchId && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold mt-1" style={{ color: COLORS.accentAmber }}>
                          <Clock className="w-3 h-3" />
                          AGUARDANDO ENVIO
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <p className="text-sm font-black" style={{ color: COLORS.accentGreen }}>R$ {(order.priceBrl || 0).toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span style={{ color: COLORS.textMuted }}>Cliente:</span>
                    <span className="font-medium flex items-center gap-1" style={{ color: COLORS.textPrimary }}>
                      {order.isStock && <Package className="w-3 h-3" style={{ color: COLORS.accent }} />}
                      {order.clientName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        background: order.isPaid ? '#022c22' : (order.paidAmount || 0) > 0 ? '#451a03' : '#450a0a',
                        color: order.isPaid ? '#34d399' : (order.paidAmount || 0) > 0 ? '#fbbf24' : '#f87171',
                        borderRadius: '999px',
                        padding: '2px 10px',
                        fontSize: '11px',
                        fontWeight: 500,
                      }}
                    >
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
                      className="p-2 rounded-xl icon-btn"
                      style={{ color: COLORS.accentGreen, background: '#022c22' }}
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDuplicate(order)}
                      className="p-2 rounded-xl icon-btn"
                      style={{ color: COLORS.textMuted, background: COLORS.bgHover }}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEdit(order)}
                      className="p-2 rounded-xl icon-btn"
                      style={{ color: COLORS.accent, background: '#1e1b4b' }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(order.id)}
                      className="p-2 rounded-xl icon-btn"
                      style={{ color: COLORS.accentRed, background: '#450a0a' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center" style={{ padding: '48px' }}>
              <Package className="w-12 h-12 mx-auto mb-4" style={{ color: COLORS.bgActive }} />
              <h3 className="text-lg font-bold" style={{ color: COLORS.textPrimary }}>Fila de Espera Vazia</h3>
              <p className="max-w-xs mx-auto mt-2" style={{ color: COLORS.textMuted }}>
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
              <tr style={{ background: COLORS.bgGlobal, borderBottom: `1px solid ${COLORS.border}` }}>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.textMuted }}>Camisa / Modelo</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.textMuted }}>Cliente</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.textMuted }}>Tamanho</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.textMuted }}>Valores</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.textMuted }}>Pagamento</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.textMuted }}>Status</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: COLORS.textMuted }}>Ações</th>
              </tr>
            </thead>
            <tbody style={{ borderColor: COLORS.border }}>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="row-hover group"
                    style={{ borderBottom: `1px solid ${COLORS.border}` }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.bgHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden"
                          style={{
                            background: COLORS.bgHover,
                            border: `1px solid ${COLORS.border}`,
                          }}
                        >
                          {order.photoUrl ? (
                            <img src={order.photoUrl} alt={order.shirtName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Shirt className="w-6 h-6" style={{ color: COLORS.textMuted }} />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: COLORS.textPrimary }}>{order.shirtName}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium" style={{ color: COLORS.accent }}>{order.model}</p>
                            {!order.batchId && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: COLORS.accentAmber }}>
                                <Clock className="w-3 h-3" />
                                AGUARDANDO ENVIO
                              </span>
                            )}
                          </div>
                          {order.notes && (
                            <p
                              className="text-[10px] mt-1 italic line-clamp-1 max-w-[150px]"
                              style={{ color: COLORS.textMuted }}
                              title={order.notes}
                            >
                              {order.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <p className="text-sm font-medium flex items-center gap-2" style={{ color: COLORS.textPrimary }}>
                          {order.isStock && <Package className="w-3 h-3" style={{ color: COLORS.accent }} />}
                          {order.clientName}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: COLORS.bgHover, color: COLORS.textMuted }}
                      >
                        {order.size}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold" style={{ color: COLORS.accentGreen }}>R$ {(order.priceBrl || 0).toFixed(2)}</p>
                        <p className="text-[10px]" style={{ color: COLORS.textMuted }}>$ {(order.priceUsd || 0).toFixed(2)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            style={{
                              background: order.isPaid ? '#022c22' : (order.paidAmount || 0) > 0 ? '#451a03' : '#450a0a',
                              color: order.isPaid ? '#34d399' : (order.paidAmount || 0) > 0 ? '#fbbf24' : '#f87171',
                              borderRadius: '999px',
                              padding: '2px 10px',
                              fontSize: '11px',
                              fontWeight: 500,
                            }}
                          >
                            {order.isPaid ? 'PAGO' : (order.paidAmount || 0) > 0 ? 'PARCIAL' : 'PENDENTE'}
                          </span>
                          <span className="text-[10px] font-medium" style={{ color: COLORS.textMuted }}>
                            R$ {(order.paidAmount || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: COLORS.bgHover }}>
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, ((order.paidAmount || 0) / (order.priceBrl || 1)) * 100)}%`,
                              background: order.isPaid ? COLORS.accentGreen : COLORS.accentAmber,
                            }}
                          />
                        </div>
                        {!order.isPaid && (
                          <button
                            onClick={() => onUpdateStatus(order.id, { ...order, isPaid: true, paidAmount: order.priceBrl } as any)}
                            className="text-[10px] font-bold hover:underline"
                            style={{ color: COLORS.accent }}
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
                          className="p-2 rounded-lg icon-btn"
                          style={{ color: COLORS.accentGreen }}
                          title="Enviar p/ WhatsApp"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDuplicate(order)}
                          className="p-2 rounded-lg icon-btn"
                          style={{ color: COLORS.textMuted }}
                          title="Duplicar Pedido"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEdit(order)}
                          className="p-2 rounded-lg icon-btn"
                          style={{ color: COLORS.accent }}
                          title="Editar Pedido"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(order.id)}
                          className="p-2 rounded-lg icon-btn"
                          style={{ color: COLORS.accentRed }}
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
                      <Package className="w-12 h-12" style={{ color: COLORS.bgActive }} />
                      <h3 className="text-lg font-bold" style={{ color: COLORS.textPrimary }}>Fila de Espera Vazia</h3>
                      <p className="max-w-xs mx-auto" style={{ color: COLORS.textMuted }}>
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
