import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { tursoService } from '../../lib/turso';
import { Order } from '../../types';
import { X, Package, Clock, CheckCircle2, XCircle, Search, Truck, Box, Calendar, LogOut, Lock, KeyRound, User, AlertCircle } from 'lucide-react';

interface MyOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToStudio: () => void;
  onOpenCustomerAuth: () => void;
}

export const MyOrdersModal: React.FC<MyOrdersModalProps> = ({
  isOpen,
  onClose,
  onNavigateToStudio,
  onOpenCustomerAuth,
}) => {
  const { customerUser, logoutCustomer } = useAuth();
  const [orderCodeInput, setOrderCodeInput] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const fetchCustomerOrders = async (email: string) => {
    setIsLoading(true);
    setSearchError(null);
    try {
      const results = await tursoService.getOrdersByCustomerEmail(email);
      setOrders(results);
    } catch (err) {
      console.error('Error fetching customer orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderCodeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderCodeInput.trim()) return;

    setIsLoading(true);
    setSearchError(null);

    try {
      const order = await tursoService.getOrderById(orderCodeInput);
      if (order) {
        setOrders([order]);
      } else {
        setOrders([]);
        setSearchError('No se encontró ningún pedido con el código de seguimiento ingresado. Verifica el código (ej. LITHO-820320).');
      }
    } catch (err) {
      setSearchError('Error al realizar la búsqueda del pedido.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (customerUser?.email) {
      fetchCustomerOrders(customerUser.email);
    } else {
      setOrders([]);
      setSearchError(null);
    }
  }, [customerUser, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 my-6 animate-in fade-in zoom-in duration-200">
        
        {/* Top Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white font-outfit">Consulta Segura de Pedidos Nebulab 3D</h3>
              <p className="text-xs text-slate-400 font-inter">
                {customerUser ? (
                  <span>
                    Bienvenido, <strong className="text-cyan-300">{customerUser.name}</strong> ({customerUser.email})
                  </span>
                ) : (
                  <span>Búsqueda exclusiva por Código de Seguimiento o Sesión</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {customerUser && (
              <button
                onClick={logoutCustomer}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
                title="Cerrar sesión de cliente"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Secure Lookup Form if NOT logged in */}
        {!customerUser && (
          <div className="p-6 bg-slate-950/50 border-b border-slate-800 space-y-4">
            
            <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-cyan-200">
                <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Por privacidad, ingresa tu <strong>Código de Seguimiento</strong> o inicia sesión.</span>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onOpenCustomerAuth();
                }}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-bold transition-all shadow-md shrink-0 flex items-center justify-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                <span>Iniciar Sesión para ver todo</span>
              </button>
            </div>

            <form onSubmit={handleOrderCodeSearch} className="flex items-center gap-3">
              <div className="relative flex-1">
                <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={orderCodeInput}
                  onChange={(e) => setOrderCodeInput(e.target.value)}
                  placeholder="Ingresa el Código de Pedido (ej. LITHO-820320)..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-slate-100 uppercase font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Consultar</span>
              </button>
            </form>

            {searchError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

          </div>
        )}

        {/* Orders List Container */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-cyan-400 space-y-2">
              <div className="w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Consultando base de datos Turso DB...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-4">
              <Box className="w-12 h-12 text-slate-600 mx-auto" />
              <div>
                <p className="text-sm font-bold text-slate-300">
                  {customerUser ? 'No tienes pedidos registrados en tu cuenta' : 'Ingresa tu Código de Pedido o Inicia Sesión'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {customerUser ? 'Crea tu primera litofanía 3D personalizada.' : 'El código de pedido fue generado en tu pantalla de confirmación y resumen de WhatsApp.'}
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onNavigateToStudio();
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 hover:scale-105 transition-all"
              >
                Diseñar Litofanía Ahora
              </button>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="font-mono font-bold text-cyan-400 text-sm">{order.id}</span>
                    <span className="text-xs text-slate-500 ml-3">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Status badge */}
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit ${
                      order.status === 'confirmed'
                        ? 'bg-cyan-950/60 border border-cyan-500/30 text-cyan-400'
                        : order.status === 'processing'
                        ? 'bg-amber-950/60 border border-amber-500/30 text-amber-300'
                        : order.status === 'completed'
                        ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-950/60 border border-rose-500/30 text-rose-400'
                    }`}
                  >
                    {order.status === 'confirmed' && <Clock className="w-3.5 h-3.5" />}
                    {order.status === 'processing' && <Truck className="w-3.5 h-3.5 animate-pulse" />}
                    {order.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {order.status === 'cancelled' && <XCircle className="w-3.5 h-3.5" />}
                    <span className="capitalize">
                      {order.status === 'confirmed'
                        ? 'Pedido Confirmado'
                        : order.status === 'processing'
                        ? 'En Fabricación 3D'
                        : order.status === 'completed'
                        ? 'Entregado'
                        : 'Cancelado'}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  {order.items.map((it, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-slate-300">
                      <div>
                        <span className="font-semibold text-slate-200">
                          Litofanía {it.config.shape === 'arc' ? 'Curva (Arco)' : it.config.shape === 'flat' ? 'Plana' : 'Cilindro'}
                        </span>
                        <span className="text-slate-500 block">
                          Dimensiones: {it.config.width}x{it.config.height}mm • Material: {it.config.material}
                        </span>
                      </div>
                      <span className="font-bold text-slate-100">${it.price.toFixed(2)} USD</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Dirección: {order.shippingDetails.address}, {order.shippingDetails.city}
                  </span>
                  <span className="font-extrabold text-sm text-cyan-300">${order.total.toFixed(2)} USD</span>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
