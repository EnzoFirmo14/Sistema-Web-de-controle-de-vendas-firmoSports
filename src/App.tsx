import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import logo from './Design_sem_nome__2_-removebg-preview.png';
import { Batch, Order, DashboardStats, BatchStatus, OrderStatus } from './types';

// Components
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Orders from './components/Orders';
import Batches from './components/Batches';
import NewOrderForm from './components/NewOrderForm';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          setEditingOrder(null);
          if (activeTab === 'new-order') setActiveTab('orders');
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          setEditingOrder(null);
          setActiveTab('new-order');
          break;
        case 'l':
          e.preventDefault();
          setActiveTab('batches');
          break;
        case 'd':
          e.preventDefault();
          setActiveTab('dashboard');
          break;
        case 'p':
          e.preventDefault();
          setActiveTab('orders');
          break;
        case 'escape':
          setEditingOrder(null);
          if (activeTab === 'new-order') setActiveTab('orders');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [activeTab]);

  // Data Listeners
  useEffect(() => {
    if (!user) return;

    const batchesQuery = query(
      collection(db, 'batches'),
      where('ownerId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const ordersQuery = query(
      collection(db, 'orders'),
      where('ownerId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubBatches = onSnapshot(batchesQuery, (snapshot) => {
      const batchData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Batch))
        .sort((a, b) => (b.date?.toMillis?.() || 0) - (a.date?.toMillis?.() || 0));
      setBatches(batchData);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'batches'));

    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      const orderData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order))
        .sort((a, b) => (b.date?.toMillis?.() || 0) - (a.date?.toMillis?.() || 0));
      setOrders(orderData);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'orders'));

    return () => {
      unsubBatches();
      unsubOrders();
    };
  }, [user]);

  // Dashboard Stats Calculation
  const stats = useMemo<DashboardStats>(() => {
    const statusCounts: Record<string, number> = { 'Pendente': 0, 'Enviado ao fornecedor': 0, 'A caminho': 0, 'Recebido': 0 };
    const batchCounts: Record<string, number> = {};
    const shirtCounts: Record<string, number> = {};
    const sizeCounts: Record<string, number> = {};
    const clientCounts: Record<string, number> = {};

    orders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      
      const batch = batches.find(b => b.id === order.batchId);
      const batchName = batch?.name || 'Sem Envio';
      batchCounts[batchName] = (batchCounts[batchName] || 0) + 1;

      shirtCounts[order.shirtName] = (shirtCounts[order.shirtName] || 0) + 1;
      sizeCounts[order.size] = (sizeCounts[order.size] || 0) + 1;
      clientCounts[order.clientName] = (clientCounts[order.clientName] || 0) + 1;
    });

    return {
      totalShirts: orders.length,
      ordersByStatus: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
      ordersByBatch: Object.entries(batchCounts).map(([name, count]) => ({ name, count })),
      mostSoldShirts: Object.entries(shirtCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      mostRequestedSizes: Object.entries(sizeCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      ordersByClient: Object.entries(clientCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    };
  }, [orders, batches]);

  // CRUD Actions
  const handleCreateBatch = async (name: string, dollarRate: number, date: Date) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'batches'), {
        name,
        date: date,
        status: 'Aberto',
        ownerId: user.uid,
        dollarRate: dollarRate
      });
      setActiveTab('batches');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'batches');
    }
  };

  const handleUpdateBatchStatus = async (id: string, status: BatchStatus) => {
    try {
      await updateDoc(doc(db, 'batches', id), { status });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `batches/${id}`);
    }
  };

  const handleUpdateBatch = async (id: string, data: Partial<Batch>) => {
    try {
      await updateDoc(doc(db, 'batches', id), data);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `batches/${id}`);
    }
  };

  const handleDeleteBatch = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'batches', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `batches/${id}`);
    }
  };

  const handleSaveOrder = async (orderData: Partial<Order>) => {
    if (!user) return;
    try {
      const finalData = {
        ...orderData,
        isPaid: orderData.isPaid ?? false,
        paidAmount: orderData.paidAmount ?? 0,
        isStock: orderData.isStock ?? false,
      };

      if (editingOrder) {
        await updateDoc(doc(db, 'orders', editingOrder.id), {
          ...finalData,
          date: editingOrder.date // Keep original date
        });
      } else {
        await addDoc(collection(db, 'orders'), {
          ...finalData,
          date: serverTimestamp(),
          ownerId: user.uid,
        });
      }
      setEditingOrder(null);
      setActiveTab('orders');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'orders');
    }
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'orders', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `orders/${id}`);
    }
  };

  const handleDuplicateOrder = async (order: Order) => {
    if (!user) return;
    try {
      const { id, date, ...rest } = order;
      await addDoc(collection(db, 'orders'), {
        ...rest,
        shirtName: `${rest.shirtName} (Cópia)`,
        date: serverTimestamp(),
        status: 'Pendente',
        isPaid: false,
        paidAmount: 0,
        ownerId: user.uid,
      });
      setActiveTab('orders');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'orders');
    }
  };

  const handleDuplicateBatch = async (batch: Batch) => {
    if (!user) return;
    try {
      const { id, date, ...rest } = batch;
      await addDoc(collection(db, 'batches'), {
        ...rest,
        name: `${rest.name} (Cópia)`,
        date: serverTimestamp(),
        status: 'Aberto',
        ownerId: user.uid,
      });
      setActiveTab('batches');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'batches');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
      />
      
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Top Bar */}
        <div className="lg:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 sticky top-0 z-40 flex items-center justify-between transition-colors duration-300">
          <div className="flex items-center gap-2">
            <img 
              src={logo} 
              alt="Logo" 
              className="w-8 h-8 object-contain"
            />
            <span className="font-bold text-lg text-slate-900 dark:text-white">Firmo Sports</span>
          </div>
        </div>

        <div className="p-4 md:p-8 pb-24 lg:pb-8">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard stats={stats} orders={orders} />}
          
          {activeTab === 'orders' && (
            <Orders 
              orders={orders} 
              batches={batches}
              onEdit={(order) => {
                setEditingOrder(order);
                setActiveTab('new-order');
              }}
              onDelete={handleDeleteOrder}
              onDuplicate={handleDuplicateOrder}
              onUpdateStatus={(id, data) => {
                if (typeof data === 'string') {
                  updateDoc(doc(db, 'orders', id), { status: data });
                } else {
                  updateDoc(doc(db, 'orders', id), data);
                }
              }}
            />
          )}

          {activeTab === 'batches' && (
            <Batches 
              batches={batches}
              orders={orders}
              onCreate={handleCreateBatch}
              onUpdateStatus={handleUpdateBatchStatus}
              onUpdateTax={(id, tax) => {
                updateDoc(doc(db, 'batches', id), { taxAmount: tax });
              }}
              onDelete={handleDeleteBatch}
              onDuplicate={handleDuplicateBatch}
              onUpdateBatch={handleUpdateBatch}
            />
          )}

          {activeTab === 'new-order' && (
            <NewOrderForm 
              batches={batches}
              orders={orders}
              editingOrder={editingOrder}
              onSave={handleSaveOrder}
              onCancel={() => {
                setEditingOrder(null);
                setActiveTab('orders');
              }}
            />
          )}
        </div>
      </div>
    </main>
  </div>
);
}
