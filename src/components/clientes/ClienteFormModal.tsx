import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  MapPin,
  Layers,
  Calendar,
  FileText,
  Camera,
  Upload,
  Sparkles,
  Check,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { Cliente } from '../../types';
import { useConfig } from '../../contexts/ConfigContext';
import { calcularProximaVisita, formatearFecha, getTodayISODate } from '../../utils/dateUtils';
import { uploadClienteFoto } from '../../lib/clientesService';

interface ClienteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clienteData: Omit<Cliente, 'id'>) => Promise<void>;
  initialData?: Cliente | null;
}

const SUPERFICIE_PRESETS = [
  'Ventanas residenciales',
  'Vidrieras comerciales',
  'Cancel de baño / Mamparas',
  'Fachada vidriada en altura',
  'Vidrios interiores y espejos',
  'Techos vidriados y marquesinas',
];

const FRECUENCIA_PRESETS = [
  { dias: 30, label: '30 días (Mensual)' },
  { dias: 60, label: '60 días (Bimestral)' },
  { dias: 90, label: '90 días (Trimestral)' },
  { dias: 15, label: '15 días (Quincenal)' },
];

export function ClienteFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: ClienteFormModalProps) {
  const { config } = useConfig();
  const primaryColor = config.colorPrimario || '#0284c7';

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [zona, setZona] = useState('');
  const [tipoSuperficie, setTipoSuperficie] = useState('Ventanas residenciales');
  const [customSuperficie, setCustomSuperficie] = useState('');
  const [isCustomSuperficie, setIsCustomSuperficie] = useState(false);
  
  const [frecuenciaVisitaDias, setFrecuenciaVisitaDias] = useState(30);
  const [customFrecuencia, setCustomFrecuencia] = useState<number | ''>('');
  const [isCustomFrecuencia, setIsCustomFrecuencia] = useState(false);

  const [duracionServicioMinutos, setDuracionServicioMinutos] = useState<number>(30);

  const [fechaUltimaVisita, setFechaUltimaVisita] = useState(getTodayISODate());
  const [notas, setNotas] = useState('');
  const [fotoAntes, setFotoAntes] = useState<string | undefined>(undefined);
  const [fotoDespues, setFotoDespues] = useState<string | undefined>(undefined);
  const [activo, setActivo] = useState(true);

  const [uploadingAntes, setUploadingAntes] = useState(false);
  const [uploadingDespues, setUploadingDespues] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setNombre(initialData.nombre || '');
      setTelefono(initialData.telefono || '');
      setDireccion(initialData.direccion || '');
      setZona(initialData.zona || '');
      
      if (SUPERFICIE_PRESETS.includes(initialData.tipoSuperficie)) {
        setTipoSuperficie(initialData.tipoSuperficie);
        setIsCustomSuperficie(false);
      } else {
        setTipoSuperficie('otro');
        setCustomSuperficie(initialData.tipoSuperficie || '');
        setIsCustomSuperficie(true);
      }

      if ([15, 30, 60, 90].includes(initialData.frecuenciaVisitaDias)) {
        setFrecuenciaVisitaDias(initialData.frecuenciaVisitaDias);
        setIsCustomFrecuencia(false);
      } else {
        setIsCustomFrecuencia(true);
        setCustomFrecuencia(initialData.frecuenciaVisitaDias || 30);
      }

      setFechaUltimaVisita(initialData.fechaUltimaVisita || getTodayISODate());
      setDuracionServicioMinutos(initialData.duracionServicioMinutos || 30);
      setNotas(initialData.notas || '');
      setFotoAntes(initialData.fotoAntes);
      setFotoDespues(initialData.fotoDespues);
      setActivo(initialData.activo !== undefined ? initialData.activo : true);
    } else {
      // Reset defaults
      setNombre('');
      setTelefono('');
      setDireccion('');
      setZona('');
      setTipoSuperficie('Ventanas residenciales');
      setIsCustomSuperficie(false);
      setCustomSuperficie('');
      setFrecuenciaVisitaDias(30);
      setIsCustomFrecuencia(false);
      setCustomFrecuencia('');
      setFechaUltimaVisita(getTodayISODate());
      setDuracionServicioMinutos(30);
      setNotas('');
      setFotoAntes(undefined);
      setFotoDespues(undefined);
      setActivo(true);
    }
    setErrorMsg(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const effectiveFrecuencia = isCustomFrecuencia
    ? Number(customFrecuencia) || 30
    : frecuenciaVisitaDias;

  const effectiveSuperficie = isCustomSuperficie
    ? customSuperficie.trim() || 'Vidrios generales'
    : tipoSuperficie;

  const proximaCalculada = calcularProximaVisita(fechaUltimaVisita, effectiveFrecuencia);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    tipo: 'antes' | 'despues'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (tipo === 'antes') setUploadingAntes(true);
    else setUploadingDespues(true);

    try {
      const dummyId = initialData?.id || `temp_${Date.now()}`;
      const url = await uploadClienteFoto(file, dummyId, tipo);
      if (tipo === 'antes') setFotoAntes(url);
      else setFotoDespues(url);
    } catch (err: any) {
      setErrorMsg(`Error al cargar foto ${tipo}: ` + (err.message || 'Error desconocido'));
    } finally {
      if (tipo === 'antes') setUploadingAntes(false);
      else setUploadingDespues(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!nombre.trim()) {
      setErrorMsg('Por favor ingresa el nombre del cliente o empresa.');
      return;
    }

    if (!telefono.trim()) {
      setErrorMsg('Por favor ingresa un número de teléfono de contacto.');
      return;
    }

    if (!direccion.trim()) {
      setErrorMsg('Por favor ingresa la dirección de servicio.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        direccion: direccion.trim(),
        zona: zona.trim(),
        tipoSuperficie: effectiveSuperficie,
        frecuenciaVisitaDias: effectiveFrecuencia,
        duracionServicioMinutos: Number(duracionServicioMinutos) || 30,
        fechaUltimaVisita,
        fechaProximaVisita: proximaCalculada,
        notas: notas.trim(),
        fotoAntes,
        fotoDespues,
        activo,
        historialVisitas: initialData?.historialVisitas || [],
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar cliente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              {initialData ? 'Editar Ficha de Cliente' : 'Nuevo Cliente'}
            </h2>
            <p className="text-xs text-slate-500">
              {initialData
                ? 'Actualiza los datos de contacto y frecuencia'
                : 'Registra un cliente residencial o comercial'}
            </p>
          </div>
          <button
            type="button"
            id="btn-close-cliente-form"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs sm:text-sm">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Contacto Principal */}
          <div className="space-y-3.5">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-600" />
              1. Datos del Cliente
            </h3>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Nombre / Empresa <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="input-cliente-nombre"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Cafetería Dulce Grano / Familia Martínez"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Teléfono / Celular <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    id="input-cliente-telefono"
                    required
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+54 9 11 4522-8910"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Zona / Barrio
                </label>
                <input
                  type="text"
                  id="input-cliente-zona"
                  value={zona}
                  onChange={(e) => setZona(e.target.value)}
                  placeholder="Ej: Palermo, Recoleta, Zona Norte..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Dirección Completa <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  id="input-cliente-direccion"
                  required
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Calle, número, piso/depto o entrecalles"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Tipo de Servicio y Frecuencia */}
          <div className="space-y-3.5 pt-3 border-t border-slate-100">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-600" />
              2. Superficie y Frecuencia de Limpieza
            </h3>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Tipo de Superficie
              </label>
              <select
                id="select-cliente-superficie"
                value={isCustomSuperficie ? 'otro' : tipoSuperficie}
                onChange={(e) => {
                  if (e.target.value === 'otro') {
                    setIsCustomSuperficie(true);
                  } else {
                    setIsCustomSuperficie(false);
                    setTipoSuperficie(e.target.value);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800"
              >
                {SUPERFICIE_PRESETS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                <option value="otro">Otro tipo personalizado...</option>
              </select>

              {isCustomSuperficie && (
                <input
                  type="text"
                  id="input-cliente-custom-superficie"
                  value={customSuperficie}
                  onChange={(e) => setCustomSuperficie(e.target.value)}
                  placeholder="Especifica el tipo de superficie (ej: Barandales de vidrio)"
                  className="mt-2 w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 text-xs"
                />
              )}
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">
                Frecuencia de Visita
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FRECUENCIA_PRESETS.map((item) => {
                  const isSelected = !isCustomFrecuencia && frecuenciaVisitaDias === item.dias;
                  return (
                    <button
                      key={item.dias}
                      type="button"
                      onClick={() => {
                        setIsCustomFrecuencia(false);
                        setFrecuenciaVisitaDias(item.dias);
                      }}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'border-sky-600 bg-sky-50 text-sky-900 font-bold shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs">{item.label}</div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomFrecuencia(!isCustomFrecuencia)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                    isCustomFrecuencia
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  Personalizar días
                </button>
                {isCustomFrecuencia && (
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      id="input-cliente-custom-frecuencia"
                      value={customFrecuencia}
                      onChange={(e) => setCustomFrecuencia(Number(e.target.value) || '')}
                      placeholder="Ej: 45"
                      className="w-24 px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold text-center"
                    />
                    <span className="text-slate-500 text-xs">días entre visitas</span>
                  </div>
                )}
              </div>
            </div>

            {/* Duración estimada del servicio */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Duración Estimada del Servicio (para auto-agendamiento)
              </label>
              <div className="flex items-center gap-2">
                <div className="relative w-36">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    min="10"
                    max="480"
                    step="5"
                    id="input-cliente-duracion"
                    value={duracionServicioMinutos}
                    onChange={(e) => setDuracionServicioMinutos(Number(e.target.value) || 30)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold"
                  />
                </div>
                <span className="text-xs text-slate-500 font-medium">minutos de trabajo</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Define cuántos minutos bloquea este cliente en la agenda pública (por defecto 30 min).
              </p>
            </div>

            {/* Visit Dates Automation Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-blue-50/60 border border-sky-100 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-sky-600" />
                  Cálculo Automático de Próxima Visita
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-200/60 text-sky-900">
                  {effectiveFrecuencia} días
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Fecha Última Visita:
                  </label>
                  <input
                    type="date"
                    id="input-cliente-fecha-ultima"
                    value={fechaUltimaVisita}
                    onChange={(e) => setFechaUltimaVisita(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-sky-200 bg-white text-xs font-semibold text-slate-800"
                  />
                </div>

                <div className="bg-white/80 p-2.5 rounded-xl border border-sky-200/60 flex flex-col justify-center">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Próxima visita calculada:
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-sky-950">
                    {formatearFecha(proximaCalculada)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Notas Operativas */}
          <div className="space-y-3.5 pt-3 border-t border-slate-100">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-sky-600" />
              3. Notas Operativas
            </h3>

            <div>
              <textarea
                rows={3}
                id="textarea-cliente-notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Timbre no funciona, llamar al llegar. Se necesita escalera extensible de 4m. Perro en el jardín trasero."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 resize-none text-xs"
              />
            </div>
          </div>

          {/* Section 4: Fotos Antes / Después */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-sky-600" />
              4. Registro Fotográfico (Opcional)
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Foto Antes */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-center">
                <p className="font-bold text-slate-700 text-xs">Foto Antes</p>
                {fotoAntes ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group">
                    <img
                      src={fotoAntes}
                      alt="Antes"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFotoAntes(undefined)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-sky-500 bg-white cursor-pointer transition-colors">
                    {uploadingAntes ? (
                      <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-5 h-5 text-slate-400 mb-1" />
                        <span className="text-[11px] font-semibold text-slate-600">Subir / Tomar</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'antes')}
                    />
                  </label>
                )}
              </div>

              {/* Foto Después */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-center">
                <p className="font-bold text-slate-700 text-xs">Foto Después</p>
                {fotoDespues ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group">
                    <img
                      src={fotoDespues}
                      alt="Después"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFotoDespues(undefined)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-sky-500 bg-white cursor-pointer transition-colors">
                    {uploadingDespues ? (
                      <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-5 h-5 text-slate-400 mb-1" />
                        <span className="text-[11px] font-semibold text-slate-600">Subir / Tomar</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'despues')}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Section 5: Activo toggle */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-800 text-xs">Cliente Activo</p>
              <p className="text-[11px] text-slate-500">
                Los clientes inactivos no alertan visitas próximas en la agenda
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="checkbox-cliente-activo"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              id="btn-cancel-cliente-form"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              id="btn-submit-cliente-form"
              disabled={saving}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{initialData ? 'Guardar Cambios' : 'Crear Cliente'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
