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
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BatchesProps {
  batches: Batch[];
  orders: Order[];
  onCreate: (name: string, dollarRate: number, date: Date) => Promise<void>;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const finalDate = new Date(batchDate + 'T12:00:00'); // Use noon to avoid timezone shifts
    const finalName = newBatchName.trim() || `Envio ${format(finalDate, 'dd/MM/yyyy')}`;

    try {
      setIsSaving(true);
      if (editingBatch) {
        await onUpdateBatch(editingBatch.id, {
          name: finalName,
          dollarRate: parseFloat(dollarRate) || 0,
          trackingCode: trackingCode.trim(),
          date: finalDate as any // App.tsx will handle conversion if needed, but Firestore accepts Date
        });
        setEditingBatch(null);
      } else {
        await onCreate(finalName, parseFloat(dollarRate) || 0, finalDate);
      }
      setNewBatchName('');
      setDollarRate('5.00');
      setBatchDate(format(new Date(), 'yyyy-MM-dd'));
      setTrackingCode('');
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
    setNewBatchName(batch.name);
    setDollarRate(batch.dollarRate?.toString() || '5.00');
    setTrackingCode(batch.trackingCode || '');
    setBatchDate(format(batch.date.toDate(), 'yyyy-MM-dd'));
    setIsCreating(true);
  };

  const confirmDelete = (id: string) => {
    onDelete(id);
    setDeletingId(null);
  };

  const copyBatchSummary = (batch: Batch) => {
    const batchOrders = orders.filter(o => o.batchId === batch.id);
    if (batchOrders.length === 0) {
      alert('Este envio não possui camisas.');
      return;
    }

    let summary = `📦 *Envio: ${batch.name}*\n`;
    summary += `📅 Data: ${format(batch.date.toDate(), "dd/MM/yyyy")}\n`;
    summary += `-------------------\n\n`;

    batchOrders.forEach((order, index) => {
      summary += `${index + 1}. *${order.shirtName}*\n`;
      summary += `   📏 Tam: ${order.size} | Mod: ${order.model}\n`;
      if (order.personalization) {
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
      case 'Aberto': return <Clock className="w-5 h-5 text-indigo-500" />;
      case 'Enviado': return <Send className="w-5 h-5 text-amber-500" />;
      case 'Finalizado': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    }
  };

  const calculateBatchFinancials = (batch: Batch) => {
    const batchOrders = orders.filter(o => o.batchId === batch.id);
    const totalCostUsd = batchOrders.reduce((acc, o) => acc + (o.priceUsd || 0), 0);
    const totalSalesBrl = batchOrders.reduce((acc, o) => acc + (o.priceBrl || 0), 0);
    
    const rate = batch.dollarRate || 0;
    const tax = batch.taxAmount || 0;
    
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Excluir Envio?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Tem certeza que deseja excluir este envio? As camisas vinculadas não serão excluídas, mas ficarão sem envio.
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">Gerenciar Envios</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">Organize suas camisas e gerencie taxas de importação.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 sm:py-2 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
        >
          <Plus className="w-5 h-5" />
          Novo Envio
        </button>
      </div>

      {isCreating && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 border-indigo-100 dark:border-indigo-900/50 shadow-sm animate-in zoom-in-95 duration-200">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Data do Envio</label>
                <input
                  type="date"
                  required
                  value={batchDate}
                  onChange={(e) => setBatchDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nome (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Breno"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Dólar (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="5.00"
                  value={dollarRate}
                  onChange={(e) => setDollarRate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Rastreio</label>
                <input
                  type="text"
                  placeholder="Código"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                />
              </div>
            </div>
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
                }}
                className="flex-1 px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md flex items-center justify-center gap-2"
              >
                {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isSaving ? 'Salvando...' : editingBatch ? 'Salvar Alterações' : 'Criar Envio'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {batches.length > 0 ? (
          batches.map((batch) => {
            const financials = calculateBatchFinancials(batch);
            return (
              <div key={batch.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all group relative flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-xl group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                    {getStatusIcon(batch.status)}
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => startEditing(batch)}
                      className="p-2 text-slate-300 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                      title="Editar Envio"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => copyBatchSummary(batch)}
                      className="p-2 text-slate-300 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                      title="Copiar Resumo p/ Fornecedor"
                    >
                      <ClipboardList className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onDuplicate(batch)}
                      className="p-2 text-slate-300 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                      title="Duplicar Envio"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setDeletingId(batch.id)}
                      className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      title="Excluir Envio"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{batch.name}</h3>
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-4">
                  <Calendar className="w-4 h-4" />
                  {format(batch.date.toDate(), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                </div>

                {batch.trackingCode && (
                  <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl flex items-center justify-between group/tracking">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Send className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-100 truncate">{batch.trackingCode}</span>
                    </div>
                    <a 
                      href={`https://www.linkcorreios.com.br/${batch.trackingCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-all"
                      title="Rastrear nos Correios"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Custo Total</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">R$ {financials.totalCostBrl.toFixed(2)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Vendas</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">R$ {financials.totalSalesBrl.toFixed(2)}</p>
                  </div>
                  <div className={cn(
                    "p-3 rounded-xl col-span-2 flex items-center justify-between",
                    financials.profit >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-red-50 dark:bg-red-900/20"
                  )}>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Lucro Estimado</p>
                      <p className={cn(
                        "text-lg font-black",
                        financials.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                      )}>
                        R$ {financials.profit.toFixed(2)}
                      </p>
                    </div>
                    <div className={cn(
                      "p-2 rounded-lg",
                      financials.profit >= 0 ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400" : "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
                    )}>
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Taxa do Envio (R$)</label>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Dólar: R$ {batch.dollarRate?.toFixed(2) || '0.00'}</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={batch.taxAmount || ''}
                    onChange={(e) => onUpdateTax(batch.id, parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="mt-auto space-y-3">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Mudar Status</p>
                  <div className="flex gap-2">
                    {(['Aberto', 'Enviado', 'Finalizado'] as BatchStatus[]).map((status) => (
                      <button
                        key={status}
                        onClick={() => onUpdateStatus(batch.id, status)}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border",
                          batch.status === status
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                        )}
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
          <div className="col-span-full py-20 text-center bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <Layers className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nenhum envio criado</h3>
            <p className="text-slate-500 dark:text-slate-400">Crie seu primeiro envio para começar a organizar as camisas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
