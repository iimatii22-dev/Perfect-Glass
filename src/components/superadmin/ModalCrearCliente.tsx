import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Store,
  Award,
  Plus,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { BusinessConfig } from '../../types';

interface ModalCrearClienteProps {
  negocios: BusinessConfig[];
  preselectedNegocioId?: string;
  onClose: () => void;
  onCreate: (
    negocioId: string,
    data: {
      nombre: string;
      telefono: string;
      email?: string;
      direccion?: string;
      localComercial?: string;
      zona?: string;
      tipoSuperficie?: string;
      frecuenciaVisitaDias?: number;
      sellosAcumulados?: number;
      sellosNecesarios?: number;
      notas?: string;
      estadoRegistro?: 'aprobado' | 'pendiente';
    }
  ) => Promise<void>;
}

export function ModalCrearCliente({
  negocios,
  preselectedNegocioId,
  onClose,
  onCreate,
}: ModalCrearClienteProps) {
  const [negocioId, setNegocioId] = useState(
    preselectedNegocioId || negocios[0]?.id || 'perfect-glass'
  );
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [localComercial, setLocalComercial] = useState('');
  const [zona, setZona] = useState('Centro');
  const [frecuenciaVisitaDias, setFrecuenciaVisitaDias] = useState(30);
  const [sellosAcumulados, setSellosAcumulados] = useState(0);
  const [sellosNecesarios, setSellosNecesarios] = useState(5);
  const [notas, setNotas] = useState('');
  const [estadoRegistro, setEstadoRegistro] = useState<'aprobado' | 'pendiente'>('aprobado');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre del cliente es obligatorio.');
      return;
    }
    if (!telefono.trim()) {
      setError('El teléfono de contacto es obligatorio.');
      return;
    }
    if (!negocioId) {
      setError('Debes seleccionar un vidriero para este cliente.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onCreate(negocioId, {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        email: email.trim(),
        direccion: direccion.trim(),
        localComercial: (localComercial.trim() || nombre.trim()),
        zona: zona.trim(),
        tipoSuperficie: 'Vidrieras comerciales y marquesinas',
        frecuenciaVisitaDias: Number(frecuenciaVisitaDias),
        sellosAcumulados: Number(sellosAcumulados),
        sellosNecesarios: Number(sellosNecesarios),
        notas: notas.trim(),
        estadoRegistro,
      });
      onClose();
    } catch (err: any) {
      console.error('Error creating client:', err);
      setError(err.message || 'Error al registrar el cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 my-8 text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Añadir Cliente a Vidriería (SuperAdmin)
              </h3>
              <p className="text-xs text-slate-400">
                Registra un nuevo cliente bajo cualquier vidriero de la plataforma
              </p>
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
          {/* Negocio destino */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Vidriero Asignado *</span>
            </label>
            <select
              value={negocioId}
              onChange={(e) => setNegocioId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-semibold focus:outline-none focus:border-indigo-500"
            >
              {negocios.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nombreNegocio} (ID: {n.id})
                </option>
              ))}
            </select>
          </div>

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
                  placeholder="Ej: Panadería & Café El Molino"
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
                  placeholder="+54 9 11 1234-5678"
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Correo Electrónico (Opcional)</label>
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
              <label className="block text-slate-300 font-semibold mb-1">Nombre Comercial / Local</label>
              <div className="relative">
                <Store className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={localComercial}
                  onChange={(e) => setLocalComercial(e.target.value)}
                  placeholder="Ej: Local Centro"
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
                  placeholder="Av. Principal 1234"
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Zona / Barrio</label>
              <input
                type="text"
                value={zona}
                onChange={(e) => setZona(e.target.value)}
                placeholder="Ej: Palermo, Centro"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Frecuencia Visita</label>
              <select
                value={frecuenciaVisitaDias}
                onChange={(e) => setFrecuenciaVisitaDias(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={15}>Quincenal (15 días)</option>
                <option value={30}>Mensual (30 días)</option>
                <option value={60}>Bimestral (60 días)</option>
                <option value={90}>Trimestral (90 días)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Sellos Iniciales</label>
              <input
                type="number"
                min={0}
                max={20}
                value={sellosAcumulados}
                onChange={(e) => setSellosAcumulados(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Estado</label>
              <select
                value={estadoRegistro}
                onChange={(e) => setEstadoRegistro(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="aprobado">Aprobado</option>
                <option value="pendiente">Pendiente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Notas Internas</label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Instrucciones sobre tipo de vidrios, llaves o accesos..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Registrando...' : 'Registrar Cliente'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
