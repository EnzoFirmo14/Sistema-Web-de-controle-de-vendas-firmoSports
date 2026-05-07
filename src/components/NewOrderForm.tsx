import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    ).slice(0, 5);
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

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData(prev => ({ ...prev, photoUrl: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    if (!formData.shirtName || !formData.clientName || !formData.model || !formData.size) {
      alert('Por favor, preencha os campos obrigatórios.');
      return;
    }

    try {
      setIsSaving(true);
      await onSave({ ...formData });
    } catch (error) {
      console.error('Error saving order:', error);
      alert('Erro ao salvar a camisa. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentSizes = MODELS[formData.model as keyof typeof MODELS] || [];

  const inputStyle: React.CSSProperties = {
    background: COLORS.bgGlobal,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '8px',
    color: COLORS.textPrimary,
    padding: '10px 14px',
    outline: 'none',
    width: '100%',
    transition: 'border-color 200ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 200ms cubic-bezier(0.23, 1, 0.32, 1)',
  };

  const labelStyle: React.CSSProperties = {
    color: COLORS.textMuted,
    fontSize: '13px',
    marginBottom: '6px',
    display: 'block',
  };

  return (
    <div className="max-w-4xl mx-auto page-enter" onPaste={handlePaste}>
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: COLORS.bgCard,
          border: `1px solid ${COLORS.border}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        {/* Header */}
        <div
          className="p-4 md:p-8 flex justify-between items-center"
          style={{ borderBottom: `1px solid ${COLORS.border}` }}
        >
          <div>
            <h2 className="text-xl md:text-2xl font-bold" style={{ color: COLORS.textPrimary }}>
              {editingOrder ? 'Editar Camisa' : 'Nova Camisa'}
            </h2>
            <p className="text-xs md:text-sm" style={{ color: COLORS.textMuted }}>Preencha as informações da camisa, modelo, tamanho e valores.</p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-full transition-colors"
            style={{ color: COLORS.textMuted }}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Shirt Info */}
            <div className="space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: COLORS.textMuted }}>Informações da Camisa</h3>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: COLORS.textMuted }}>
                  <Shirt className="w-4 h-4" style={{ color: COLORS.accent }} />
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
                    style={inputStyle}
                  />
                  {activeSuggestions.field === 'shirtName' && activeSuggestions.list.length > 0 && (
                    <div
                      className="absolute z-50 left-0 right-0 mt-1 rounded-xl shadow-xl overflow-hidden"
                      style={{
                        background: COLORS.bgCard,
                        border: `1px solid ${COLORS.border}`,
                      }}
                    >
                      {activeSuggestions.list.map((suggestion, idx) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, shirtName: suggestion });
                            setActiveSuggestions({ field: null, list: [] });
                          }}
                          className={cn(
                            "w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between",
                            idx === 0 && ""
                          )}
                          style={{ color: COLORS.textPrimary }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.bgHover)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <span>{suggestion}</span>
                          {idx === 0 && <span className="text-[10px] font-bold" style={{ color: COLORS.accent }}>TAB</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: COLORS.textMuted }}>
                  <Maximize className="w-4 h-4" style={{ color: COLORS.accent }} />
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
                      className="px-3 py-1.5 rounded-lg text-xs font-bold btn-press border"
                      style={{
                        background: formData.model === model ? COLORS.accent : 'transparent',
                        color: formData.model === model ? '#fff' : COLORS.textMuted,
                        borderColor: formData.model === model ? COLORS.accent : COLORS.border,
                      }}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: COLORS.textMuted }}>
                  <Maximize className="w-4 h-4" style={{ color: COLORS.accent }} />
                  Tamanho *
                </label>
                <div className="flex flex-wrap gap-2">
                  {currentSizes.map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setFormData({ ...formData, size })}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold btn-press border"
                      style={{
                        background: formData.size === size ? COLORS.accent : 'transparent',
                        color: formData.size === size ? '#fff' : COLORS.textMuted,
                        borderColor: formData.size === size ? COLORS.accent : COLORS.border,
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: COLORS.textMuted }}>
                  <Type className="w-4 h-4" style={{ color: COLORS.accent }} />
                  Personalização
                </label>
                <input
                  type="text"
                  placeholder="Ex: NEYMAR JR #10"
                  value={formData.personalization || ''}
                  onChange={(e) => setFormData({ ...formData, personalization: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: COLORS.textMuted }}>
                  <FileText className="w-4 h-4" style={{ color: COLORS.accent }} />
                  Observações / Descontos
                </label>
                <textarea
                  placeholder="Adicione observações sobre a camisa ou descontos aplicados..."
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-xl outline-none resize-none"
                  style={{
                    ...inputStyle,
                    minHeight: '100px',
                  }}
                />
              </div>
            </div>

            {/* Client & Logistics */}
            <div className="space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: COLORS.textMuted }}>Cliente, Valores & Logística</h3>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: COLORS.textMuted }}>
                  <User className="w-4 h-4" style={{ color: COLORS.accent }} />
                  Nome do Cliente *
                </label>
                <div className="relative">
                  <input
                    required
                    type="text"
                    placeholder="Nome completo do cliente"
                    value={formData.clientName || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, clientName: val });
                      updateSuggestions('clientName', val);
                    }}
                    onKeyDown={(e) => handleKeyDown(e, 'clientName')}
                    onBlur={() => setTimeout(() => setActiveSuggestions({ field: null, list: [] }), 200)}
                    style={inputStyle}
                  />
                  {activeSuggestions.field === 'clientName' && activeSuggestions.list.length > 0 && (
                    <div
                      className="absolute z-50 left-0 right-0 mt-1 rounded-xl shadow-xl overflow-hidden"
                      style={{
                        background: COLORS.bgCard,
                        border: `1px solid ${COLORS.border}`,
                      }}
                    >
                      {activeSuggestions.list.map((suggestion, idx) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, clientName: suggestion });
                            setActiveSuggestions({ field: null, list: [] });
                          }}
                          className="w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between"
                          style={{ color: COLORS.textPrimary }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.bgHover)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <span>{suggestion}</span>
                          {idx === 0 && <span className="text-[10px] font-bold" style={{ color: COLORS.accent }}>TAB</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold" style={labelStyle}>Custo (USD) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.priceUsd ?? 0}
                    onChange={(e) => setFormData({ ...formData, priceUsd: parseFloat(e.target.value) || 0 })}
                    style={inputStyle}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold" style={labelStyle}>Venda (BRL) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.priceBrl ?? 0}
                    onChange={(e) => setFormData({ ...formData, priceBrl: parseFloat(e.target.value) || 0 })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div
                className="space-y-4 p-4 rounded-xl"
                style={{
                  background: COLORS.bgHover,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
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
                    className="w-5 h-5 rounded"
                    style={{ accentColor: COLORS.accent }}
                  />
                  <label htmlFor="isPaid" className="text-sm font-bold cursor-pointer flex items-center gap-2" style={{ color: COLORS.textPrimary }}>
                    <DollarSign className="w-4 h-4" style={{ color: COLORS.accentGreen }} />
                    Totalmente Pago?
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold" style={{ color: COLORS.textMuted }}>Valor Já Pago (BRL)</label>
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
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: COLORS.textMuted }}>
                  <Plus className="w-4 h-4" style={{ color: COLORS.accent }} />
                  Envio
                </label>
                <select
                  value={formData.batchId || ''}
                  onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                  className="w-full rounded-xl outline-none appearance-none"
                  style={inputStyle}
                >
                  <option value="">Aguardando Envio (Futuro)</option>
                  {batches.map(batch => (
                    <option key={batch.id} value={batch.id}>{batch.name}</option>
                  ))}
                </select>
                <p className="text-[10px] italic" style={{ color: COLORS.textMuted }}>
                  Selecione um envio ou deixe como "Aguardando" para organizar depois.
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: COLORS.textMuted }}>
                  <ImageIcon className="w-4 h-4" style={{ color: COLORS.accent }} />
                  Foto da Camisa (Cole uma imagem para upload)
                </label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="Cole a URL da foto ou cole uma imagem (Ctrl+V)..."
                      value={formData.photoUrl || ''}
                      onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                      style={inputStyle}
                    />
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handlePhotoFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold btn-press flex-shrink-0"
                      style={{
                        background: COLORS.bgHover,
                        color: COLORS.textMuted,
                        border: `1px solid ${COLORS.border}`,
                      }}
                      title="Enviar foto do computador"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    {isUploading && (
                      <div
                        className="px-4 py-3 rounded-xl flex items-center gap-2"
                        style={{
                          background: '#1e1b4b',
                          color: COLORS.accent,
                          border: `1px solid ${COLORS.border}`,
                        }}
                      >
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    )}
                  </div>
                  {formData.photoUrl && (
                    <div
                      className="relative w-24 h-24 rounded-xl overflow-hidden group"
                      style={{ border: `2px solid ${COLORS.border}` }}
                    >
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
                <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: COLORS.textMuted }}>
                  <Clock className="w-4 h-4" style={{ color: COLORS.accent }} />
                  Status da Camisa
                </label>
                <select
                  value={formData.status || 'Pendente'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as OrderStatus })}
                  className="w-full rounded-xl outline-none appearance-none"
                  style={inputStyle}
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Enviado ao fornecedor">Enviado ao fornecedor</option>
                  <option value="A caminho">A caminho</option>
                  <option value="Recebido">Recebido</option>
                </select>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div
            className="pt-8 flex flex-col md:flex-row gap-4"
            style={{ borderTop: `1px solid ${COLORS.border}` }}
          >
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-8 py-4 font-bold rounded-xl btn-press"
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
              className="flex-1 px-8 py-4 text-white font-bold rounded-xl btn-press flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: COLORS.accent,
                transition: 'background-color 200ms ease, transform 160ms ease',
              }}
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
