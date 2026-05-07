import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { DashboardStats, Order, Batch } from '../types';
import { Package, TrendingUp, Users, CheckCircle, Wallet } from 'lucide-react';

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

// Semantic status colors for pie chart
const STATUS_COLORS: Record<string, string> = {
  'Pendente': '#818cf8',
  'Enviado ao fornecedor': '#a78bfa',
  'A caminho': '#f472b6',
  'Recebido': '#34d399',
};

const tooltipStyle = {
  contentStyle: {
    background: COLORS.bgCard,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '8px',
    color: COLORS.textPrimary,
    fontSize: '13px',
  },
};

export default function Dashboard({ stats, orders, batches }: { stats: DashboardStats; orders: Order[]; batches: Batch[] }) {
  const safeOrders = orders || [];

  // ─── Total Recebido: soma dos pagamentos já recebidos ───────────
  // campo usado: order.paidAmount → representa: valor já pago pelo cliente
  const totalReceived = safeOrders.reduce((acc, o) => acc + (o?.paidAmount || 0), 0);

  // ─── A Receber: preço de venda total − já recebido ─────────────
  // campo usado: order.priceBrl → representa: preço de venda em BRL
  const totalToReceive = safeOrders.reduce((acc, o) => acc + (o?.priceBrl || 0), 0) - totalReceived;

  // ─── Total Gasto: custo real de cada pedido ─────────────────────
  // Fórmula: priceUsd × dollarRate (do batch) × quantity
  // campo usado: order.priceUsd → representa: custo unitário em USD
  // campo usado: batch.dollarRate → representa: cotação do dólar no envio
  // campo usado: order.batchId → link para o batch correspondente
  // campo usado: (order as any).quantity → fallback 1 (não existe no type)
  // campo usado: batch.taxAmount → taxa de envio por batch (somada 1x por batch)
  // NÃO inclui: priceBrl (é preço de venda, não custo)
  // NÃO inclui: pedidos sem batch vinculado (batchId vazio = sem custo de batch)
  const { totalGasto, lucro } = useMemo(() => {
    // Map de batches para lookup rápido
    const batchMap = new Map<string, Batch>();
    (batches || []).forEach(b => batchMap.set(b.id, b));

    // Set de batches já contabilizados para taxAmount (1x por batch)
    const batchesWithTax = new Set<string>();

    const gasto = safeOrders.reduce((acc, o) => {
      // custo unitário em reais = priceUsd × dollarRate
      const batch = o?.batchId ? batchMap.get(o.batchId) : null;
      const dollarRate = batch?.dollarRate || 0;
      const qty = (o as any)?.quantity || 1;
      // campo usado: o.priceUsd → custo unitário em USD
      const custoUnitarioReais = (o?.priceUsd || 0) * dollarRate;
      const custoTotal = custoUnitarioReais * qty;

      // taxAmount do batch: somar 1x por batch
      let tax = 0;
      if (o?.batchId && batch?.taxAmount && !batchesWithTax.has(o.batchId)) {
        batchesWithTax.add(o.batchId);
        tax = batch.taxAmount;
      }

      return acc + custoTotal + tax;
    }, 0);

    return { totalGasto: gasto, lucro: totalReceived - gasto };
  }, [safeOrders, batches, totalReceived]);

  const lucroPositivo = lucro >= 0;

  const statusData = stats?.ordersByStatus || [];
  const sizesData = stats?.mostRequestedSizes || [];
  const shirtsData = (stats?.mostSoldShirts || []).slice(0, 5);

  return (
    <div className="space-y-6 page-enter">
      {/* ─── Cards: 2 grupos visuais ─────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-4" style={{ alignItems: 'stretch' }}>

        {/* ─── Grupo Esquerdo: Financeiro (4 cards, 2×2) ─────────── */}
        <div className="flex-1 min-w-0" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>

          {/* Total Recebido */}
          <div
            className="p-5 rounded-xl card-hover cursor-default"
            style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-medium" style={{ color: COLORS.textMuted }}>Total Recebido</p>
              <CheckCircle className="w-4 h-4" style={{ color: COLORS.accentGreen }} />
            </div>
            <p className="text-[24px] font-black" style={{ color: COLORS.accentGreen }}>
              R$ {totalReceived.toFixed(2)}
            </p>
          </div>

          {/* A Receber */}
          <div
            className="p-5 rounded-xl card-hover cursor-default"
            style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-medium" style={{ color: COLORS.textMuted }}>A Receber</p>
              <Wallet className="w-4 h-4" style={{ color: COLORS.accentAmber }} />
            </div>
            <p className="text-[24px] font-black" style={{ color: COLORS.accentAmber }}>
              R$ {Math.max(0, totalToReceive).toFixed(2)}
            </p>
          </div>

          {/* Total Gasto */}
          <div
            className="p-5 rounded-xl card-hover cursor-default"
            style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-medium" style={{ color: COLORS.textMuted }}>Total Gasto</p>
              <svg className="w-4 h-4" style={{ color: COLORS.accentRed }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511-5.511 3.182m3.182-5.511l-3.182 5.511" />
              </svg>
            </div>
            <p className="text-[24px] font-black" style={{ color: COLORS.accentRed }}>
              R$ {totalGasto.toFixed(2)}
            </p>
          </div>

          {/* Lucro — destaque especial com gradiente condicional */}
          <div
            className="p-5 rounded-xl card-hover cursor-default"
            style={{
              background: lucroPositivo
                ? 'linear-gradient(135deg, #1a2540 0%, #0d2a1f 100%)'
                : 'linear-gradient(135deg, #1a2540 0%, #2a0d0d 100%)',
              border: `1px solid ${lucroPositivo ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`,
              boxShadow: lucroPositivo
                ? '0 0 20px rgba(52, 211, 153, 0.15)'
                : '0 0 20px rgba(248, 113, 113, 0.15)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-medium" style={{ color: lucroPositivo ? COLORS.accentGreen : COLORS.accentRed }}>Lucro</p>
              <svg className="w-5 h-5" style={{ color: lucroPositivo ? COLORS.accentGreen : COLORS.accentRed }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {lucroPositivo ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.286 4.286a11.948 11.948 0 004.306-6.43l.776-2.898m0 0l3.182 5.511-5.511-3.182m3.182 5.511l-3.182-5.511" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511-5.511 3.182m3.182-5.511l-3.182 5.511" />
                )}
              </svg>
            </div>
            <p className="text-[24px] font-black" style={{ color: lucroPositivo ? COLORS.accentGreen : COLORS.accentRed }}>
              {lucro < 0 ? '-' : ''}R$ {Math.abs(lucro).toFixed(2)}
            </p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[11px]" style={{ color: COLORS.textMuted }}>
                Recebido − Gasto
              </p>
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  background: lucroPositivo ? '#022c22' : '#450a0a',
                  color: lucroPositivo ? COLORS.accentGreen : COLORS.accentRed,
                }}
              >
                {lucroPositivo ? '↑ Positivo' : '↓ Negativo'}
              </span>
            </div>
          </div>
        </div>

        {/* ─── Grupo Direito: Operacional (2 cards, empilhados) ───── */}
        <div className="w-full md:w-[32%] min-w-[200px]" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>

          {/* Total de Camisas */}
          <div
            className="p-5 rounded-xl card-hover cursor-default flex flex-col justify-center"
            style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', minHeight: '140px' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-medium" style={{ color: COLORS.textMuted }}>Total de Camisas</p>
              <Package className="w-4 h-4" style={{ color: COLORS.textMuted }} />
            </div>
            <p className="text-[36px] font-black" style={{ color: COLORS.textPrimary }}>
              {stats?.totalShirts || 0}
            </p>
            <p className="text-[11px] mt-1" style={{ color: COLORS.textMuted }}>
              unidades registradas
            </p>
          </div>

          {/* Clientes Ativos */}
          <div
            className="p-5 rounded-xl card-hover cursor-default flex flex-col justify-center"
            style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', minHeight: '140px' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-medium" style={{ color: COLORS.textMuted }}>Clientes Ativos</p>
              <Users className="w-4 h-4" style={{ color: COLORS.textMuted }} />
            </div>
            <p className="text-[36px] font-black" style={{ color: COLORS.textPrimary }}>
              {(stats?.ordersByClient || []).length}
            </p>
            <p className="text-[11px] mt-1" style={{ color: COLORS.textMuted }}>
              clientes com pedidos
            </p>
          </div>
        </div>
      </div>

      {/* Charts Grid — stagger entrance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-children">
        {/* Status Pie */}
        <div
          className="p-5 rounded-xl card-hover"
          style={{
            background: COLORS.bgCard,
            border: `1px solid ${COLORS.border}`,
            minWidth: 0,
          }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: COLORS.textPrimary }}>Status das Camisas</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {statusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={STATUS_COLORS[entry?.name] || COLORS.accent}
                    />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div
            className="flex flex-wrap justify-center gap-3 mt-3"
            style={{ paddingTop: '16px' }}
          >
            {statusData.map((entry, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[entry?.name] || COLORS.accent }}
                />
                <span className="text-xs" style={{ color: COLORS.textMuted, fontSize: '13px' }}>{entry?.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sizes Bar */}
        <div
          className="p-5 rounded-xl card-hover"
          style={{
            background: COLORS.bgCard,
            border: `1px solid ${COLORS.border}`,
            minWidth: 0,
          }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: COLORS.textPrimary }}>Tamanhos mais Pedidos</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sizesData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: COLORS.textMuted, fontSize: 12 }}
                  axisLine={{ stroke: COLORS.border }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: COLORS.textMuted, fontSize: 12 }}
                  axisLine={{ stroke: COLORS.border }}
                  tickLine={false}
                  width={28}
                />
                <Tooltip {...tooltipStyle} />
                <Bar
                  dataKey="count"
                  fill={COLORS.accent}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                  activeBar={{ fill: '#a5b4fc' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Shirts — full width */}
        <div
          className="p-5 rounded-xl lg:col-span-2 card-hover"
          style={{
            background: COLORS.bgCard,
            border: `1px solid ${COLORS.border}`,
            minWidth: 0,
          }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: COLORS.textPrimary }}>Camisas mais Vendidas</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart layout="vertical" data={shirtsData}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={COLORS.border} />
                <XAxis type="number" axisLine={false} tickLine={false} hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: COLORS.textMuted, fontSize: 12 }}
                  width={100}
                />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" fill={COLORS.accent} radius={[0, 6, 6, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
