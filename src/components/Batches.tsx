import React, { useState } from 'react';
import { Batch, BatchStatus, Order } from '../types';
import {
  Plus,
  Layers,
  Calendar,
  CheckCircle2,
  Clock,
  Send,
  Trash2,
  DollarSign,
  TrendingUp,
  Wallet,
  Copy,
  ClipboardList,
  Edit2,
  ExternalLink,
  Shirt,
  CheckSquare,
  Square
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
  bgGlobal: '#0f1729',
  bgCard: '#1a2540',
  bgHover: '#222d45',
  bgActive: '#3d4f7c',
  accent: '#818cf8',
  accentPink: '#f472b6',
  accentRed: '#f87171',
  accentAmber: '#fbbf24',
  accentGreen: '#34d399',
  textPrimary: '#e2e8f0',
  textMuted: '#94a3b8',
  border: '#1e2d4a',
};

interface BatchesProps {
  batches: Batch[];
  orders: Order[];
  onCreate: (name: string, dollarRate: number, date: Date, selectedOrderIds: string[]) => Promise<void>;
  onUpdateStatus: (id: string, status: BatchStatus) => void;
  onUpdateTax: (id: string, tax: number) => void;
  onDelete: (id: string) => void;
  onDuplicate: (batch: Batch) => void;
  onUpdateBatch: (id: string, data: Partial<Batch>) => Promise<void>;
}

export default function Batches({ batches, orders, onCreate, onUpdateStatus, onUpdateTax, onDelete, onDuplicate, onUpdateBatch }: BatchesProps) {
  const [newBatchName, setNewBatchName] = useState('');
  const [dollarRate, setDollarRate] = useState('5.00');
  const [batchDate, setBatchDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [trackingCode, setTrackingCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  const availableOrders = (orders || []).filter(o => !o?.batchId);

  const toggleOrder = (orderId: string) => {
    setSelectedOrderIds(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const toggleAll = () => {
    if (selectedOrderIds.length === availableOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(availableOrders.map(o => o.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const finalDate = new Date(batchDate + 'T12:00:00');
    const finalName = newBatchName.trim() || `Envio ${format(finalDate, 'dd/MM/yyyy')}`;

    try {
      setIsSaving(true);
      if (editingBatch) {
        await onUpdateBatch(editingBatch.id, {
          name: finalName,
          dollarRate: parseFloat(dollarRate) || 0,
          trackingCode: trackingCode.trim(),
          date: finalDate as any
        });
        setEditingBatch(null);
      } else {
        await onCreate(finalName, parseFloat(dollarRate) || 0, finalDate, selectedOrderIds);
      }
      setNewBatchName('');
      setDollarRate('5.00');
      setBatchDate(format(new Date(), 'yyyy-MM-dd'));
      setTrackingCode('');
      setSelectedOrderIds([]);
      setIsCreating(false);
    } catch (error) {
      console.error('Error saving batch:', error);
      alert('Erro ao salvar o envio. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (batch: Batch) => {
    setEditingBatch(batch);
    setNewBatchName(batch?.name || '');
    setDollarRate(batch?.dollarRate?.toString() || '5.00');
    setTrackingCode(batch?.trackingCode || '');
    try {
      setBatchDate(batch?.date?.toDate ? format(batch.date.toDate(), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    } catch {
      setBatchDate(format(new Date(), 'yyyy-MM-dd'));
    }
    setIsCreating(true);
  };

  const confirmDelete = (id: string) => {
    onDelete(id);
    setDeletingId(null);
  };

  const copyBatchSummary = (batch: Batch) => {
    const safeOrders = orders || [];
    const batchOrders = safeOrders.filter(o => o?.batchId === batch?.id);
    if (batchOrders.length === 0) {
      alert('Este envio não possui camisas.');
      return;
    }

    const dateStr = batch?.date?.toDate
      ? format(batch.date.toDate(), "dd/MM/yyyy")
      : '-';

    let summary = `📦 *Envio: ${batch?.name || '-'}*\n`;
    summary += `📅 Data: ${dateStr}\n`;
    summary += `-------------------\n\n`;

    batchOrders.forEach((order, index) => {
      summary += `${index + 1}. *${order?.shirtName || '-'}*\n`;
      summary += `   📏 Tam: ${order?.size || '-'} | Mod: ${order?.model || '-'}\n`;
      if (order?.personalization) {
        summary += `   ✍️ Personalização: ${order.personalization}\n`;
      }
      summary += `\n`;
    });

    summary += `-------------------\n`;
    summary += `Total de itens: ${batchOrders.length}`;

    navigator.clipboard.writeText(summary).then(() => {
      alert('Resumo do envio copiado para a área de transferência!');
    });
  };

  const getStatusIcon = (status: BatchStatus) => {
    switch (status) {
      case 'Aberto': return <Clock className="w-5 h-5" style={{ color: COLORS.accent }} />;
      case 'Enviado': return <Send className="w-5 h-5" style={{ color: COLORS.accentAmber }} />;
      case 'Finalizado': return <CheckCircle2 className="w-5 h-5" style={{ color: COLORS.accentGreen }} />;
    }
  };

  const calculateBatchFinancials = (batch: Batch) => {
    const safeOrders = orders || [];
    const batchOrders = safeOrders.filter(o => o?.batchId === batch?.id);
    const totalCostUsd = batchOrders.reduce((acc, o) => acc + (o?.priceUsd || 0), 0);
    const totalSalesBrl = batchOrders.reduce((acc, o) => acc + (o?.priceBrl || 0), 0);

    const rate = batch?.dollarRate || 0;
    const tax = batch?.taxAmount || 0;

    const totalCostBrl = (totalCostUsd * rate) + tax;
    const profit = totalSalesBrl - totalCostBrl;

    return {
      totalCostBrl,
      totalSalesBrl,
      profit,
      orderCount: batchOrders.length
    };
  };

  return (
    <div className="space-y-8 page-enter">
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
            <h3 className="text-lg font-bold mb-2" style={{ color: COLORS.textPrimary }}>Excluir Envio?</h3>
            <p className="text-sm mb-6" style={{ color: COLORS.textMuted }}>
              Tem certeza que deseja excluir este envio? As camisas vinculadas não serão excluídas, mas ficarão sem envio.
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold" style={{ color: COLORS.textPrimary }}>Gerenciar Envios</h2>
          <p className="text-xs md:text-sm" style={{ color: COLORS.textMuted }}>Organize suas camisas e gerencie taxas de importação.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 sm:py-2 rounded-xl font-semibold btn-press"
          style={{
            background: COLORS.accent,
            color: '#fff',
            transition: 'background-color 200ms ease, transform 160ms ease',
          }}
        >
          <Plus className="w-5 h-5" />
          Novo Envio
        </button>
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <div
          className="p-6 rounded-2xl animate-in zoom-in-95 duration-200"
          style={{
            background: COLORS.bgCard,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold block" style={{ color: COLORS.textMuted, fontSize: '13px', marginBottom: '6px' }}>Data do Envio</label>
                <input
                  type="date"
                  required
                  value={batchDate}
                  onChange={(e) => setBatchDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl outline-none input-focus"
                  style={{
                    background: COLORS.bgGlobal,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.textPrimary,
                    borderRadius: '8px',
                    padding: '10px 14px',
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold block" style={{ color: COLORS.textMuted, fontSize: '13px', marginBottom: '6px' }}>Nome (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Breno"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl outline-none input-focus"
                  style={{
                    background: COLORS.bgGlobal,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.textPrimary,
                    borderRadius: '8px',
                    padding: '10px 14px',
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold block" style={{ color: COLORS.textMuted, fontSize: '13px', marginBottom: '6px' }}>Dólar (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="5.00"
                  value={dollarRate}
                  onChange={(e) => setDollarRate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl outline-none input-focus"
                  style={{
                    background: COLORS.bgGlobal,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.textPrimary,
                    borderRadius: '8px',
                    padding: '10px 14px',
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold block" style={{ color: COLORS.textMuted, fontSize: '13px', marginBottom: '6px' }}>Rastreio</label>
                <input
                  type="text"
                  placeholder="Código"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl outline-none input-focus"
                  style={{
                    background: COLORS.bgGlobal,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.textPrimary,
                    borderRadius: '8px',
                    padding: '10px 14px',
                  }}
                />
              </div>
            </div>

            {/* Order Selection */}
            {!editingBatch && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Shirt className="w-4 h-4" style={{ color: COLORS.accent }} />
                  <span className="text-sm font-semibold" style={{ color: COLORS.textPrimary }}>
                    Adicionar camisas ao envio
                  </span>
                </div>
                {availableOrders.length === 0 ? (
                  <p className="text-sm py-3 px-4 rounded-xl" style={{ color: COLORS.textMuted, background: COLORS.bgGlobal, border: `1px solid ${COLORS.border}` }}>
                    Todas camisas já vinculadas a envios.
                  </p>
                ) : (
                  <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
                    <button
                      type="button"
                      onClick={toggleAll}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors"
                      style={{
                        background: COLORS.bgHover,
                        color: COLORS.textPrimary,
                        borderBottom: `1px solid ${COLORS.border}`,
                      }}
                    >
                      {selectedOrderIds.length === availableOrders.length && availableOrders.length > 0
                        ? <CheckSquare className="w-4 h-4" style={{ color: COLORS.accent }} />
                        : <Square className="w-4 h-4" style={{ color: COLORS.textMuted }} />
                      }
                      Selecionar todas ({availableOrders.length} disponíveis)
                    </button>
                    <div className="max-h-64 overflow-y-auto">
                      {availableOrders.map(order => {
                        const isSelected = selectedOrderIds.includes(order.id);
                        return (
                          <button
                            key={order.id}
                            type="button"
                            onClick={() => toggleOrder(order.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                            style={{
                              background: isSelected ? COLORS.bgActive : 'transparent',
                              borderBottom: `1px solid ${COLORS.border}`,
                              color: COLORS.textPrimary,
                            }}
                          >
                            {isSelected
                              ? <CheckSquare className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.accent }} />
                              : <Square className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.textMuted }} />
                            }
                            <span className="flex-1 text-left truncate">
                              <span className="font-medium">{order?.shirtName || '-'}</span>
                              {order?.model ? <span style={{ color: COLORS.textMuted }}> {order.model}</span> : null}
                            </span>
                            <span className="flex-shrink-0" style={{ color: COLORS.textMuted }}>{order?.clientName || '-'}</span>
                            <span className="flex-shrink-0 font-mono text-xs px-2 py-0.5 rounded" style={{ background: COLORS.bgGlobal, color: COLORS.textMuted }}>{order?.size || '-'}</span>
                            <span className="flex-shrink-0 font-mono text-xs" style={{ color: COLORS.accentGreen }}>
                              R$ {order?.priceBrl?.toFixed(2) || '0.00'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {selectedOrderIds.length > 0 && (
                      <div className="px-4 py-2 text-xs font-semibold" style={{ background: COLORS.bgHover, color: COLORS.accent, borderTop: `1px solid ${COLORS.border}` }}>
                        {selectedOrderIds.length} camisa{selectedOrderIds.length > 1 ? 's' : ''} selecionada{selectedOrderIds.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingBatch(null);
                  setNewBatchName('');
                  setDollarRate('5.00');
                  setTrackingCode('');
                  setBatchDate(format(new Date(), 'yyyy-MM-dd'));
                  setSelectedOrderIds([]);
                }}
                className="flex-1 px-6 py-3 font-bold rounded-xl btn-press"
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
                type="submit"
                disabled={isSaving}
                className="flex-1 px-6 py-3 text-white font-bold rounded-xl btn-press flex items-center justify-center gap-2"
                style={{
                  background: COLORS.accent,
                  transition: 'background-color 200ms ease, transform 160ms ease',
                }}
              >
                {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isSaving ? 'Salvando...' : editingBatch ? 'Salvar Alterações' : 'Criar Envio'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Batch Cards Grid — stagger entrance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
        {(batches || []).length > 0 ? (
          (batches || []).map((batch) => {
            if (!batch || !batch.id) return null;
            const financials = calculateBatchFinancials(batch);
            return (
              <div
                key={batch.id}
                className="p-6 rounded-2xl card-hover group relative flex flex-col"
                style={{
                  background: COLORS.bgCard,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '12px',
                }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div
                    className="p-3 rounded-xl transition-colors"
                    style={{ background: COLORS.bgHover }}
                  >
                    {getStatusIcon(batch?.status)}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEditing(batch)}
                      className="p-2 rounded-lg icon-btn"
                      style={{ color: COLORS.textMuted }}
                      title="Editar Envio"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => copyBatchSummary(batch)}
                      className="p-2 rounded-lg icon-btn"
                      style={{ color: COLORS.textMuted }}
                      title="Copiar Resumo p/ Fornecedor"
                    >
                      <ClipboardList className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDuplicate(batch)}
                      className="p-2 rounded-lg icon-btn"
                      style={{ color: COLORS.textMuted }}
                      title="Duplicar Envio"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(batch.id)}
                      className="p-2 rounded-lg icon-btn"
                      style={{ color: COLORS.textMuted }}
                      title="Excluir Envio"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold mb-1" style={{ color: COLORS.textPrimary }}>{batch?.name || '-'}</h3>
                <div className="flex items-center gap-2 text-sm mb-4" style={{ color: COLORS.textMuted }}>
                  <Calendar className="w-4 h-4" />
                  {batch?.date?.toDate ? format(batch.date.toDate(), "dd 'de' MMMM, yyyy", { locale: ptBR }) : '-'}
                </div>

                {batch?.trackingCode && (
                  <div
                    className="mb-4 p-3 rounded-xl flex items-center justify-between"
                    style={{
                      background: '#1e1b4b',
                      border: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Send className="w-4 h-4 shrink-0" style={{ color: COLORS.accent }} />
                      <span className="text-xs font-bold truncate" style={{ color: COLORS.textPrimary }}>{batch.trackingCode}</span>
                    </div>
                    <a
                      href={`https://t.17track.net/pt#nums=${batch.trackingCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg transition-all"
                      style={{ color: COLORS.accent }}
                      title="Rastrear nos Correios"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="p-3 rounded-xl" style={{ background: COLORS.bgHover }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: COLORS.textMuted }}>Custo Total</p>
                    <p className="text-sm font-bold" style={{ color: COLORS.textPrimary }}>R$ {financials.totalCostBrl.toFixed(2)}</p>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: COLORS.bgHover }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: COLORS.textMuted }}>Vendas</p>
                    <p className="text-sm font-bold" style={{ color: COLORS.textPrimary }}>R$ {financials.totalSalesBrl.toFixed(2)}</p>
                  </div>
                  <div
                    className="p-3 rounded-xl col-span-2 flex items-center justify-between"
                    style={{
                      background: financials.profit >= 0 ? '#022c22' : '#450a0a',
                    }}
                  >
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: COLORS.textMuted }}>Lucro Estimado</p>
                      <p
                        className="text-lg font-black"
                        style={{ color: financials.profit >= 0 ? COLORS.accentGreen : COLORS.accentRed }}
                      >
                        R$ {financials.profit.toFixed(2)}
                      </p>
                    </div>
                    <div
                      className="p-2 rounded-lg"
                      style={{
                        background: financials.profit >= 0 ? '#065f46' : '#7f1d1d',
                        color: financials.profit >= 0 ? COLORS.accentGreen : COLORS.accentRed,
                      }}
                    >
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="mb-6 p-4 rounded-xl space-y-2" style={{ background: COLORS.bgHover }}>
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-wider" style={{ color: COLORS.textMuted }}>Taxa do Envio (R$)</label>
                    <span className="text-[10px] font-medium" style={{ color: COLORS.textMuted }}>Dólar: R$ {batch.dollarRate?.toFixed(2) || '0.00'}</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={batch.taxAmount || ''}
                    onChange={(e) => onUpdateTax(batch.id, parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{
                      background: COLORS.bgGlobal,
                      border: `1px solid ${COLORS.border}`,
                      color: COLORS.textPrimary,
                    }}
                  />
                </div>

                {/* Shirt thumbnails */}
                {(() => {
                  const batchOrders = (orders || []).filter(o => o?.batchId === batch?.id);
                  if (batchOrders.length === 0) return null;
                  const visible = batchOrders.slice(0, 8);
                  const remaining = batchOrders.length - 8;
                  return (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
                        Camisas no envio ({batchOrders.length})
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {visible.map(order => (
                          <div key={order.id} className="space-y-1">
                            {order?.photoUrl ? (
                              <img
                                src={order.photoUrl}
                                alt={order?.shirtName || ''}
                                className="w-full h-14 object-cover rounded-lg"
                                style={{ border: `1px solid ${COLORS.border}` }}
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div
                                className="w-full h-14 rounded-lg flex items-center justify-center"
                                style={{ background: COLORS.bgHover, border: `1px solid ${COLORS.border}` }}
                              >
                                <Shirt className="w-5 h-5" style={{ color: COLORS.textMuted }} />
                              </div>
                            )}
                            <p className="text-[9px] truncate text-center" style={{ color: COLORS.textMuted }}>{order?.clientName || '-'}</p>
                          </div>
                        ))}
                        {remaining > 0 && (
                          <div
                            className="h-14 rounded-lg flex items-center justify-center"
                            style={{ background: COLORS.bgHover, border: `1px solid ${COLORS.border}` }}
                          >
                            <span className="text-xs font-bold" style={{ color: COLORS.accent }}>+{remaining}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="mt-auto space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.textMuted }}>Mudar Status</p>
                  <div className="flex gap-2">
                    {(['Aberto', 'Enviado', 'Finalizado'] as BatchStatus[]).map((status) => (
                      <button
                        key={status}
                        onClick={() => batch?.id && onUpdateStatus(batch.id, status)}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border",
                        )}
                        style={{
                          background: batch?.status === status ? COLORS.accent : 'transparent',
                          color: batch?.status === status ? '#fff' : COLORS.textMuted,
                          borderColor: batch?.status === status ? COLORS.accent : COLORS.border,
                        }}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div
            className="col-span-full py-20 text-center rounded-3xl animate-fade-in"
            style={{
              background: COLORS.bgCard,
              border: `2px dashed ${COLORS.border}`,
              padding: '48px',
            }}
          >
            <Layers className="w-12 h-12 mx-auto mb-4" style={{ color: COLORS.bgActive }} />
            <h3 className="text-lg font-bold" style={{ color: COLORS.textPrimary }}>Nenhum envio criado</h3>
            <p style={{ color: COLORS.textMuted }}>Crie seu primeiro envio para começar a organizar as camisas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
