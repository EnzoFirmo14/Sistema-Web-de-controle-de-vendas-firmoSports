import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  onSnapshot,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, logOut } from './firebase';
import { Batch, Order, DashboardStats, BatchStatus } from './types';
import { StoreProvider } from './context/StoreContext';
import { useStore } from './hooks/useStore';

// Existing components — NOT modified
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Orders from './components/Orders';
import Batches from './components/Batches';
import NewOrderForm from './components/NewOrderForm';
import StoreHeader from './components/StoreHeader';

// New pages
import SetupPage from './pages/SetupPage';
import ProfilePage from './pages/ProfilePage';
import PrecosPage from './pages/PrecosPage';

function AppContent() {
  const { storeInfo, setStoreInfo, loadStoreForUser } = useStore();
  const [user, setUser] = useState<User | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthResolved(true);
    });
    return () => unsubscribe();
  }, []);

  // Load storeInfo for logged-in user
  useEffect(() => {
    if (user?.uid) {
      loadStoreForUser(user.uid);
    }
  }, [user?.uid, loadStoreForUser]);

  // Logout handler — ProfilePage dispatches 'logout-request' custom event
  useEffect(() => {
    const handleLogout = () => {
      logOut();
    };
    window.addEventListener('logout-request', handleLogout);
    return () => window.removeEventListener('logout-request', handleLogout);
  }, []);

  // Keyboard Shortcuts — only work inside main app
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
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

  // Data Listeners — scoped by user.uid
  useEffect(() => {
    if (!user) return;

    const unsubBatches = onSnapshot(collection(db, 'batches'), (snapshot) => {
      const batchData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Batch))
        .sort((a, b) => (b.date?.toMillis?.() || 0) - (a.date?.toMillis?.() || 0));
      setBatches(batchData);
    }, (err) => {
      console.error('[DEBUG] Batches snapshot ERROR:', err.code, err.message);
    });

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const orderData = snapshot.docs.map(d => {
        const data = d.data();
        // quantity may be missing from old documents — default to 1
        if (!data.quantity && data.quantity !== 0) {
          data.quantity = 1;
        }
        return { id: d.id, ...data } as Order;
      })
        .sort((a, b) => (b.date?.toMillis?.() || 0) - (a.date?.toMillis?.() || 0));
      setOrders(orderData);
    }, (err) => {
      console.error('[DEBUG] Orders snapshot ERROR:', err.code, err.message);
    });

    return () => {
      unsubBatches();
      unsubOrders();
    };
  }, [user]);

  const stats: DashboardStats = useMemo(() => {
    const safeOrders = orders || [];
    const totalShirts = safeOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
    const totalRevenue = safeOrders.reduce((sum, o) => sum + ((o.priceBrl || 0) * (o.quantity || 0)), 0);
    const totalPaid = safeOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
    const totalPending = totalRevenue - totalPaid;

    const clientMap: Record<string, number> = {};
    const statusMap: Record<string, number> = {};
    const shirtMap: Record<string, number> = {};
    const sizeMap: Record<string, number> = {};
    const batchMap: Record<string, number> = {};

    for (const o of safeOrders) {
      const qty = o.quantity || 0;
      clientMap[o.clientName || '—'] = (clientMap[o.clientName || '—'] || 0) + qty;
      statusMap[o.status || 'Pendente'] = (statusMap[o.status || 'Pendente'] || 0) + qty;
      shirtMap[o.shirtName || '—'] = (shirtMap[o.shirtName || '—'] || 0) + qty;
      sizeMap[o.size || '—'] = (sizeMap[o.size || '—'] || 0) + qty;
      if (o.batchId) batchMap[o.batchId] = (batchMap[o.batchId] || 0) + qty;
    }

    const stockCount = safeOrders
      .filter(o => o.isStock)
      .reduce((sum, o) => sum + (o.quantity || 0), 0);

    const result = {
      totalShirts,
      totalRevenue,
      totalPaid,
      totalPending,
      stockCount,
      ordersByClient: Array.from(Object.entries(clientMap)).map(([name, count]) => ({ name, count })),
      ordersByStatus: Array.from(Object.entries(statusMap)).map(([name, value]) => ({ name, value })),
      mostSoldShirts: Array.from(Object.entries(shirtMap))
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      mostRequestedSizes: Array.from(Object.entries(sizeMap))
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      ordersByBatch: Array.from(Object.entries(batchMap)).map(([name, count]) => ({ name, count })),
    };
    return result;
  }, [orders]);

  // CRUD Actions
  const handleCreateBatch = async (name: string, dollarRate: number, date: Date, selectedOrderIds: string[]) => {
    if (!user) return;
    try {
      const batchRef = await addDoc(collection(db, 'batches'), {
        name,
        date: date,
        status: 'Aberto',
        ownerId: user.uid,
        dollarRate: dollarRate
      });
      const batchId = batchRef.id;
      const updatePromises = selectedOrderIds.map(orderId =>
        updateDoc(doc(db, 'orders', orderId), { batchId }).catch(err => {
          console.warn(`Failed to link order ${orderId} to batch ${batchId}:`, err.message);
        })
      );
      await Promise.all(updatePromises);
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
      };

      if (editingOrder) {
        await updateDoc(doc(db, 'orders', editingOrder.id), {
          ...finalData,
          date: editingOrder.date
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
        shirtName: rest?.shirtName || '',
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
        name: rest?.name || '',
        date: serverTimestamp(),
        status: 'Aberto',
        ownerId: user.uid,
      });
      setActiveTab('batches');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'batches');
    }
  };

  // ─── Guard: auth not resolved ───
  if (!authResolved) {
    return null;
  }

  // ─── Guard: not authenticated ───
  if (!user) {
    return <Auth />;
  }

  // ─── Guard: storeInfo is the single source of truth ───
  const hasStore = storeInfo !== null && (storeInfo.name?.trim().length || 0) > 0;
  if (!hasStore) {
    return (
      <SetupPage
        uid={user.uid}
        onSave={(uid, data) => {
          setStoreInfo(uid, {
            name: data.name,
            logoUrl: data.logoUrl,
            description: data.description,
          });
        }}
      />
    );
  }

  // ─── Main app ───
  return (
    <div className="flex min-h-screen transition-colors duration-300" style={{ background: '#0f1729' }}>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
      />

      <main className="flex-1 overflow-y-auto">
        {/* Mobile Top Bar */}
        <div
          className="lg:hidden p-4 sticky top-0 z-40 transition-colors duration-300"
          style={{ background: '#1a2540', borderBottom: '1px solid #1e2d4a' }}
        >
          <StoreHeader onOpenProfile={() => setActiveTab('profile')} />
        </div>

        <div className="p-4 md:p-8 pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <Dashboard stats={stats} orders={orders} batches={batches} />}

            {activeTab === 'precos' && <PrecosPage />}

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

            {activeTab === 'profile' && storeInfo && (
              <ProfilePage
                uid={user.uid}
                storeInfo={storeInfo}
                onSave={(uid, data) => {
                  setStoreInfo(uid, data);
                }}
                onClose={() => setActiveTab('dashboard')}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
