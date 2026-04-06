import React, { useState, useEffect } from 'react';
import { Order, Batch, OrderStatus } from '../types';
import { 
  X, 
  Shirt, 
  User, 
  Maximize, 
  Type, 
  Image as ImageIcon, 
  Save, 
  AlertCircle,
  Plus,
  Clock,
  FileText,
  DollarSign,
  Package,
  Upload,
  Loader2
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NewOrderFormProps {
  batches: Batch[];
  orders: Order[];
  onSave: (order: Partial<Order>) => Promise<void>;
  onCancel: () => void;
  editingOrder?: Order | null;
}

const MODELS = {
  'Masculino': ['P', 'M', 'G', 'GG', '2GG', '3GG'],
  'Feminino': ['P', 'M', 'G', 'GG', '2GG'],
  'Infantil': ['14', '16', '18', '20', '22', '24', '26', '28'],
  'Jogador': ['P', 'M', 'G', 'GG', '2GG', '3GG'],
  'Retrô': ['P', 'M', 'G', 'GG', '2GG', '3GG']
};

export default function NewOrderForm({ batches, orders, onSave, onCancel, editingOrder }: NewOrderFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<Partial<Order>>({
    shirtName: '',
    model: 'Masculino',
    size: 'M',
    personalization: '',
    clientName: '',
    photoUrl: '',
    status: 'Pendente',
    batchId: '',
    priceUsd: 0,
    priceBrl: 0,
    isPaid: false,
    paidAmount: 0,
    isStock: false,
    notes: ''
  });

  const shirtSuggestions = React.useMemo(() => {
    const names = orders.map(o => o.shirtName).filter(Boolean);
    return Array.from(new Set(names));
  }, [orders]);

  const clientSuggestions = React.useMemo(() => {
    const names = orders.map(o => o.clientName).filter(Boolean);
    return Array.from(new Set(names));
  }, [orders]);

  const [activeSuggestions, setActiveSuggestions] = useState<{
    field: 'shirtName' | 'clientName' | null;
    list: string[];
  }>({ field: null, list: [] });

  const updateSuggestions = (field: 'shirtName' | 'clientName', value: string) => {
    if (value.length < 3) {
      setActiveSuggestions({ field: null, list: [] });
      return;
    }
    const suggestions = field === 'shirtName' ? shirtSuggestions : clientSuggestions;
    const filtered = suggestions.filter(s => 
      s.toLowerCase().includes(value.toLowerCase()) && 
      s.toLowerCase() !== value.toLowerCase()
    ).slice(0, 5); // Limit to 5 suggestions
    setActiveSuggestions({ field, list: filtered });
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: 'shirtName' | 'clientName') => {
    if (e.key === 'Tab' && activeSuggestions.field === field && activeSuggestions.list.length > 0) {
      e.preventDefault();
      setFormData(prev => ({ ...prev, [field]: activeSuggestions.list[0] }));
      setActiveSuggestions({ field: null, list: [] });
    } else if (e.key === 'Escape') {
      setActiveSuggestions({ field: null, list: [] });
    }
  };

  useEffect(() => {
    if (editingOrder) {
      setFormData({
        shirtName: '',
        model: 'Masculino',
        size: 'M',
        personalization: '',
        clientName: '',
        photoUrl: '',
        status: 'Pendente',
        batchId: '',
        priceUsd: 0,
        priceBrl: 0,
        isPaid: false,
        paidAmount: 0,
        isStock: false,
        notes: '',
        ...editingOrder
      });
    }
  }, [editingOrder]);

  useEffect(() => {
    if (formData.paidAmount !== undefined && formData.priceBrl !== undefined) {
      const isFullyPaid = formData.paidAmount >= formData.priceBrl;
      if (formData.isPaid !== isFullyPaid) {
        setFormData(prev => ({ ...prev, isPaid: isFullyPaid }));
      }
    }
  }, [formData.paidAmount, formData.priceBrl]);

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (!file) continue;

        try {
          setIsUploading(true);
          const storageRef = ref(storage, `orders/${Date.now()}_pasted_image.png`);
          const snapshot = await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(snapshot.ref);
          setFormData(prev => ({ ...prev, photoUrl: downloadURL }));
        } catch (error) {
          console.error('Error uploading pasted image:', error);
          alert('Erro ao processar imagem colada. Tente novamente.');
        } finally {
          setIsUploading(false);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    
    const isStock = formData.isStock || false;
    const clientName = isStock ? 'Estoque' : formData.clientName;

    if (!formData.shirtName || (!isStock && !formData.clientName) || !formData.model || !formData.size) {
      alert('Por favor, preencha os campos obrigatórios.');
      return;
    }

    try {
      setIsSaving(true);
      await onSave({ ...formData, clientName });
    } catch (error) {
      console.error('Error saving order:', error);
      alert('Erro ao salvar a camisa. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentSizes = MODELS[formData.model as keyof typeof MODELS] || [];

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500" onPaste={handlePaste}>
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors duration-300">
        <div className="p-4 md:p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              {editingOrder ? 'Editar Camisa' : 'Nova Camisa'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">Preencha as informações da camisa, modelo, tamanho e valores.</p>
          </div>
          <button 
            onClick={onCancel}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 dark:text-slate-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Shirt Info */}
            <div className="space-y-6">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Informações da Camisa</h3>
              
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Shirt className="w-4 h-4 text-indigo-500" />
                  Nome da Camisa *
                </label>
                <div className="relative">
                  <input
                    required
                    type="text"
                    placeholder="Ex: Brasil Home 2024"
                    value={formData.shirtName || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, shirtName: val });
                      updateSuggestions('shirtName', val);
                    }}
                    onKeyDown={(e) => handleKeyDown(e, 'shirtName')}
                    onBlur={() => setTimeout(() => setActiveSuggestions({ field: null, list: [] }), 200)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                  />
                  {activeSuggestions.field === 'shirtName' && activeSuggestions.list.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
                      {activeSuggestions.list.map((suggestion, idx) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, shirtName: suggestion });
                            setActiveSuggestions({ field: null, list: [] });
                          }}
                          className={cn(
                            "w-full px-4 py-2 text-left text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors flex items-center justify-between",
                            idx === 0 && "bg-slate-50/50 dark:bg-slate-900/50"
                          )}
                        >
                          <span className="text-slate-700 dark:text-slate-200">{suggestion}</span>
                          {idx === 0 && <span className="text-[10px] font-bold text-indigo-400">TAB</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Maximize className="w-4 h-4 text-indigo-500" />
                  Modelo *
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(MODELS).map(model => (
                    <button
                      key={model}
                      type="button"
                      onClick={() => {
                        const newSizes = MODELS[model as keyof typeof MODELS];
                        setFormData({ 
                          ...formData, 
                          model, 
                          size: newSizes.includes(formData.size!) ? formData.size : newSizes[0] 
                        });
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                        formData.model === model 
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md" 
                          : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500"
                      )}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Maximize className="w-4 h-4 text-indigo-500" />
                  Tamanho *
                </label>
                <div className="flex flex-wrap gap-2">
                  {currentSizes.map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setFormData({ ...formData, size })}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                        formData.size === size 
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md" 
                          : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Type className="w-4 h-4 text-indigo-500" />
                  Personalização
                </label>
                <input
                  type="text"
                  placeholder="Ex: NEYMAR JR #10"
                  value={formData.personalization || ''}
                  onChange={(e) => setFormData({ ...formData, personalization: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  Observações / Descontos
                </label>
                <textarea
                  placeholder="Adicione observações sobre a camisa ou descontos aplicados..."
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white min-h-[100px] resize-none"
                />
              </div>
            </div>

            {/* Client & Logistics */}
            <div className="space-y-6">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Cliente, Valores & Logística</h3>

              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                <input
                  type="checkbox"
                  id="isStock"
                  checked={formData.isStock || false}
                  onChange={(e) => setFormData({ ...formData, isStock: e.target.checked, clientName: e.target.checked ? 'Estoque' : '' })}
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isStock" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-500" />
                  Comprar para Estoque?
                </label>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <User className="w-4 h-4 text-indigo-500" />
                  Nome do Cliente *
                </label>
                <div className="relative">
                  <input
                    required={!formData.isStock}
                    disabled={formData.isStock}
                    type="text"
                    placeholder={formData.isStock ? 'Estoque' : 'Nome completo do cliente'}
                    value={formData.isStock ? 'Estoque' : (formData.clientName || '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, clientName: val });
                      updateSuggestions('clientName', val);
                    }}
                    onKeyDown={(e) => handleKeyDown(e, 'clientName')}
                    onBlur={() => setTimeout(() => setActiveSuggestions({ field: null, list: [] }), 200)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white disabled:opacity-50"
                  />
                  {!formData.isStock && activeSuggestions.field === 'clientName' && activeSuggestions.list.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
                      {activeSuggestions.list.map((suggestion, idx) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, clientName: suggestion });
                            setActiveSuggestions({ field: null, list: [] });
                          }}
                          className={cn(
                            "w-full px-4 py-2 text-left text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors flex items-center justify-between",
                            idx === 0 && "bg-slate-50/50 dark:bg-slate-900/50"
                          )}
                        >
                          <span className="text-slate-700 dark:text-slate-200">{suggestion}</span>
                          {idx === 0 && <span className="text-[10px] font-bold text-indigo-400">TAB</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Custo (USD) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.priceUsd ?? 0}
                    onChange={(e) => setFormData({ ...formData, priceUsd: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Venda (BRL) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.priceBrl ?? 0}
                    onChange={(e) => setFormData({ ...formData, priceBrl: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isPaid"
                    checked={formData.isPaid || false}
                    onChange={(e) => {
                      const isPaid = e.target.checked;
                      setFormData({ 
                        ...formData, 
                        isPaid, 
                        paidAmount: isPaid ? (formData.priceBrl || 0) : (formData.paidAmount || 0) 
                      });
                    }}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="isPaid" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    Totalmente Pago?
                  </label>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Valor Já Pago (BRL)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.paidAmount ?? 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setFormData({ 
                        ...formData, 
                        paidAmount: val,
                        isPaid: val >= (formData.priceBrl || 0) && (formData.priceBrl || 0) > 0
                      });
                    }}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Plus className="w-4 h-4 text-indigo-500" />
                  Envio
                </label>
                <select
                  value={formData.batchId || ''}
                  onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none text-slate-900 dark:text-white"
                >
                  <option value="">Aguardando Envio (Futuro)</option>
                  {batches.map(batch => (
                    <option key={batch.id} value={batch.id}>{batch.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                  Selecione um envio ou deixe como "Aguardando" para organizar depois.
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <ImageIcon className="w-4 h-4 text-indigo-500" />
                  Foto da Camisa (Cole uma imagem para upload)
                </label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="Cole a URL da foto ou cole uma imagem (Ctrl+V)..."
                      value={formData.photoUrl || ''}
                      onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                      className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                    />
                    {isUploading && (
                      <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-3 rounded-xl flex items-center gap-2 border border-indigo-100 dark:border-indigo-900/50">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    )}
                  </div>
                  {formData.photoUrl && (
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-indigo-100 dark:border-indigo-900/50 group">
                      <img 
                        src={formData.photoUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, photoUrl: '' })}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  Status da Camisa
                </label>
                <select
                  value={formData.status || 'Pendente'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as OrderStatus })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none text-slate-900 dark:text-white"
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Enviado ao fornecedor">Enviado ao fornecedor</option>
                  <option value="A caminho">A caminho</option>
                  <option value="Recebido">Recebido</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-50 dark:border-slate-700 flex flex-col md:flex-row gap-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-8 py-4 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {isSaving ? 'Salvando...' : (editingOrder ? 'Salvar Alterações' : 'Confirmar Camisa')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
