import { Timestamp } from 'firebase/firestore';

export type BatchStatus = 'Aberto' | 'Enviado' | 'Finalizado';
export type OrderStatus = 'Pendente' | 'Enviado ao fornecedor' | 'A caminho' | 'Recebido';

export interface Batch {
  id: string;
  name: string;
  date: Timestamp;
  status: BatchStatus;
  ownerId: string;
  taxAmount?: number;
  dollarRate?: number;
  trackingCode?: string;
}

export interface Order {
  id: string;
  shirtName: string;
  model: string;
  size: string;
  quantity?: number;
  personalization?: string;
  clientName: string;
  photoUrl?: string;
  date: Timestamp;
  status: OrderStatus;
  batchId: string;
  ownerId: string;
  priceUsd: number;
  priceBrl: number;
  isPaid: boolean;
  paidAmount?: number;
  isStock?: boolean;
  notes?: string;
}

export interface Divida {
  id: string;
  descricao: string;
  valor: number;
  paraQuem: string;
  data: string;
  pago: boolean;
}

export interface PrecoItem {
  id: string;
  categoria: string;
  custoUsd: number;
  margem: number;
  precoSugerido: number;
}

export interface DashboardStats {
  totalShirts: number;
  totalRevenue: number;
  totalPaid: number;
  totalPending: number;
  stockCount: number;
  ordersByStatus: { name: string; value: number }[];
  ordersByBatch: { name: string; count: number }[];
  mostSoldShirts: { name: string; count: number }[];
  mostRequestedSizes: { name: string; count: number }[];
  ordersByClient: { name: string; count: number }[];
}
