import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Building2, Save, Loader2, Upload, X, AlertCircle, CheckCircle, ArrowLeft, Settings, DollarSign, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { type StoreInfo } from '../context/StoreContext';
import { type Divida } from '../types';

interface ProfilePageProps {
  uid: string;
  storeInfo: StoreInfo;
  onSave: (uid: string, data: StoreInfo) => void;
  onClose: () => void;
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

// ─── Dividas helpers ────────────────────────────────────────────────
const DIVIDAS_KEY = 'firmoSports_dividas';

function loadDividas(uid: string): Divida[] {
  try {
    const raw = localStorage.getItem(`${DIVIDAS_KEY}_${uid}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDividas(uid: string, dividas: Divida[]) {
  localStorage.setItem(`${DIVIDAS_KEY}_${uid}`, JSON.stringify(dividas));
}

export default function ProfilePage({ uid, storeInfo, onSave, onClose }: ProfilePageProps) {
  // ─── Store settings state ───────────────────────────────────────
  const [name, setName] = useState(storeInfo?.name || '');
  const [logoUrl, setLogoUrl] = useState(storeInfo?.logoUrl || '');
  const [description, setDescription] = useState(storeInfo?.description || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [logoPreviewError, setLogoPreviewError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Contas a Pagar state ───────────────────────────────────────
  const [dividas, setDividas] = useState<Divida[]>(() => loadDividas(uid));
  const [showDividas, setShowDividas] = useState(false);
  const [dividaDesc, setDividaDesc] = useState('');
  const [dividaValor, setDividaValor] = useState('');
  const [dividaError, setDividaError] = useState('');

  useEffect(() => {
    setName(storeInfo?.name || '');
    setLogoUrl(storeInfo?.logoUrl || '');
    setDescription(storeInfo?.description || '');
  }, [storeInfo]);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('O arquivo deve ser uma imagem');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoUrl(ev.target?.result as string);
      setLogoPreviewError(false);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    setLogoPreviewError(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('O nome da loja é obrigatório');
      return;
    }
    if (trimmedName.length < 2) {
      setError('O nome deve ter ao menos 2 caracteres');
      return;
    }

    setIsSaving(true);
    setSuccess(false);
    setError('');

    try {
      onSave(uid, {
        name: trimmedName,
        logoUrl: logoUrl.trim(),
        description: description.trim(),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(`Erro ao salvar: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Contas a Pagar handlers ────────────────────────────────────
  const totalDividas = useMemo(() => dividas.reduce((acc, d) => acc + (d.valor || 0), 0), [dividas]);

  const handleAddDivida = () => {
    const valor = parseFloat(dividaValor);
    if (!dividaDesc.trim()) {
      setDividaError('Descrição é obrigatória');
      return;
    }
    if (!valor || valor <= 0) {
      setDividaError('Valor inválido');
      return;
    }
    const nova: Divida = { id: Date.now().toString(), descricao: dividaDesc.trim(), valor, paraQuem: '', data: new Date().toISOString().split('T')[0], pago: false };
    const updated = [...dividas, nova];
    setDividas(updated);
    saveDividas(uid, updated);
    setDividaDesc('');
    setDividaValor('');
    setDividaError('');
  };

  const handleRemoveDivida = (id: string) => {
    const updated = dividas.filter(d => d.id !== id);
    setDividas(updated);
    saveDividas(uid, updated);
  };

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onClose}
          className="p-2 rounded-lg transition-colors"
          style={{ color: COLORS.textMuted }}
          onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.bgHover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl md:text-2xl font-bold" style={{ color: COLORS.textPrimary }}>Configurações</h2>
          <p className="text-xs md:text-sm" style={{ color: COLORS.textMuted }}>Gerencie as informações da sua loja.</p>
        </div>
      </div>

      {/* Current Store Preview */}
      <div
        className="p-5 rounded-xl flex items-center gap-4"
        style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}
      >
        {storeInfo?.logoUrl ? (
          <img
            src={storeInfo.logoUrl}
            alt="Logo"
            className="w-14 h-14 object-contain rounded-lg"
            style={{ border: `1px solid ${COLORS.border}` }}
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        ) : (
          <div
            className="w-14 h-14 rounded-lg flex items-center justify-center"
            style={{ background: COLORS.bgHover, border: `1px solid ${COLORS.border}` }}
          >
            <Building2 className="w-6 h-6" style={{ color: COLORS.textMuted }} />
          </div>
        )}
        <div>
          <p className="font-bold" style={{ color: COLORS.textPrimary }}>{storeInfo?.name || '-'}</p>
          {storeInfo?.description && (
            <p className="text-sm" style={{ color: COLORS.textMuted }}>{storeInfo.description}</p>
          )}
        </div>
      </div>

      {/* Edit Form */}
      <form
        onSubmit={handleSubmit}
        className="p-6 rounded-xl space-y-5"
        style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-4 h-4" style={{ color: COLORS.accent }} />
          <h3 className="text-sm font-semibold" style={{ color: COLORS.textPrimary }}>Editar Loja</h3>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: COLORS.textMuted }}>Nome da loja *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); setSuccess(false); }}
            className="w-full px-3.5 py-2.5 rounded-lg outline-none text-sm"
            style={{
              background: COLORS.bgGlobal,
              border: `1px solid ${COLORS.border}`,
              color: COLORS.textPrimary,
            }}
          />
        </div>

        {/* Logo */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: COLORS.textMuted }}>Logo (opcional)</label>
          {logoUrl && !logoPreviewError ? (
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ border: `1px solid ${COLORS.border}`, background: COLORS.bgGlobal }}>
              <img
                src={logoUrl}
                alt="Logo preview"
                className="w-14 h-14 object-contain rounded-md p-1"
                style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}
                onError={() => setLogoPreviewError(true)}
              />
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="p-1.5 rounded-md transition-colors"
                style={{ color: COLORS.textMuted }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center gap-2 cursor-pointer"
              style={{ borderColor: COLORS.border }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-5 h-5" style={{ color: COLORS.textMuted }} />
              <p className="text-sm" style={{ color: COLORS.textMuted }}>Clique para enviar ou arraste</p>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoFileChange} className="hidden" />
            </div>
          )}
          <input
            type="url"
            value={logoUrl.startsWith('data:') ? '' : logoUrl}
            onChange={(e) => { setLogoUrl(e.target.value); setLogoPreviewError(false); }}
            placeholder="Ou cole a URL da imagem..."
            className="w-full px-3.5 py-2 rounded-lg outline-none text-sm"
            style={{ background: COLORS.bgGlobal, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }}
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: COLORS.textMuted }}>Descrição (opcional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-lg outline-none text-sm resize-none"
            style={{ background: COLORS.bgGlobal, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }}
          />
        </div>

        {error && (
          <p className="flex items-center gap-1.5 text-sm" style={{ color: COLORS.accentRed }}>
            <AlertCircle className="w-4 h-4" />{error}
          </p>
        )}
        {success && (
          <p className="flex items-center gap-1.5 text-sm" style={{ color: COLORS.accentGreen }}>
            <CheckCircle className="w-4 h-4" />Alterações salvas com sucesso!
          </p>
        )}

        <button
          type="submit"
          disabled={isSaving || !name.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-colors"
          style={{
            background: COLORS.accent,
            color: '#fff',
            opacity: isSaving || !name.trim() ? 0.5 : 1,
          }}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </form>

      {/* ─── Contas a Pagar ─────────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden" style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}>
        <button
          type="button"
          onClick={() => setShowDividas(!showDividas)}
          className="w-full p-5 flex items-center justify-between"
          style={{ color: COLORS.textPrimary }}
        >
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5" style={{ color: COLORS.accentAmber }} />
            <span className="font-semibold">Contas a Pagar</span>
            {totalDividas > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#451a03', color: COLORS.accentAmber }}>
                R$ {totalDividas.toFixed(2)}
              </span>
            )}
          </div>
          {showDividas ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDividas && (
          <div className="px-5 pb-5 space-y-4" style={{ borderTop: `1px solid ${COLORS.border}` }}>
            {/* Add new */}
            <div className="flex gap-2 pt-4">
              <input
                type="text"
                value={dividaDesc}
                onChange={(e) => { setDividaDesc(e.target.value); setDividaError(''); }}
                placeholder="Descrição (ex: Fornecedor X)"
                className="flex-1 px-3 py-2 rounded-lg outline-none text-sm"
                style={{ background: COLORS.bgGlobal, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }}
              />
              <input
                type="number"
                step="0.01"
                value={dividaValor}
                onChange={(e) => { setDividaValor(e.target.value); setDividaError(''); }}
                placeholder="R$ 0.00"
                className="w-28 px-3 py-2 rounded-lg outline-none text-sm"
                style={{ background: COLORS.bgGlobal, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }}
              />
              <button
                type="button"
                onClick={handleAddDivida}
                className="px-4 py-2 rounded-lg font-semibold text-sm"
                style={{ background: COLORS.accent, color: '#fff' }}
              >
                Adicionar
              </button>
            </div>
            {dividaError && <p className="text-xs" style={{ color: COLORS.accentRed }}>{dividaError}</p>}

            {/* List */}
            {dividas.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: COLORS.textMuted }}>Nenhuma conta registrada.</p>
            ) : (
              <div className="space-y-2">
                {dividas.map(d => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: COLORS.bgGlobal, border: `1px solid ${COLORS.border}` }}
                  >
                    <div>
                      <p className="text-sm font-medium" style={{ color: COLORS.textPrimary }}>{d.descricao}</p>
                      <p className="text-xs font-mono" style={{ color: COLORS.accentAmber }}>R$ {d.valor.toFixed(2)}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveDivida(d.id)}
                      className="p-1.5 rounded-md transition-colors"
                      style={{ color: COLORS.textMuted }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = COLORS.accentRed)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = COLORS.textMuted)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <p className="text-sm font-bold text-right pt-2" style={{ color: COLORS.accentAmber }}>
                  Total: R$ {totalDividas.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
