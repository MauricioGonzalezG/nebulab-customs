import React, { useState } from 'react';
import { Order, OrderLogEntry } from '../../types';
import { tursoService } from '../../lib/turso';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  History,
  FileText,
  Clock,
  User,
  CreditCard,
  Mail,
  RefreshCw,
  Plus,
  Tag,
  MessageSquare,
} from 'lucide-react';

interface OrderLogsModalProps {
  order: Order;
  onClose: () => void;
  onOrderUpdated?: (updatedOrder: Order) => void;
}

export const OrderLogsModal: React.FC<OrderLogsModalProps> = ({
  order,
  onClose,
  onOrderUpdated,
}) => {
  const { adminUser } = useAuth();
  const [logs, setLogs] = useState<OrderLogEntry[]>(order.logs || []);
  const [newNote, setNewNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | OrderLogEntry['type']>('all');

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setIsSavingNote(true);
    try {
      const adminEmail = adminUser?.email || 'Administrador';
      const createdEntry = await tursoService.addOrderLog(order.id, {
        type: 'note',
        title: 'Nota Administrativa',
        description: newNote.trim(),
        actor: `Admin (${adminEmail})`,
      });

      const updatedLogs = [createdEntry, ...logs];
      setLogs(updatedLogs);
      setNewNote('');

      if (onOrderUpdated) {
        onOrderUpdated({
          ...order,
          logs: updatedLogs,
        });
      }
    } catch (err) {
      alert('Error al guardar la nota en el historial.');
    } finally {
      setIsSavingNote(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (selectedFilter === 'all') return true;
    return log.type === selectedFilter;
  });

  const getLogTypeBadge = (type: OrderLogEntry['type']) => {
    switch (type) {
      case 'status_change':
        return {
          label: 'Estado',
          icon: <RefreshCw className="w-3.5 h-3.5" />,
          bgColor: 'bg-violet-500/10 border-violet-500/30 text-violet-400',
        };
      case 'payment_update':
        return {
          label: 'Pago',
          icon: <CreditCard className="w-3.5 h-3.5" />,
          bgColor: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        };
      case 'email_sent':
        return {
          label: 'Correo',
          icon: <Mail className="w-3.5 h-3.5" />,
          bgColor: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
        };
      case 'note':
        return {
          label: 'Nota Interna',
          icon: <FileText className="w-3.5 h-3.5" />,
          bgColor: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        };
      case 'system':
      default:
        return {
          label: 'Sistema',
          icon: <Tag className="w-3.5 h-3.5" />,
          bgColor: 'bg-slate-800 border-slate-700 text-slate-300',
        };
    }
  };

  const formatLogDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch (e) {
      return dateString;
    }
  };

  const getRelativeTime = (dateString: string) => {
    try {
      const now = Date.now();
      const diffMs = now - new Date(dateString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Justo ahora';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      if (diffDays === 1) return 'Ayer';
      return `Hace ${diffDays} días`;
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 my-auto flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-lg text-white font-outfit">
                  Historial de Auditoría & Notas
                </h3>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-cyan-300 font-bold">
                  {order.id}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cliente: <span className="text-slate-200 font-semibold">{order.shippingDetails?.fullName}</span> • {logs.length} registro(s)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add Note Bar */}
        <div className="p-5 border-b border-slate-800/80 bg-slate-950/40 shrink-0">
          <form onSubmit={handleAddNote} className="space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>Añadir Nota o Comentario Interno</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Escribe una observación (ej: Cliente confirmó dirección, enviado por Servientrega #guía, modificado soporte...)"
                className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="submit"
                disabled={isSavingNote || !newNote.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 shadow-lg shadow-amber-500/15"
              >
                <Plus className={`w-4 h-4 ${isSavingNote ? 'animate-spin' : ''}`} />
                <span>{isSavingNote ? 'Guardando...' : 'Guardar Nota'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Filter Badges */}
        <div className="px-5 py-3 border-b border-slate-800/60 flex items-center gap-1.5 overflow-x-auto bg-slate-900/60 shrink-0">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 shrink-0">
            Filtrar:
          </span>
          {[
            { id: 'all', label: 'Todos', count: logs.length },
            { id: 'status_change', label: 'Estados', count: logs.filter((l) => l.type === 'status_change').length },
            { id: 'payment_update', label: 'Pagos', count: logs.filter((l) => l.type === 'payment_update').length },
            { id: 'email_sent', label: 'Correos', count: logs.filter((l) => l.type === 'email_sent').length },
            { id: 'note', label: 'Notas', count: logs.filter((l) => l.type === 'note').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id as any)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedFilter === tab.id
                  ? 'bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-md'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-black/30 font-mono">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Timeline Log List */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm flex flex-col items-center justify-center gap-2">
              <History className="w-8 h-8 opacity-40 text-slate-400" />
              <span>No hay registros en esta categoría.</span>
            </div>
          ) : (
            filteredLogs.map((log, idx) => {
              const badge = getLogTypeBadge(log.type);
              const relative = getRelativeTime(log.timestamp);

              return (
                <div
                  key={log.id || idx}
                  className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all space-y-2 relative group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 ${badge.bgColor}`}
                      >
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                      <h4 className="text-sm font-bold text-white">
                        {log.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono shrink-0">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{formatLogDate(log.timestamp)}</span>
                      {relative && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {relative}
                        </span>
                      )}
                    </div>
                  </div>

                  {log.description && (
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans pl-1">
                      {log.description}
                    </p>
                  )}

                  {log.actor && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                      <User className="w-3 h-3 text-cyan-400" />
                      <span>Registrado por:</span>
                      <strong className="text-slate-200">{log.actor}</strong>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>
            Orden creada el: <strong className="text-slate-200">{formatLogDate(order.createdAt)}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
