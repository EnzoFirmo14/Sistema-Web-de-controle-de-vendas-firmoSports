import React, { useState, useEffect, useMemo, useCallback } from 'react';

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

const STORAGE_KEY = 'precos_loja';
const COTACAO_CACHE_KEY = 'precos_cotacao_cache';

export interface PrecoItem {
  id: string;
  categoria: string;
  custoUsd: number;
  margem: number;
  precoSugerido: number;
}

interface CotacaoCache {
  valor: number;
  data: string;
  timestamp: number;
}

// ─── Helpers ────────────────────────────────────────────────────────
function loadPrecos(): PrecoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((item: any) => {
      const custoUsd: number = item.custoUsd ?? item.custo ?? 0;
      const margem: number = item.margem ?? 30;
      // Migration: if precoSugerido doesn't exist, calculate from custoUsd + margem
      // Use cached cotacao or default 5.0
      let precoSugerido: number = item.precoSugerido ?? 0;
      if (!precoSugerido || precoSugerido <= 0) {
        let cot = 5.0;
        try {
          const cacheRaw = localStorage.getItem(COTACAO_CACHE_KEY);
          if (cacheRaw) {
            const c: CotacaoCache = JSON.parse(cacheRaw);
            if (c.valor > 0) cot = c.valor;
          }
        } catch { /* ignore */ }
        precoSugerido = custoUsd * cot * (1 + margem / 100);
      }
      return {
        id: item.id,
        categoria: item.categoria || 'Sem nome',
        custoUsd,
        margem,
        precoSugerido,
      };
    });
  } catch {
    return [];
  }
}

function savePrecos(items: PrecoItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function loadCotacaoCache(): CotacaoCache | null {
  try {
    const raw = localStorage.getItem(COTACAO_CACHE_KEY);
    if (!raw) return null;
    const cache: CotacaoCache = JSON.parse(raw);
    const age = Date.now() - cache.timestamp;
    if (age > 24 * 60 * 60 * 1000) return null;
    return cache;
  } catch {
    return null;
  }
}

function saveCotacaoCache(valor: number, data: string) {
  const cache: CotacaoCache = { valor, data, timestamp: Date.now() };
  localStorage.setItem(COTACAO_CACHE_KEY, JSON.stringify(cache));
}

function formatDatePtBr(dateStr: string): string {
  const [datePart, timePart] = dateStr.split(' ');
  if (!datePart) return dateStr;
  const [y, m, d] = datePart.split('-');
  const [hh, mm] = (timePart || '').split(':');
  return `${d}/${m}/${y} ${hh && mm ? `${hh}:${mm}` : ''}`.trim();
}

function isCotacaoHoje(cache: CotacaoCache | null): boolean {
  if (!cache) return false;
  const [cacheDate] = cache.data.split(' ');
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return cacheDate === todayStr;
}

// ─── API PTAX ───────────────────────────────────────────────────────
async function fetchCotacaoPTAX(): Promise<{ valor: number; data: string } | null> {
  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setDate(inicio.getDate() - 7);

  const fmt = (d: Date) =>
    `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${d.getFullYear()}`;

  const url =
    `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/` +
    `CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)` +
    `?@dataInicial='${fmt(inicio)}'&@dataFinalCotacao='${fmt(hoje)}'` +
    `&$top=1&$format=json&$select=cotacaoCompra,dataHoraCotacao`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const arr = json?.value;
    if (!arr || arr.length === 0) throw new Error('Sem dados');
    return {
      valor: arr[0].cotacaoCompra,
      data: arr[0].dataHoraCotacao,
    };
  } catch {
    return null;
  }
}

// ─── Component ──────────────────────────────────────────────────────
interface PrecosPageProps { }

export default function PrecosPage({ }: PrecosPageProps) {
  const [items, setItems] = useState<PrecoItem[]>(loadPrecos);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<PrecoItem>>({});
  const [editMode, setEditMode] = useState<'margem' | 'preco'>('margem');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newData, setNewData] = useState({ categoria: '', custoUsd: '', margem: '30', precoSugerido: '' });
  const [newEditMode, setNewEditMode] = useState<'margem' | 'preco'>('margem');

  // ─── Cotação PTAX ───────────────────────────────────────────────
  const [cotacao, setCotacao] = useState<number | null>(null);
  const [cotacaoData, setCotacaoData] = useState<string>('');
  const [cotacaoLoading, setCotacaoLoading] = useState(true);
  const [cotacaoErro, setCotacaoErro] = useState(false);
  const [cotacaoManual, setCotacaoManual] = useState('');

  const cotacaoEfetiva = useMemo(() => {
    if (cotacaoManual) return parseFloat(cotacaoManual) || 0;
    return cotacao ?? 0;
  }, [cotacao, cotacaoManual]);

  const buscarCotacao = useCallback(async () => {
    setCotacaoLoading(true);
    setCotacaoErro(false);
    try {
      const cache = loadCotacaoCache();
      if (cache) {
        setCotacao(cache.valor);
        setCotacaoData(cache.data);
        setCotacaoLoading(false);
        return;
      }
      const result = await fetchCotacaoPTAX();
      if (result) {
        setCotacao(result.valor);
        setCotacaoData(result.data);
        saveCotacaoCache(result.valor, result.data);
      } else {
        setCotacaoErro(true);
      }
    } catch {
      setCotacaoErro(true);
    } finally {
      setCotacaoLoading(false);
    }
  }, []);

  useEffect(() => {
    buscarCotacao();
  }, [buscarCotacao]);

  // ─── Persistência ────────────────────────────────────────────────
  useEffect(() => {
    savePrecos(items);
  }, [items]);

  // ─── Cálculos de preço ──────────────────────────────────────────
  function calcCustoReais(custoUsd: number, cot: number): number {
    return custoUsd * cot;
  }
  function calcPrecoFromMargem(custoUsd: number, margem: number, cot: number): number {
    return custoUsd * cot * (1 + margem / 100);
  }
  function calcMargemFromPreco(preco: number, custoUsd: number, cot: number): number {
    const custoReais = custoUsd * cot;
    if (custoReais <= 0) return 0;
    return ((preco / custoReais) - 1) * 100;
  }
  function calcLucroUnit(preco: number, custoUsd: number, cot: number): number {
    return preco - calcCustoReais(custoUsd, cot);
  }

  // ─── Resumo por categoria ───────────────────────────────────────
  const resumo = useMemo(() => {
    if (cotacaoEfetiva <= 0) return [];
    const map = new Map<string, { itens: number; lucroTotal: number; margemTotal: number }>();
    items.forEach(item => {
      const cat = item.categoria?.trim() || 'Sem categoria';
      const preco = item.precoSugerido || calcPrecoFromMargem(item.custoUsd || 0, item.margem || 0, cotacaoEfetiva);
      const lucro = calcLucroUnit(preco, item.custoUsd || 0, cotacaoEfetiva);
      const existing = map.get(cat);
      if (existing) {
        existing.itens += 1;
        existing.lucroTotal += lucro;
        existing.margemTotal += item.margem || 0;
      } else {
        map.set(cat, { itens: 1, lucroTotal: lucro, margemTotal: item.margem || 0 });
      }
    });
    return Array.from(map.entries()).map(([categoria, d]) => ({
      categoria,
      itens: d.itens,
      lucroTotal: d.lucroTotal,
      margemMedia: d.itens > 0 ? d.margemTotal / d.itens : 0,
    }));
  }, [items, cotacaoEfetiva]);

  const resumoGeral = useMemo(() => {
    if (resumo.length <= 1) return null;
    return {
      itens: resumo.reduce((a, r) => a + r.itens, 0),
      lucroTotal: resumo.reduce((a, r) => a + r.lucroTotal, 0),
      margemMedia: resumo.reduce((a, r) => a + r.margemMedia, 0) / (resumo.length || 1),
    };
  }, [resumo]);

  // ─── New item live preview ──────────────────────────────────────
  const newPreview = useMemo(() => {
    const custo = parseFloat(newData.custoUsd) || 0;
    if (custo <= 0 || cotacaoEfetiva <= 0) return null;
    const custoReais = calcCustoReais(custo, cotacaoEfetiva);
    let margem: number;
    let preco: number;
    if (newEditMode === 'margem') {
      margem = parseFloat(newData.margem) || 0;
      preco = calcPrecoFromMargem(custo, margem, cotacaoEfetiva);
    } else {
      preco = parseFloat(newData.precoSugerido) || 0;
      margem = calcMargemFromPreco(preco, custo, cotacaoEfetiva);
    }
    const lucro = calcLucroUnit(preco, custo, cotacaoEfetiva);
    return { custoReais, margem, preco, lucro };
  }, [newData.custoUsd, newData.margem, newData.precoSugerido, newEditMode, cotacaoEfetiva]);

  // ─── Edit item live preview ─────────────────────────────────────
  const editPreview = useMemo(() => {
    const item = items.find(i => i.id === editingId);
    if (!item || cotacaoEfetiva <= 0) return null;
    const custo = editData.custoUsd ?? item.custoUsd;
    if (custo <= 0) return null;
    const custoReais = calcCustoReais(custo, cotacaoEfetiva);
    let margem: number;
    let preco: number;
    if (editMode === 'margem') {
      margem = editData.margem ?? item.margem;
      preco = calcPrecoFromMargem(custo, margem, cotacaoEfetiva);
    } else {
      preco = editData.precoSugerido ?? item.precoSugerido;
      margem = calcMargemFromPreco(preco, custo, cotacaoEfetiva);
    }
    const lucro = calcLucroUnit(preco, custo, cotacaoEfetiva);
    return { custoReais, margem, preco, lucro };
  }, [editingId, editData, editMode, items, cotacaoEfetiva]);

  // ─── Handlers ───────────────────────────────────────────────────
  function startEdit(item: PrecoItem) {
    setEditingId(item.id);
    setEditData({
      categoria: item.categoria,
      custoUsd: item.custoUsd,
      margem: item.margem,
      precoSugerido: item.precoSugerido,
    });
    setEditMode('margem');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditData({});
    setEditMode('margem');
  }

  function saveEdit() {
    if (!editingId) return;
    const item = items.find(i => i.id === editingId);
    if (!item) return;
    const custo = editData.custoUsd ?? item.custoUsd;
    let margem: number;
    let preco: number;
    if (editMode === 'margem') {
      margem = editData.margem ?? item.margem;
      preco = cotacaoEfetiva > 0 ? calcPrecoFromMargem(custo, margem, cotacaoEfetiva) : item.precoSugerido;
    } else {
      preco = editData.precoSugerido ?? item.precoSugerido;
      margem = cotacaoEfetiva > 0 ? calcMargemFromPreco(preco, custo, cotacaoEfetiva) : item.margem;
    }
    setItems(prev =>
      prev.map(i =>
        i.id === editingId
          ? {
            ...i,
            categoria: editData.categoria?.trim() || i.categoria,
            custoUsd: custo,
            margem,
            precoSugerido: preco,
          }
          : i
      )
    );
    setEditingId(null);
    setEditData({});
    setEditMode('margem');
  }

  function confirmDelete() {
    if (!deletingId) return;
    setItems(prev => prev.filter(item => item.id !== deletingId));
    setDeletingId(null);
  }

  function addNew() {
    const custoUsd = parseFloat(newData.custoUsd) || 0;
    let margem: number;
    let preco: number;
    if (newEditMode === 'margem') {
      margem = parseFloat(newData.margem) || 30;
      preco = cotacaoEfetiva > 0 ? calcPrecoFromMargem(custoUsd, margem, cotacaoEfetiva) : 0;
    } else {
      preco = parseFloat(newData.precoSugerido) || 0;
      margem = cotacaoEfetiva > 0 ? calcMargemFromPreco(preco, custoUsd, cotacaoEfetiva) : 30;
    }
    const newItem: PrecoItem = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      categoria: newData.categoria.trim() || 'Nova Categoria',
      custoUsd,
      margem,
      precoSugerido: preco,
    };
    setItems(prev => [...prev, newItem]);
    setNewData({ categoria: '', custoUsd: '', margem: '30', precoSugerido: '' });
    setNewEditMode('margem');
    setShowModal(false);
  }

  const cotacaoCache = loadCotacaoCache();
  const cotacaoIsHoje = isCotacaoHoje(cotacaoCache);

  return (
    <div className="space-y-6 page-enter">
      {/* ─── Delete Confirmation Modal ─────────────────────────────── */}
      {deletingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scale-in"
            style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}
          >
            <h3 className="text-lg font-bold mb-2" style={{ color: COLORS.textPrimary }}>Excluir Categoria?</h3>
            <p className="text-sm mb-6" style={{ color: COLORS.textMuted }}>
              Tem certeza que deseja excluir esta categoria? Esta ação nao pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 px-4 py-2 font-bold rounded-xl btn-press"
                style={{ background: 'transparent', color: COLORS.textMuted, border: `1px solid ${COLORS.border}` }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 text-white font-bold rounded-xl btn-press"
                style={{ background: '#dc2626' }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── New Category Modal ───────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scale-in"
            style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}
          >
            <h3 className="text-lg font-bold mb-4" style={{ color: COLORS.textPrimary }}>Nova Categoria</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: COLORS.textMuted }}>Nome da Categoria</label>
                <input
                  type="text"
                  value={newData.categoria}
                  onChange={e => setNewData(prev => ({ ...prev, categoria: e.target.value }))}
                  placeholder="Ex: Camisa Jogador"
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none input-focus"
                  style={{ background: COLORS.bgGlobal, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: COLORS.textMuted }}>Custo (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newData.custoUsd}
                  onChange={e => setNewData(prev => ({ ...prev, custoUsd: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none input-focus"
                  style={{ background: COLORS.bgGlobal, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }}
                />
              </div>

              {/* Toggle: Margem / Preco */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: COLORS.textMuted }}>Modo de Edicao</label>
                <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
                  <button
                    onClick={() => setNewEditMode('margem')}
                    className="flex-1 px-3 py-2 text-xs font-bold btn-press"
                    style={{
                      background: newEditMode === 'margem' ? COLORS.accent : COLORS.bgGlobal,
                      color: newEditMode === 'margem' ? '#fff' : COLORS.textMuted,
                    }}
                  >
                    Editar Margem
                  </button>
                  <button
                    onClick={() => setNewEditMode('preco')}
                    className="flex-1 px-3 py-2 text-xs font-bold btn-press"
                    style={{
                      background: newEditMode === 'preco' ? COLORS.accent : COLORS.bgGlobal,
                      color: newEditMode === 'preco' ? '#fff' : COLORS.textMuted,
                    }}
                  >
                    Editar Preco
                  </button>
                </div>
              </div>

              {newEditMode === 'margem' ? (
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: COLORS.textMuted }}>Margem (%)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={newData.margem}
                    onChange={e => setNewData(prev => ({ ...prev, margem: e.target.value }))}
                    placeholder="30"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none input-focus"
                    style={{ background: COLORS.bgGlobal, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: COLORS.textMuted }}>Preco Sugerido (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newData.precoSugerido}
                    onChange={e => setNewData(prev => ({ ...prev, precoSugerido: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none input-focus"
                    style={{ background: COLORS.bgGlobal, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }}
                  />
                </div>
              )}

              {/* Price Preview */}
              {newPreview && (
                <div
                  className="p-3 rounded-xl space-y-1"
                  style={{ background: COLORS.bgGlobal, border: `1px solid ${COLORS.border}` }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: COLORS.textMuted }}>Previa</p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-[10px]" style={{ color: COLORS.textMuted }}>Custo R$</p>
                      <p className="text-sm font-bold" style={{ color: COLORS.textPrimary }}>
                        {newPreview.custoReais.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px]" style={{ color: COLORS.textMuted }}>Margem</p>
                      <p className="text-sm font-bold" style={{ color: newPreview.margem >= 0 ? COLORS.accentGreen : COLORS.accentRed }}>
                        {newPreview.margem >= 0 ? '+' : ''}{newPreview.margem.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px]" style={{ color: COLORS.textMuted }}>Preco Sugerido</p>
                      <p className="text-sm font-bold" style={{ color: COLORS.accent }}>
                        {newPreview.preco.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px]" style={{ color: COLORS.textMuted }}>Lucro Unit.</p>
                      <p className="text-sm font-bold" style={{ color: COLORS.accentGreen }}>
                        {newPreview.lucro.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); setNewData({ categoria: '', custoUsd: '', margem: '30', precoSugerido: '' }); setNewEditMode('margem'); }}
                className="flex-1 px-4 py-2.5 font-bold rounded-xl btn-press"
                style={{ background: 'transparent', color: COLORS.textMuted, border: `1px solid ${COLORS.border}` }}
              >
                Cancelar
              </button>
              <button
                onClick={addNew}
                className="flex-1 px-4 py-2.5 text-white font-bold rounded-xl btn-press"
                style={{ background: COLORS.accent }}
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Cotacao PTAX Banner ──────────────────────────────────── */}
      <div
        className="p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        style={{
          background: COLORS.bgCard,
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: COLORS.bgGlobal }}
          >
            <svg className="w-5 h-5" style={{ color: COLORS.accent }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold" style={{ color: COLORS.textPrimary }}>
                Dolar PTAX
              </p>
              {cotacaoLoading && (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#1e1b4b', color: COLORS.accent }}>
                  buscando...
                </span>
              )}
              {!cotacaoLoading && cotacaoEfetiva > 0 && cotacaoIsHoje && (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#022c22', color: COLORS.accentGreen }}>
                  cotacao de hoje
                </span>
              )}

            </div>
            {cotacaoEfetiva > 0 ? (
              <p className="text-lg font-black" style={{ color: COLORS.textPrimary }}>
                R$ {cotacaoEfetiva.toFixed(4)}
                {cotacaoData && (
                  <span className="text-xs font-normal ml-2" style={{ color: COLORS.textMuted }}>
                    — atualizado em {formatDatePtBr(cotacaoData)}
                  </span>
                )}
              </p>
            ) : cotacaoErro ? (
              <p className="text-xs" style={{ color: COLORS.accentRed }}>
                Falha ao buscar cotacao automatica. Insira manualmente abaixo.
              </p>
            ) : (
              <p className="text-xs" style={{ color: COLORS.textMuted }}>Carregando...</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">

          <button
            onClick={buscarCotacao}
            disabled={cotacaoLoading}
            className="px-3 py-2 rounded-lg text-xs font-bold btn-press disabled:opacity-50"
            style={{ background: COLORS.accent, color: '#fff' }}
          >
            {cotacaoLoading ? '...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* ─── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: COLORS.textPrimary }}>Precos</h2>
          <p className="text-sm" style={{ color: COLORS.textMuted }}>
            Gerencie custos em USD, margens e precos sugeridos em R$
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-xl text-sm font-bold btn-press flex items-center gap-2"
          style={{ background: COLORS.accent, color: '#fff' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nova Categoria
        </button>
      </div>

      {/* ─── Content ──────────────────────────────────────────────── */}
      {items.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}
        >
          <svg
            className="w-16 h-16 mx-auto mb-4"
            style={{ color: COLORS.bgActive }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
          </svg>
          <h3 className="text-lg font-bold mb-2" style={{ color: COLORS.textPrimary }}>Nenhuma Categoria</h3>
          <p className="max-w-sm mx-auto mb-6" style={{ color: COLORS.textMuted }}>
            Adicione categorias de produtos para controlar custos em USD, margens e precos sugeridos.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-2.5 rounded-xl text-sm font-bold btn-press inline-flex items-center gap-2"
            style={{ background: COLORS.accent, color: '#fff' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Adicionar Categoria
          </button>
        </div>
      ) : (
        <>
          {/* ─── Table ─────────────────────────────────────────────── */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}
          >
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ background: COLORS.bgGlobal, borderBottom: `1px solid ${COLORS.border}` }}>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.textMuted }}>Categoria</th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.textMuted }}>Custo USD</th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.textMuted }}>Custo R$</th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.textMuted }}>Margem</th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.textMuted }}>Preco Sugerido</th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.textMuted }}>Lucro Unit.</th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: COLORS.textMuted }}>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const isEditing = editingId === item.id;
                    const custoUsd = isEditing ? (editData.custoUsd ?? item.custoUsd) : item.custoUsd;
                    const margemVal = isEditing ? (editPreview?.margem ?? item.margem) : item.margem;
                    const precoVal = isEditing ? (editPreview?.preco ?? item.precoSugerido) : item.precoSugerido;
                    const custoReais = cotacaoEfetiva > 0 ? calcCustoReais(custoUsd, cotacaoEfetiva) : 0;
                    const lucroUnit = cotacaoEfetiva > 0 ? calcLucroUnit(precoVal, custoUsd, cotacaoEfetiva) : 0;
                    const margemColor = margemVal >= 0 ? COLORS.accentGreen : COLORS.accentRed;

                    return (
                      <tr
                        key={item.id}
                        className="row-hover"
                        style={{ borderBottom: `1px solid ${COLORS.border}` }}
                        onMouseEnter={(e) => { if (!isEditing) e.currentTarget.style.background = COLORS.bgHover; }}
                        onMouseLeave={(e) => { if (!isEditing) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editData.categoria ?? ''}
                              onChange={e => setEditData(prev => ({ ...prev, categoria: e.target.value }))}
                              className="w-full px-3 py-1.5 rounded-lg text-sm outline-none input-focus"
                              style={{ background: COLORS.bgGlobal, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }}
                            />
                          ) : (
                            <p className="text-sm font-semibold" style={{ color: COLORS.textPrimary }}>{item.categoria}</p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editData.custoUsd ?? ''}
                              onChange={e => setEditData(prev => ({ ...prev, custoUsd: parseFloat(e.target.value) || 0 }))}
                              className="w-full px-3 py-1.5 rounded-lg text-sm outline-none input-focus"
                              style={{ background: COLORS.bgGlobal, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }}
                            />
                          ) : (
                            <p className="text-sm font-bold" style={{ color: COLORS.textPrimary }}>$ {custoUsd.toFixed(2)}</p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-bold" style={{ color: COLORS.textPrimary }}>
                            {cotacaoEfetiva > 0 ? `R$ ${custoReais.toFixed(2)}` : '—'}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <div>
                              {/* Toggle */}
                              <div className="flex rounded-lg overflow-hidden mb-2" style={{ border: `1px solid ${COLORS.border}` }}>
                                <button
                                  onClick={() => setEditMode('margem')}
                                  className="flex-1 px-2 py-1 text-[10px] font-bold btn-press"
                                  style={{
                                    background: editMode === 'margem' ? COLORS.accent : COLORS.bgGlobal,
                                    color: editMode === 'margem' ? '#fff' : COLORS.textMuted,
                                  }}
                                >
                                  Margem
                                </button>
                                <button
                                  onClick={() => setEditMode('preco')}
                                  className="flex-1 px-2 py-1 text-[10px] font-bold btn-press"
                                  style={{
                                    background: editMode === 'preco' ? COLORS.accent : COLORS.bgGlobal,
                                    color: editMode === 'preco' ? '#fff' : COLORS.textMuted,
                                  }}
                                >
                                  Preco
                                </button>
                              </div>
                              {editMode === 'margem' ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="1"
                                    value={editData.margem ?? ''}
                                    onChange={e => setEditData(prev => ({ ...prev, margem: parseFloat(e.target.value) || 0 }))}
                                    className="w-20 px-3 py-1.5 rounded-lg text-sm outline-none input-focus"
                                    style={{ background: COLORS.bgGlobal, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }}
                                  />
                                  <span className="text-xs" style={{ color: COLORS.textMuted }}>%</span>
                                </div>
                              ) : (
                                <div>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editData.precoSugerido ?? ''}
                                    onChange={e => setEditData(prev => ({ ...prev, precoSugerido: parseFloat(e.target.value) || 0 }))}
                                    className="w-28 px-3 py-1.5 rounded-lg text-sm outline-none input-focus"
                                    style={{ background: COLORS.bgGlobal, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }}
                                  />
                                  {editPreview && (
                                    <p className="text-[10px] mt-1" style={{ color: COLORS.textMuted }}>
                                      Margem: <span style={{ color: editPreview.margem >= 0 ? COLORS.accentGreen : COLORS.accentRed }}>
                                        {editPreview.margem >= 0 ? '+' : ''}{editPreview.margem.toFixed(1)}%
                                      </span>
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
                              style={{ background: margemVal >= 0 ? '#022c22' : '#450a0a', color: margemColor }}
                            >
                              {margemVal >= 0 ? '+' : ''}{margemVal.toFixed(0)}%
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <div>
                              <p className="text-sm font-bold" style={{ color: COLORS.accent }}>
                                {cotacaoEfetiva > 0 ? `R$ ${precoVal.toFixed(2)}` : '—'}
                              </p>
                              {editMode === 'margem' && editPreview && (
                                <p className="text-[10px] mt-0.5" style={{ color: COLORS.textMuted }}>
                                  calculado
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm font-bold" style={{ color: COLORS.accent }}>
                              {cotacaoEfetiva > 0 ? `R$ ${precoVal.toFixed(2)}` : '—'}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-bold" style={{ color: COLORS.accentGreen }}>
                            {cotacaoEfetiva > 0 ? `R$ ${lucroUnit.toFixed(2)}` : '—'}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={saveEdit}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold btn-press"
                                style={{ background: '#022c22', color: COLORS.accentGreen }}
                              >
                                Salvar
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold btn-press"
                                style={{ background: 'transparent', color: COLORS.textMuted, border: `1px solid ${COLORS.border}` }}
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => startEdit(item)}
                                className="p-2 rounded-lg icon-btn"
                                style={{ color: COLORS.accent }}
                                title="Editar"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setDeletingId(item.id)}
                                className="p-2 rounded-lg icon-btn"
                                style={{ color: COLORS.accentRed }}
                                title="Excluir"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y" style={{ borderColor: COLORS.border }}>
              {items.map((item) => {
                const isEditing = editingId === item.id;
                const custoUsd = isEditing ? (editData.custoUsd ?? item.custoUsd) : item.custoUsd;
                const margemVal = isEditing ? (editPreview?.margem ?? item.margem) : item.margem;
                const precoVal = isEditing ? (editPreview?.preco ?? item.precoSugerido) : item.precoSugerido;
                const custoReais = cotacaoEfetiva > 0 ? calcCustoReais(custoUsd, cotacaoEfetiva) : 0;
                const lucroUnit = cotacaoEfetiva > 0 ? calcLucroUnit(precoVal, custoUsd, cotacaoEfetiva) : 0;
                const margemColor = margemVal >= 0 ? COLORS.accentGreen : COLORS.accentRed;

                return (
                  <div key={item.id} className="p-4 space-y-3">
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={editData.categoria ?? ''}
                          onChange={e => setEditData(prev => ({ ...prev, categoria: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg text-sm outline-none input-focus"
                          style={{ background: COLORS.bgGlobal, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }}
                        />
                        <div>
                          <label className="text-[10px] font-bold uppercase" style={{ color: COLORS.textMuted }}>Custo USD</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editData.custoUsd ?? ''}
                            onChange={e => setEditData(prev => ({ ...prev, custoUsd: parseFloat(e.target.value) || 0 }))}
                            className="w-full px-3 py-2 rounded-lg text-sm outline-none input-focus mt-1"
                            style={{ background: COLORS.bgGlobal, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }}
                          />
                        </div>

                        {/* Toggle Margem/Preco */}
                        <div>
                          <label className="text-[10px] font-bold uppercase mb-1 block" style={{ color: COLORS.textMuted }}>Modo</label>
                          <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
                            <button
                              onClick={() => setEditMode('margem')}
                              className="flex-1 px-3 py-1.5 text-xs font-bold btn-press"
                              style={{
                                background: editMode === 'margem' ? COLORS.accent : COLORS.bgGlobal,
                                color: editMode === 'margem' ? '#fff' : COLORS.textMuted,
                              }}
                            >
                              Editar Margem
                            </button>
                            <button
                              onClick={() => setEditMode('preco')}
                              className="flex-1 px-3 py-1.5 text-xs font-bold btn-press"
                              style={{
                                background: editMode === 'preco' ? COLORS.accent : COLORS.bgGlobal,
                                color: editMode === 'preco' ? '#fff' : COLORS.textMuted,
                              }}
                            >
                              Editar Preco
                            </button>
                          </div>
                        </div>

                        {editMode === 'margem' ? (
                          <div>
                            <label className="text-[10px] font-bold uppercase" style={{ color: COLORS.textMuted }}>Margem %</label>
                            <div className="flex items-center gap-1 mt-1">
                              <input
                                type="number"
                                step="1"
                                value={editData.margem ?? ''}
                                onChange={e => setEditData(prev => ({ ...prev, margem: parseFloat(e.target.value) || 0 }))}
                                className="w-24 px-3 py-2 rounded-lg text-sm outline-none input-focus"
                                style={{ background: COLORS.bgGlobal, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }}
                              />
                              <span className="text-xs" style={{ color: COLORS.textMuted }}>%</span>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="text-[10px] font-bold uppercase" style={{ color: COLORS.textMuted }}>Preco Sugerido (R$)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editData.precoSugerido ?? ''}
                              onChange={e => setEditData(prev => ({ ...prev, precoSugerido: parseFloat(e.target.value) || 0 }))}
                              className="w-full px-3 py-2 rounded-lg text-sm outline-none input-focus mt-1"
                              style={{ background: COLORS.bgGlobal, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }}
                            />
                          </div>
                        )}

                        {editPreview && (
                          <div
                            className="p-2 rounded-lg text-center text-sm font-bold"
                            style={{
                              background: editPreview.margem >= 0 ? '#022c22' : '#450a0a',
                              color: editPreview.margem >= 0 ? COLORS.accentGreen : COLORS.accentRed,
                            }}
                          >
                            Preco: R$ {editPreview.preco.toFixed(2)} | Lucro: R$ {editPreview.lucro.toFixed(2)}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={saveEdit}
                            className="flex-1 px-3 py-2 rounded-lg text-xs font-bold btn-press"
                            style={{ background: '#022c22', color: COLORS.accentGreen }}
                          >
                            Salvar
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex-1 px-3 py-2 rounded-lg text-xs font-bold btn-press"
                            style={{ background: 'transparent', color: COLORS.textMuted, border: `1px solid ${COLORS.border}` }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold" style={{ color: COLORS.textPrimary }}>{item.categoria}</p>
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
                            style={{ background: margemVal >= 0 ? '#022c22' : '#450a0a', color: margemColor }}
                          >
                            {margemVal >= 0 ? '+' : ''}{margemVal.toFixed(0)}%
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span style={{ color: COLORS.textMuted }}>Custo USD: </span>
                            <span className="font-mono" style={{ color: COLORS.textPrimary }}>$ {custoUsd.toFixed(2)}</span>
                          </div>
                          <div>
                            <span style={{ color: COLORS.textMuted }}>Custo R$: </span>
                            <span className="font-mono" style={{ color: COLORS.textPrimary }}>
                              {cotacaoEfetiva > 0 ? `R$ ${custoReais.toFixed(2)}` : '—'}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: COLORS.textMuted }}>Preco: </span>
                            <span className="font-mono" style={{ color: COLORS.accent }}>
                              {cotacaoEfetiva > 0 ? `R$ ${precoVal.toFixed(2)}` : '—'}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: COLORS.textMuted }}>Lucro: </span>
                            <span className="font-mono" style={{ color: COLORS.accentGreen }}>
                              {cotacaoEfetiva > 0 ? `R$ ${lucroUnit.toFixed(2)}` : '—'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(item)}
                            className="flex-1 px-3 py-2 rounded-lg text-xs font-bold btn-press flex items-center justify-center gap-1"
                            style={{ background: '#1e1b4b', color: COLORS.accent }}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                            Editar
                          </button>
                          <button
                            onClick={() => setDeletingId(item.id)}
                            className="px-3 py-2 rounded-lg text-xs font-bold btn-press flex items-center justify-center gap-1"
                            style={{ background: '#450a0a', color: COLORS.accentRed }}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                            Excluir
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </>
      )}
    </div>
  );
}
