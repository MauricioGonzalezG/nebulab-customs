import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { tursoService, CustomerWithMetrics } from '../../lib/turso';
import { Order, CartItem } from '../../types';
import { downloadLithophaneSTL } from '../../core/stlExporter';
import { downloadClickerSTL } from '../../core/clickerStlExporter';
import { downloadClicker3MF } from '../../core/clicker3mfExporter';
import { processImageForLithophane, createPlaceholderImage, ProcessedImageData } from '../../core/imageProcessor';
import { processClickerImage, ProcessedClickerData } from '../../core/clickerProcessor';
import { processCollarImage, ProcessedCollarData } from '../../core/collarProcessor';
import { LithophaneViewer } from '../3d/LithophaneViewer';
import { ClickerViewer } from '../3d/ClickerViewer';
import { CollarViewer } from '../3d/CollarViewer';

import { downloadOrderImage } from '../../lib/imageDownloader';

import {
  LayoutDashboard,
  LogOut,
  Database,
  RefreshCw,
  Search,
  CheckCircle2,
  Package,
  DollarSign,
  Box,
  Download,
  Eye,
  X,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Sliders,
  Users,
  Key,
  Image as ImageIcon,
} from 'lucide-react';

interface AdminDashboardProps {
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const { adminUser, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<CustomerWithMetrics[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mainTab, setMainTab] = useState<'orders' | 'customers'>('orders');

  const [dbStatus, setDbStatus] = useState<{ connected: boolean; mode: string; url: string; info: string }>({
    connected: false,
    mode: 'Cargando...',
    url: '',
    info: '',
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedOrderItem, setSelectedOrderItem] = useState<{ order: Order; item: CartItem } | null>(null);

  // 3D Preview state for selected order item
  const [previewProcessedData, setPreviewProcessedData] = useState<ProcessedImageData | null>(null);
  const [previewClickerProcessedData, setPreviewClickerProcessedData] = useState<ProcessedClickerData | null>(null);
  const [previewCollarProcessedData, setPreviewCollarProcessedData] = useState<ProcessedCollarData | null>(null);
  const [isProcessing3D, setIsProcessing3D] = useState(false);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [fetchedOrders, status] = await Promise.all([
        tursoService.getOrders(),
        tursoService.getDbStatus(),
      ]);
      setOrders(fetchedOrders);
      setDbStatus(status);

      const fetchedCustomers = await tursoService.getCustomersWithMetrics(fetchedOrders);
      setCustomers(fetchedCustomers);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Handle status update
  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    try {
      await tursoService.updateOrderStatus(orderId, newStatus);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    } catch (err) {
      alert('Error al actualizar el estado de la orden.');
    }
  };

  const [downloadingImageKey, setDownloadingImageKey] = useState<string | null>(null);

  // On-demand download of item image from Turso DB / LocalStorage
  const handleDownloadItemImage = async (orderId: string, itemId: string, itemType?: string) => {
    const imageKey = `${orderId}_${itemId}`;
    setDownloadingImageKey(imageKey);
    try {
      const { imageData } = await tursoService.getOrderImage(orderId, itemId);
      if (imageData && imageData !== '[STORED_IN_TURSO]') {
        const ext = imageData.startsWith('data:image/png')
          ? 'png'
          : imageData.startsWith('data:image/webp')
          ? 'webp'
          : 'jpg';
        const filename = `foto_${itemType || 'producto'}_${orderId}_${itemId}.${ext}`;
        downloadOrderImage(imageData, filename);
      } else {
        alert('No se encontró la imagen original almacenada para este producto.');
      }
    } catch (err) {
      console.error('Error al descargar imagen:', err);
      alert('Error al consultar la imagen desde Turso DB.');
    } finally {
      setDownloadingImageKey(null);
    }
  };

  // When admin inspects an order item
  const handleInspectItem = async (order: Order, item: CartItem) => {
    setSelectedOrderItem({ order, item });
    setIsProcessing3D(true);

    try {
      let sourceUrl =
        (item.itemType === 'collar' ? item.collarConfig?.imageUrl : item.itemType === 'clicker' ? item.clickerConfig?.imageUrl : item.config?.imageUrl) ||
        item.previewImageDataUrl ||
        '';

      if (!sourceUrl || sourceUrl === '[STORED_IN_TURSO]') {
        const fetched = await tursoService.getOrderImage(order.id, item.id);
        if (fetched.imageData) {
          sourceUrl = fetched.imageData;
        } else if (fetched.previewData) {
          sourceUrl = fetched.previewData;
        }
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      if (item.itemType === 'collar' && item.collarConfig) {
        img.src = sourceUrl;
        img.onload = () => {
          const processed = processCollarImage(img, item.collarConfig!);
          setPreviewCollarProcessedData(processed);
          setIsProcessing3D(false);
        };
        img.onerror = () => {
          setIsProcessing3D(false);
        };
      } else if (item.itemType === 'clicker' && item.clickerConfig) {
        img.src = sourceUrl;
        img.onload = () => {
          const processed = processClickerImage(img, item.clickerConfig!);
          setPreviewClickerProcessedData(processed);
          setIsProcessing3D(false);
        };
        img.onerror = () => {
          setIsProcessing3D(false);
        };
      } else {
        img.src = sourceUrl;
        img.onload = () => {
          const gridRes = item.config?.resolutionMode === 'ultra' ? 450 : item.config?.resolutionMode === 'hd' ? 300 : 180;
          const processed = processImageForLithophane(img, {
            brightness: item.config?.brightness || 0,
            contrast: item.config?.contrast || 0,
            invert: item.config?.invert || false,
            gridResolution: gridRes,
          });
          setPreviewProcessedData(processed);
          setIsProcessing3D(false);
        };

        img.onerror = async () => {
          const placeholderImg = await createPlaceholderImage();
          const gridRes = item.config?.resolutionMode === 'ultra' ? 450 : item.config?.resolutionMode === 'hd' ? 300 : 180;
          const processed = processImageForLithophane(placeholderImg, {
            brightness: item.config?.brightness || 0,
            contrast: item.config?.contrast || 0,
            invert: item.config?.invert || false,
            gridResolution: gridRes,
          });
          setPreviewProcessedData(processed);
          setIsProcessing3D(false);
        };
      }
    } catch (e) {
      console.error('Error processing item preview:', e);
      setIsProcessing3D(false);
    }
  };

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = selectedStatus === 'all' || o.status === selectedStatus;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      o.id.toLowerCase().includes(searchLower) ||
      o.shippingDetails.fullName.toLowerCase().includes(searchLower) ||
      o.shippingDetails.email.toLowerCase().includes(searchLower) ||
      o.shippingDetails.phone.includes(searchLower) ||
      o.shippingDetails.city.toLowerCase().includes(searchLower);

    return matchesStatus && matchesSearch;
  });

  // Filtered customers
  const filteredCustomers = customers.filter((c) => {
    const searchLower = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(searchLower) || c.email.toLowerCase().includes(searchLower) || c.id.toLowerCase().includes(searchLower);
  });

  // KPI Calculations
  const totalRevenue = orders.reduce((acc, o) => (o.status !== 'cancelled' ? acc + o.total : acc), 0);
  const completedOrders = orders.filter((o) => o.status === 'completed').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-inter pb-16">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 px-4 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-600 via-violet-600 to-fuchsia-600 text-white shadow-lg shadow-cyan-500/20">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white font-outfit">Nebulab Admin Studio</h1>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full">
                  Panel Principal
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Administrador actual: <span className="text-cyan-300 font-medium">{adminUser?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Turso Database Badge */}
            <div
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                dbStatus.connected
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
              }`}
              title={dbStatus.info}
            >
              <Database className="w-4 h-4" />
              <span>{dbStatus.mode}</span>
            </div>

            <button
              onClick={fetchDashboardData}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Refrescar datos de Turso DB"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <span>Volver a la Tienda</span>
            </button>

            <button
              onClick={logout}
              className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-8 space-y-8">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ingresos Totales</span>
              <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-white font-outfit">${totalRevenue.toFixed(2)} USD</p>
            <p className="text-xs text-slate-500 mt-1">Calculado sobre órdenes no canceladas</p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Pedidos</span>
              <div className="p-2.5 rounded-2xl bg-violet-500/10 text-violet-400">
                <Package className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-white font-outfit">{orders.length}</p>
            <p className="text-xs text-slate-500 mt-1">Registrados en Turso DB / Local</p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Clientes Registrados</span>
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-white font-outfit">{customers.length}</p>
            <p className="text-xs text-slate-500 mt-1">Cuentas vinculadas a pedidos</p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completados</span>
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-white font-outfit">{completedOrders}</p>
            <p className="text-xs text-slate-500 mt-1">Productos 3D entregados con éxito</p>
          </div>
        </div>

        {/* Tab Switcher: Orders vs Customers */}
        <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 w-fit">
          <button
            onClick={() => { setMainTab('orders'); setSearchTerm(''); }}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              mainTab === 'orders'
                ? 'bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Gestión de Órdenes ({orders.length})</span>
          </button>
          <button
            onClick={() => { setMainTab('customers'); setSearchTerm(''); }}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              mainTab === 'customers'
                ? 'bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Usuarios / Clientes ({customers.length})</span>
          </button>
        </div>

        {/* Tab 1: Orders Table Container */}
        {mainTab === 'orders' ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
            
            {/* Table Controls */}
            <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por ID, cliente, correo o ciudad..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'confirmed', label: 'Confirmados' },
                  { id: 'processing', label: 'En Proceso' },
                  { id: 'completed', label: 'Completados' },
                  { id: 'cancelled', label: 'Cancelados' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedStatus(tab.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedStatus === tab.id
                        ? 'bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-md'
                        : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Orden ID</th>
                    <th className="px-6 py-4">Cliente & Contacto</th>
                    <th className="px-6 py-4">Productos 3D</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        No se encontraron órdenes registradas.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-800/40 transition-colors">
                        
                        {/* Order ID & Date */}
                        <td className="px-6 py-4 font-medium">
                          <div className="font-mono text-cyan-400 font-bold">{order.id}</div>
                          <div className="text-[11px] text-slate-500">
                            {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        {/* Customer Info */}
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-100">{order.shippingDetails.fullName}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span>{order.shippingDetails.email}</span>
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            <span>{order.shippingDetails.city}, {order.shippingDetails.country}</span>
                          </div>
                        </td>

                        {/* Item Count & Details */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-bold text-slate-200">
                              {order.items.length} {order.items.length === 1 ? 'Producto' : 'Productos'}
                            </span>
                            {order.items.map((it, idx) => (
                              <div key={idx} className="flex items-center gap-1">
                                <button
                                  onClick={() => handleInspectItem(order, it)}
                                  className={`px-2 py-1 rounded-lg border text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                                    it.itemType === 'collar'
                                      ? 'bg-rose-950/60 border-rose-800/50 text-rose-300 hover:bg-rose-900/60'
                                      : it.itemType === 'clicker'
                                      ? 'bg-violet-950/60 border-violet-800/50 text-violet-300 hover:bg-violet-900/60'
                                      : 'bg-cyan-950/60 border-cyan-800/50 text-cyan-300 hover:bg-cyan-900/60'
                                  }`}
                                  title="Inspeccionar parámetros 3D"
                                >
                                  {it.itemType === 'clicker' ? <Key className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  <span>
                                    {it.itemType === 'collar' && it.collarConfig
                                      ? `Collar ${it.collarConfig.petName || 'Mascota'} (${it.collarConfig.size})`
                                      : it.itemType === 'clicker' && it.clickerConfig
                                      ? `${it.clickerConfig.type === 'clicker' ? 'Clicker MX' : 'Llavero'} (${it.clickerConfig.size}mm)`
                                      : `Litofanía ${it.config?.shape === 'arc' ? 'Curva' : it.config?.shape === 'flat' ? 'Plana' : 'Cilíndrica'} (${it.config?.width || 120}×${it.config?.height || 100}mm)`}
                                  </span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadItemImage(order.id, it.id, it.itemType);
                                  }}
                                  disabled={downloadingImageKey === `${order.id}_${it.id}`}
                                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                                  title="Descargar Foto Original de Turso DB"
                                >
                                  {downloadingImageKey === `${order.id}_${it.id}` ? (
                                    <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                                  ) : (
                                    <ImageIcon className="w-3 h-3 text-cyan-400" />
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Total */}
                        <td className="px-6 py-4 font-bold text-slate-100">
                          ${order.total.toFixed(2)} USD
                        </td>

                        {/* Status Selector */}
                        <td className="px-6 py-4">
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value as Order['status'])}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold focus:outline-none border cursor-pointer ${
                              order.status === 'confirmed'
                                ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-400'
                                : order.status === 'processing'
                                ? 'bg-amber-950/60 border-amber-500/40 text-amber-400'
                                : order.status === 'completed'
                                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                                : 'bg-rose-950/60 border-rose-500/40 text-rose-400'
                            }`}
                          >
                            <option value="confirmed" className="bg-slate-900 text-slate-200">Confirmada</option>
                            <option value="processing" className="bg-slate-900 text-slate-200">En Proceso</option>
                            <option value="completed" className="bg-slate-900 text-slate-200">Completada</option>
                            <option value="cancelled" className="bg-slate-900 text-slate-200">Cancelada</option>
                          </select>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {order.items.length > 0 && (
                              <>
                                <button
                                  onClick={() =>
                                    handleDownloadItemImage(order.id, order.items[0].id, order.items[0].itemType)
                                  }
                                  disabled={downloadingImageKey === `${order.id}_${order.items[0].id}`}
                                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                                  title="Descargar Foto Original de la Orden"
                                >
                                  {downloadingImageKey === `${order.id}_${order.items[0].id}` ? (
                                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                                  ) : (
                                    <ImageIcon className="w-4 h-4 text-cyan-400" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleInspectItem(order, order.items[0])}
                                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors"
                                  title="Inspeccionar en 3D & Descargar STL"
                                >
                                  <Box className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <a
                              href={`https://wa.me/${order.shippingDetails.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-800/40 hover:bg-emerald-900/60 text-emerald-400 transition-colors"
                              title="Contactar al cliente en WhatsApp"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          </div>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        ) : (
          /* Tab 2: Customers Table Container */
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
            
            {/* Table Controls */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar usuario por nombre o correo..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="text-xs text-slate-400 font-mono hidden sm:block">
                Total registrado: <strong className="text-cyan-400">{filteredCustomers.length} clientes</strong>
              </div>
            </div>

            {/* Customers Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Cliente ID</th>
                    <th className="px-6 py-4">Nombre Completo</th>
                    <th className="px-6 py-4">Correo Electrónico</th>
                    <th className="px-6 py-4">Fecha Registro</th>
                    <th className="px-6 py-4">Pedidos</th>
                    <th className="px-6 py-4 text-right">Total Invertido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        No se encontraron usuarios registrados.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((cust) => (
                      <tr key={cust.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-cyan-400 font-bold">
                          {cust.id}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-100 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-xs">
                            {cust.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{cust.name}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-300 font-mono text-xs">
                          {cust.email}
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs">
                          {new Date(cust.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-200">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-bold text-slate-200">
                            {cust.orderCount} {cust.orderCount === 1 ? 'pedido' : 'pedidos'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-extrabold text-emerald-400 text-right">
                          ${cust.totalSpent.toFixed(2)} USD
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </main>

      {/* Item Inspection & STL Generator Modal */}
      {selectedOrderItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 my-6">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  {selectedOrderItem.item.itemType === 'clicker' ? <Key className="w-5 h-5 text-violet-400" /> : <Box className="w-5 h-5 text-cyan-400" />}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">
                    {selectedOrderItem.item.itemType === 'clicker'
                      ? `Inspección de ${selectedOrderItem.item.clickerConfig?.type === 'clicker' ? 'Clicker Teclado MX 3D' : 'Llavero 3D'}`
                      : 'Inspección de Litofanía 3D'}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">Orden {selectedOrderItem.order.id} • Item {selectedOrderItem.item.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderItem(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content grid */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* 3D View Column */}
              <div className="lg:col-span-7 h-[380px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden relative">
                {isProcessing3D ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-cyan-400 gap-3">
                    <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-semibold">Generando previsualización 3D...</span>
                  </div>
                ) : selectedOrderItem.item.itemType === 'collar' && selectedOrderItem.item.collarConfig ? (
                  <CollarViewer config={selectedOrderItem.item.collarConfig} processedData={previewCollarProcessedData} />
                ) : selectedOrderItem.item.itemType === 'clicker' && selectedOrderItem.item.clickerConfig ? (
                  <ClickerViewer config={selectedOrderItem.item.clickerConfig} processedData={previewClickerProcessedData} />
                ) : (
                  <LithophaneViewer config={selectedOrderItem.item.config} processedData={previewProcessedData} />
                )}
              </div>

              {/* Technical Specifications Column */}
              <div className="lg:col-span-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  Parámetros de Impresión 3D
                </h4>

                {selectedOrderItem.item.itemType === 'collar' && selectedOrderItem.item.collarConfig ? (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-500 block">Nombre Mascota</span>
                      <span className="font-bold text-slate-200 uppercase">{selectedOrderItem.item.collarConfig.petName || 'N/A'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-500 block">Teléfono Grabado</span>
                      <span className="font-bold text-slate-200 font-mono">{selectedOrderItem.item.collarConfig.phoneText || 'N/A'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-500 block">Color Correa</span>
                      <span className="font-bold text-slate-200 uppercase">{selectedOrderItem.item.collarConfig.strapColor}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-500 block">Forma Placa</span>
                      <span className="font-bold text-slate-200 uppercase">{selectedOrderItem.item.collarConfig.plateStyle}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-500 block">Color Placa</span>
                      <span className="font-bold text-slate-200 font-mono">{selectedOrderItem.item.collarConfig.plateColor}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-500 block">Talla Collar</span>
                      <span className="font-bold text-slate-200 uppercase">{selectedOrderItem.item.collarConfig.size}</span>
                    </div>
                  </div>
                ) : selectedOrderItem.item.itemType === 'clicker' && selectedOrderItem.item.clickerConfig ? (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-500 block">Tipo Producto</span>
                      <span className="font-bold text-slate-200 uppercase">{selectedOrderItem.item.clickerConfig.type}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-500 block">Estilo Base</span>
                      <span className="font-bold text-slate-200 uppercase">{selectedOrderItem.item.clickerConfig.baseStyle}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-500 block">Tamaño Ancho</span>
                      <span className="font-bold text-slate-200">{selectedOrderItem.item.clickerConfig.size} mm</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-500 block">Switch MX</span>
                      <span className="font-bold text-slate-200 uppercase">{selectedOrderItem.item.clickerConfig.switchType}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-500 block">Color Tapa</span>
                      <span className="font-bold text-slate-200 font-mono">{selectedOrderItem.item.clickerConfig.baseColor}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-500 block">Color Trazo</span>
                      <span className="font-bold text-slate-200 font-mono">{selectedOrderItem.item.clickerConfig.outlineColor}</span>
                    </div>
                  </div>

                ) : (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-500 block">Geometría</span>
                      <span className="font-bold text-slate-200 uppercase">{selectedOrderItem.item.config?.shape || 'flat'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-500 block">Resolución</span>
                      <span className="font-bold text-slate-200 uppercase">{selectedOrderItem.item.config?.resolutionMode || 'hd'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-500 block">Dimensiones</span>
                      <span className="font-bold text-slate-200">{selectedOrderItem.item.config?.width || 120} x {selectedOrderItem.item.config?.height || 100} mm</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-500 block">Grosor Min / Max</span>
                      <span className="font-bold text-slate-200">{selectedOrderItem.item.config?.minThickness || 0.8} / {selectedOrderItem.item.config?.maxThickness || 3.2} mm</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-500 block">Soporte Base</span>
                      <span className="font-bold text-slate-200">{selectedOrderItem.item.config?.baseType || 'none'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-500 block">Material Filament</span>
                      <span className="font-bold text-slate-200">{selectedOrderItem.item.config?.material || 'white-pla'}</span>
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/40 text-xs space-y-1 text-cyan-200">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Envío al Cliente:
                  </div>
                  <p>{selectedOrderItem.order.shippingDetails.fullName} ({selectedOrderItem.order.shippingDetails.phone})</p>
                  <p>{selectedOrderItem.order.shippingDetails.address}, {selectedOrderItem.order.shippingDetails.city}</p>
                </div>

                {/* 3D Export & Image Download Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      handleDownloadItemImage(
                        selectedOrderItem.order.id,
                        selectedOrderItem.item.id,
                        selectedOrderItem.item.itemType
                      );
                    }}
                    disabled={
                      downloadingImageKey === `${selectedOrderItem.order.id}_${selectedOrderItem.item.id}`
                    }
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs border border-cyan-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {downloadingImageKey === `${selectedOrderItem.order.id}_${selectedOrderItem.item.id}` ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                        <span>Consultando Turso DB...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Descargar Foto Original de Referencia</span>
                      </>
                    )}
                  </button>

                  {selectedOrderItem.item.itemType === 'clicker' && selectedOrderItem.item.clickerConfig && (
                    <button
                      onClick={() => {
                        downloadClicker3MF(previewClickerProcessedData, selectedOrderItem.item.clickerConfig!);
                      }}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Descargar Archivo .3MF (Multi-Color Bambu/Orca)</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (selectedOrderItem.item.itemType === 'clicker' && selectedOrderItem.item.clickerConfig) {
                        downloadClickerSTL(previewClickerProcessedData, selectedOrderItem.item.clickerConfig);
                      } else if (previewProcessedData && selectedOrderItem.item.config) {
                        downloadLithophaneSTL(previewProcessedData, selectedOrderItem.item.config);
                      }
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Descargar Archivo STL Monocromático (.stl)</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
