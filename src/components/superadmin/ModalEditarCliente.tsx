import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Store,
  Award,
  Calendar,
  Save,
  Trash2,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Cliente, BusinessConfig } from '../../types';

interface ModalEditarClienteProps {
  cliente: Cliente;
  negocios: BusinessConfig[];
  onClose: () => void;
  onSave: (id: string, updates: Partial<Cliente>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function ModalEditarCliente({
  cliente,
  negocios,
  onClose,
  onSave,
  onDelete,
}: ModalEditarClienteProps) {
  const [nombre, setNombre] = useState(cliente.nombre || '');
  const [telefono, setTelefono] = useState(cliente.telefono || '');
  const [email, setEmail] = useState(cliente.emailRegistro || '');
  const [direccion, setDireccion] = useState(cliente.direccion || '');
  const [localComercial, setLocalComercial] = useState(cliente.localComercial || '');
  const [zona, setZona] = useState(cliente.zona || '');
  const [tipoSuperficie, setTipoSuperficie] = useState(cliente.tipoSuperficie || 'Vidrieras comerciales');
  const [negocioId, setNegocioId] = useState(cliente.negocioId || 'perfect-glass');
  const [estadoRegistro, setEstadoRegistro] = useState<'aprobado' | 'pendiente' | 'rechazado'>(
    cliente.estadoRegistro || 'aprobado'
  );
  const [activo, setActivo] = useState(cliente.activo !== false);
  const [sellosAcumulados, setSellosAcumulados] = useState(cliente.sellosAcumulados || 0);
  const [sellosNecesarios, setSellosNecesarios] = useState(cliente.sellosNecesarios || 5);
  const [recompensaDisponible, setRecompensaDisponible] = useState(!!cliente.recompensaDisponible);
  const [recompensaDescripcion, setRecompensaDescripcion] = useState(
    cliente.recompensaDescripcion || 'Limpieza de vidrios gratis'
  );
  const [frecuenciaVisitaDias, setFrecuenciaVisitaDias] = useState(cliente.frecuenciaVisitaDias || 30);
  const [notas, setNotas] = useState(cliente.notas || '');

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre del cliente es obligatorio.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(cliente.id, {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        emailRegistro: email.trim(),
        direccion: direccion.trim(),
        localComercial: localComercial.trim(),
        zona: zona.trim(),
        tipoSuperficie: tipoSuperficie.trim(),
        negocioId: negocioId.trim(),
        estadoRegistro,
        activo,
        sellosAcumulados: Number(sellosAcumulados),
        sellosNecesarios: Number(sellosNecesarios),
        recompensaDisponible,
        recompensaDescripcion: recompensaDescripcion.trim(),
        frecuenciaVisitaDias: Number(frecuenciaVisitaDias),
        notas: notas.trim(),
      });
      onClose();
    } catch (err: any) {
      console.error('Error updating client:', err);
      setError(err.message || 'Error al guardar los cambios del cliente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (
      window.confirm(
        `¿Confirmas que deseas eliminar permanentemente al cliente "${cliente.nombre}"? Esta acción no se puede deshacer.`
      )
    ) {
      setIsDeleting(true);
      try {
        await onDelete(cliente.id);
        onClose();
      } catch (err: any) {
        console.error('Error deleting client:', err);
        setError(err.message || 'Error al eliminar cliente.');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Editar Perfil de Cliente (Control Maestro)
              </h3>
              <p className="text-xs text-slate-400 font-mono">ID: {cliente.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Reasignación de Vidriero / Negocio */}
          <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 space-y-1.5">
            <label className="block text-xs font-bold text-indigo-200 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span>Vidriero Asignado (Reasignar si es necesario)</span>
            </label>
            <select
              value={negocioId}
              onChange={(e) => setNegocioId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-indigo-500/40 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {negocios.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nombreNegocio} (ID: {n.id})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-indigo-300/70">
              Como dueño del SaaS puedes transferir clientes entre vidrieros en cualquier momento.
            </p>
          </div>

          {/* Datos Personales y Contacto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Nombre Completo *</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Teléfono / WhatsApp *</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="tel"
                  required
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@ejemplo.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Nombre del Local / Casa</label>
              <div className="relative">
                <Store className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={localComercial}
                  onChange={(e) => setLocalComercial(e.target.value)}
                  placeholder="Ej: Cafetería Dulce Grano"
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Dirección</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Calle 1234"
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Barrio / Zona</label>
              <input
                type="text"
                value={zona}
                onChange={(e) => setZona(e.target.value)}
                placeholder="Ej: Centro, Palermo, San Isidro"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Fidelidad y Sellos (Control Maestro) */}
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Tarjeta de Fidelidad & Sellos</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recompensaDisponible}
                  onChange={(e) => setRecompensaDisponible(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-0"
                />
                <span className="text-xs text-amber-200 font-semibold">
                  ¿Recompensa lista para canjear?
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Sellos Acumulados</label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={sellosAcumulados}
                  onChange={(e) => setSellosAcumulados(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Sellos Necesarios</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={sellosNecesarios}
                  onChange={(e) => setSellosNecesarios(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Premio al completar</label>
                <input
                  type="text"
                  value={recompensaDescripcion}
                  onChange={(e) => setRecompensaDescripcion(e.target.value)}
                  placeholder="Ej: Limpieza gratis"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Estados y Configuración de Servicio */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Estado de Aprobación</label>
              <select
                value={estadoRegistro}
                onChange={(e) => setEstadoRegistro(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="aprobado">Aprobado</option>
                <option value="pendiente">Pendiente</option>
                <option value="rechazado">Rechazado</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Frecuencia de Servicio</label>
              <select
                value={frecuenciaVisitaDias}
                onChange={(e) => setFrecuenciaVisitaDias(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={15}>Cada 15 días (Quincenal)</option>
                <option value={30}>Cada 30 días (Mensual)</option>
                <option value={60}>Cada 60 días (Bimestral)</option>
                <option value={90}>Cada 90 días (Trimestral)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Estado del Cliente</label>
              <select
                value={activo ? 'activo' : 'inactivo'}
                onChange={(e) => setActivo(e.target.value === 'activo')}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo / Pausado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Notas Internas</label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Indicaciones sobre vidrios, horarios preferidos o llaves..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Acciones */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
            {onDelete ? (
              <button
                type="button"
                disabled={isDeleting || isSaving}
                onClick={handleDelete}
                className="px-3.5 py-2 text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-800/40 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Eliminando...' : 'Eliminar Cliente'}</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving || isDeleting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
