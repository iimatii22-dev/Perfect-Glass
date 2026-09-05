import React, { useState, useEffect } from 'react';
import {
  Building2,
  ShieldCheck,
  Plus,
  Search,
  Users,
  Calendar,
  DollarSign,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Edit3,
  Trash2,
  Filter,
  Sparkles,
  Activity,
  Layers,
  Globe,
  Lock,
  RefreshCw,
  Mail,
  Phone,
  ArrowRight,
  TrendingUp,
  Award,
  AlertCircle,
  Power,
  SlidersHorizontal,
  FlaskConical,
} from 'lucide-react';
import { BusinessConfig, SuperAdminRecord, ModoSandboxConfig } from '../../types';
import {
  subscribeToNegocios,
  crearNuevoNegocio,
  actualizarNegocio,
  eliminarNegocio,
  toggleEstadoNegocio,
  obtenerMetricasGlobalesNegocios,
  subscribeToSuperAdmins,
  agregarSuperAdmin,
  removerSuperAdmin,
  DEFAULT_SUPERADMIN_EMAIL,
  NegocioMetricas,
} from '../../lib/negociosService';
import {
  subscribeModoSandbox,
  setModoSandbox,
  subscribeEmailsSimulados,
} from '../../lib/sandboxService';
import { EmailsSimuladosTab } from './EmailsSimuladosTab';
import { useConfig } from '../../contexts/ConfigContext';
import { useAuth } from '../../contexts/AuthContext';

interface SuperAdminDashboardProps {
  onSelectNegocio: (negocioId: string) => void;
  onOpenDemo?: () => void;
}

export function SuperAdminDashboard({ onSelectNegocio, onOpenDemo }: SuperAdminDashboardProps) {
  const { currentNegocioId, setCurrentNegocioId } = useConfig();
  const { user } = useAuth();

  const [negocios, setNegocios] = useState<BusinessConfig[]>([]);
  const [metricas, setMetricas] = useState<Record<string, NegocioMetricas>>({});
  const [superAdmins, setSuperAdmins] = useState<SuperAdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'negocios' | 'metricas' | 'superadmins' | 'emailsSimulados'>('negocios');

  // Modo Sandbox state
  const [sandboxConfig, setSandboxConfig] = useState<ModoSandboxConfig>({ activo: false });
  const [isTogglingSandbox, setIsTogglingSandbox] = useState(false);
  const [emailsSimuladosCount, setEmailsSimuladosCount] = useState(0);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('todos');
  const [filterEstado, setFilterEstado] = useState<string>('todos');

  // Modal Crear Negocio
  const [isModalCrearOpen, setIsModalCrearOpen] = useState(false);
  const [isSubmittingCrear, setIsSubmittingCrear] = useState(false);
  const [crearError, setCrearError] = useState<string | null>(null);

  const [nuevoId, setNuevoId] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [nuevoWhatsapp, setNuevoWhatsapp] = useState('');
  const [nuevaDireccion, setNuevaDireccion] = useState('');
  const [nuevoColor, setNuevoColor] = useState('#0284c7');
  const [nuevoPlan, setNuevoPlan] = useState<'free' | 'pro' | 'premium'>('pro');
  const [nuevosSellos, setNuevosSellos] = useState(5);
  const [nuevaRecompensa, setNuevaRecompensa] = useState('Limpieza de vidrios gratis');

  // Modal Editar Negocio
  const [editingNegocio, setEditingNegocio] = useState<BusinessConfig | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // SuperAdmins state
  const [newSuperAdminEmail, setNewSuperAdminEmail] = useState('');
  const [isAddingSuperAdmin, setIsAddingSuperAdmin] = useState(false);
  const [superAdminMsg, setSuperAdminMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Subscribe to negocios, superAdmins and sandbox
  useEffect(() => {
    setLoading(true);
    const unsubNegocios = subscribeToNegocios((list) => {
      setNegocios(list);
      setLoading(false);
      // Fetch metrics
      obtenerMetricasGlobalesNegocios(list).then(setMetricas).catch(console.warn);
    });

    const unsubSuperAdmins = subscribeToSuperAdmins((admins) => {
      setSuperAdmins(admins);
    });

    const unsubSandbox = subscribeModoSandbox((cfg) => {
      setSandboxConfig(cfg);
    });

    const unsubEmails = subscribeEmailsSimulados((emails) => {
      setEmailsSimuladosCount(emails.length);
    });

    return () => {
      unsubNegocios();
      unsubSuperAdmins();
      unsubSandbox();
      unsubEmails();
    };
  }, []);

  const handleToggleSandbox = async () => {
    try {
      setIsTogglingSandbox(true);
      const nuevoEstado = !sandboxConfig.activo;
      await setModoSandbox(nuevoEstado, user?.email || undefined);
    } catch (err: any) {
      console.warn('Error al alternar modo sandbox:', err);
    } finally {
      setIsTogglingSandbox(false);
    }
  };

  // Filtered Negocios list
  const filteredNegocios = negocios.filter((n) => {
    const matchesSearch =
      (n.nombreNegocio || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.emailAdministrador || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.telefono || '').includes(searchTerm);

    const matchesPlan = filterPlan === 'todos' || n.plan === filterPlan;
    const matchesEstado =
      filterEstado === 'todos' ||
      (filterEstado === 'activos' && n.activo !== false) ||
      (filterEstado === 'inactivos' && n.activo === false);

    return matchesSearch && matchesPlan && matchesEstado;
  });

  // Global totals
  const totalNegocios = negocios.length;
  const negociosActivos = negocios.filter((n) => n.activo !== false).length;
  const totalClientesGlobal = Object.values(metricas).reduce((acc: number, m: NegocioMetricas) => acc + (m?.totalClientes || 0), 0);
  const totalTurnosMesGlobal = Object.values(metricas).reduce((acc: number, m: NegocioMetricas) => acc + (m?.turnosMes || 0), 0);
  const totalVisitasMesGlobal = Object.values(metricas).reduce((acc: number, m: NegocioMetricas) => acc + (m?.visitasCompletadasMes || 0), 0);

  const handleCrearNegocio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) {
      setCrearError('El nombre del negocio es obligatorio.');
      return;
    }
    setIsSubmittingCrear(true);
    setCrearError(null);

    try {
      const generatedId =
        nuevoId.trim() ||
        nuevoNombre
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');

      await crearNuevoNegocio({
        id: generatedId,
        nombreNegocio: nuevoNombre.trim(),
        emailAdministrador: nuevoEmail.trim() || undefined,
        telefono: nuevoTelefono.trim() || undefined,
        whatsapp: nuevoWhatsapp.trim() || nuevoTelefono.trim() || undefined,
        direccion: nuevaDireccion.trim() || undefined,
        colorPrimario: nuevoColor,
        plan: nuevoPlan,
        sellosNecesarios: nuevosSellos,
        recompensaDescripcion: nuevaRecompensa.trim() || 'Limpieza de vidrios gratis',
        activo: true,
      });

      setIsModalCrearOpen(false);
      // Reset form
      setNuevoId('');
      setNuevoNombre('');
      setNuevoEmail('');
      setNuevoTelefono('');
      setNuevoWhatsapp('');
      setNuevaDireccion('');
      setNuevoColor('#0284c7');
      setNuevoPlan('pro');
    } catch (err: any) {
      console.error('Error creating business:', err);
      setCrearError(err.message || 'Error al crear el negocio.');
    } finally {
      setIsSubmittingCrear(false);
    }
  };

  const handleEditarNegocio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNegocio || !editingNegocio.id) return;
    setIsSubmittingEdit(true);

    try {
      await actualizarNegocio(editingNegocio.id, {
        nombreNegocio: editingNegocio.nombreNegocio,
        emailAdministrador: editingNegocio.emailAdministrador,
        telefono: editingNegocio.telefono,
        whatsapp: editingNegocio.whatsapp,
        direccion: editingNegocio.direccion,
        colorPrimario: editingNegocio.colorPrimario,
        plan: editingNegocio.plan,
        sellosNecesarios: editingNegocio.sellosNecesarios,
        recompensaDescripcion: editingNegocio.recompensaDescripcion,
        activo: editingNegocio.activo,
      });
      setEditingNegocio(null);
    } catch (err) {
      console.error('Error updating business:', err);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleToggleActivo = async (negocio: BusinessConfig) => {
    if (!negocio.id) return;
    const nuevoEstado = negocio.activo === false;
    await toggleEstadoNegocio(negocio.id, nuevoEstado);
  };

  const handleSelectAndInspect = (negocioId: string) => {
    setCurrentNegocioId(negocioId);
    onSelectNegocio(negocioId);
  };

  const handleAddSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuperAdminEmail.trim() || !newSuperAdminEmail.includes('@')) {
      setSuperAdminMsg({ type: 'err', text: 'Ingresa un correo electrónico válido.' });
      return;
    }
    setIsAddingSuperAdmin(true);
    setSuperAdminMsg(null);
    try {
      await agregarSuperAdmin(newSuperAdminEmail.trim(), user?.uid);
      setSuperAdminMsg({ type: 'ok', text: `SuperAdmin ${newSuperAdminEmail} autorizado exitosamente.` });
      setNewSuperAdminEmail('');
    } catch (err: any) {
      setSuperAdminMsg({ type: 'err', text: err.message || 'Error al autorizar SuperAdmin.' });
    } finally {
      setIsAddingSuperAdmin(false);
    }
  };

  const handleRemoveSuperAdmin = async (email: string) => {
    if (email.toLowerCase() === DEFAULT_SUPERADMIN_EMAIL.toLowerCase()) {
      alert('No es posible revocar el SuperAdmin principal del sistema.');
      return;
    }
    if (window.confirm(`¿Estás seguro de revocar el rol SuperAdmin a ${email}?`)) {
      await removerSuperAdmin(email);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-16">
      {/* SuperAdmin Master Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">Panel de Control SuperAdmin</h1>
                <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                  Master Multi-Tenant
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gestión centralizada de negocios, tenencia múltiple y métricas globales
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Master Sandbox Mode Switch */}
            <div className="flex items-center gap-2 bg-slate-800/90 p-1.5 rounded-xl border border-slate-700">
              <div className="text-right pl-2 hidden md:block">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-300">Modo Sandbox</div>
                <div className="text-[10px] text-slate-400">
                  {sandboxConfig.activo ? 'Emails simulados' : 'Emails reales'}
                </div>
              </div>
              <button
                id="btn-superadmin-toggle-sandbox"
                onClick={handleToggleSandbox}
                disabled={isTogglingSandbox}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  sandboxConfig.activo
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
                title="Activar/Desactivar el Modo Sandbox global"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    sandboxConfig.activo ? 'bg-slate-950 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                <span>{sandboxConfig.activo ? 'SANDBOX: ON' : 'SANDBOX: OFF'}</span>
              </button>
            </div>

            {onOpenDemo && (
              <button
                id="btn-open-demo-page"
                onClick={onOpenDemo}
                className="px-3 py-2 text-xs font-bold text-purple-200 bg-purple-950/70 hover:bg-purple-900 border border-purple-600/40 rounded-lg flex items-center gap-1.5 transition-colors"
                title="Abrir Laboratorio de Pruebas y Simulación (/demo)"
              >
                <FlaskConical className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">Consola Demo (/demo)</span>
              </button>
            )}

            <button
              onClick={() => {
                setLoading(true);
                obtenerMetricasGlobalesNegocios(negocios).then((m) => {
                  setMetricas(m);
                  setLoading(false);
                });
              }}
              className="px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
              title="Refrescar métricas"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              onClick={() => setIsModalCrearOpen(true)}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-lg shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo Negocio
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Global Key Performance Metrics */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
              <span>Negocios Totales</span>
              <Building2 className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-white">{totalNegocios}</span>
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> {negociosActivos} activos
              </span>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
              <span>Clientes en Plataforma</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-white">{totalClientesGlobal}</span>
              <span className="text-xs text-slate-400">Total global</span>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
              <span>Turnos este Mes</span>
              <Calendar className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-white">{totalTurnosMesGlobal}</span>
              <span className="text-xs text-purple-300">Agendados</span>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
              <span>Visitas / Sellos Mes</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-white">{totalVisitasMesGlobal}</span>
              <span className="text-xs text-emerald-300">Completadas</span>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
              <span>SuperAdmins</span>
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-white">{superAdmins.length || 1}</span>
              <span className="text-xs text-amber-300">Accesos Master</span>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 gap-6">
          <button
            onClick={() => setActiveTab('negocios')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'negocios'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Negocios Registrados ({negocios.length})
          </button>
          <button
            onClick={() => setActiveTab('metricas')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'metricas'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Comparativa de Negocios
          </button>
          <button
            onClick={() => setActiveTab('superadmins')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'superadmins'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            SuperAdmins del Sistema ({superAdmins.length})
          </button>
          <button
            id="tab-btn-emails-simulados"
            onClick={() => setActiveTab('emailsSimulados')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'emailsSimulados'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Emails Simulados</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {emailsSimuladosCount}
            </span>
          </button>
        </div>

        {/* TAB 1: Negocios Registrados */}
        {activeTab === 'negocios' && (
          <div className="space-y-6">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-800/40 border border-slate-800 rounded-xl p-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, ID o email..."
                  className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Filter className="w-3.5 h-3.5" /> Plan:
                </div>
                <select
                  value={filterPlan}
                  onChange={(e) => setFilterPlan(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg text-xs py-1.5 px-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="todos">Todos los planes</option>
                  <option value="premium">Premium</option>
                  <option value="pro">Pro</option>
                  <option value="free">Free</option>
                </select>

                <select
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg text-xs py-1.5 px-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="activos">Activos</option>
                  <option value="inactivos">Inactivos</option>
                </select>
              </div>
            </div>

            {/* List of Negocios */}
            {filteredNegocios.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/20 border border-dashed border-slate-800 rounded-2xl">
                <Building2 className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                <p className="text-slate-300 font-medium">No se encontraron negocios con los filtros aplicados</p>
                <p className="text-slate-500 text-xs mt-1">Prueba modificando los términos de búsqueda o añade uno nuevo.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredNegocios.map((negocio) => {
                  const m = metricas[negocio.id || ''] || {
                    totalClientes: 0,
                    turnosEsteMes: 0,
                    visitasEsteMes: 0,
                    solicitudesPendientes: 0,
                  };
                  const isCurrent = currentNegocioId === negocio.id;

                  return (
                    <div
                      key={negocio.id}
                      className={`bg-slate-800/70 border rounded-2xl p-5 flex flex-col justify-between transition-all hover:border-slate-600 ${
                        isCurrent ? 'border-indigo-500/80 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-950/40' : 'border-slate-700/70'
                      }`}
                    >
                      <div>
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0"
                              style={{ backgroundColor: negocio.colorPrimario || '#0284c7' }}
                            >
                              {negocio.logoUrl ? (
                                <img
                                  src={negocio.logoUrl}
                                  alt=""
                                  className="w-10 h-10 rounded-xl object-contain p-1"
                                />
                              ) : (
                                (negocio.nombreNegocio || 'N').substring(0, 2).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-white text-base truncate flex items-center gap-1.5">
                                {negocio.nombreNegocio}
                                {isCurrent && (
                                  <span className="inline-block w-2 h-2 rounded-full bg-indigo-400 shrink-0" title="Negocio seleccionado actualmente" />
                                )}
                              </h3>
                              <p className="text-xs text-slate-400 font-mono truncate">ID: {negocio.id}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`px-2 py-0.5 text-xs font-semibold rounded-full uppercase tracking-wider ${
                                negocio.plan === 'premium'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : negocio.plan === 'pro'
                                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                  : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {negocio.plan || 'pro'}
                            </span>
                            <button
                              onClick={() => handleToggleActivo(negocio)}
                              title={negocio.activo !== false ? 'Desactivar negocio' : 'Activar negocio'}
                              className={`p-1 rounded-lg transition-colors ${
                                negocio.activo !== false
                                  ? 'text-emerald-400 hover:bg-emerald-500/20'
                                  : 'text-slate-500 hover:bg-slate-700'
                              }`}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Contact info */}
                        <div className="mt-4 space-y-1.5 text-xs text-slate-300 border-t border-slate-700/50 pt-3">
                          {negocio.emailAdministrador && (
                            <div className="flex items-center gap-2 text-slate-300 truncate">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{negocio.emailAdministrador}</span>
                            </div>
                          )}
                          {negocio.telefono && (
                            <div className="flex items-center gap-2 text-slate-300 truncate">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{negocio.telefono}</span>
                            </div>
                          )}
                          {negocio.direccion && (
                            <div className="flex items-center gap-2 text-slate-400 truncate">
                              <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="truncate">{negocio.direccion}</span>
                            </div>
                          )}
                        </div>

                        {/* Live mini stats */}
                        <div className="mt-4 grid grid-cols-3 gap-2 bg-slate-900/80 rounded-xl p-2.5 text-center border border-slate-800">
                          <div>
                            <div className="text-xs text-slate-400">Clientes</div>
                            <div className="text-base font-bold text-white mt-0.5">{m.totalClientes}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-400">Turnos/Mes</div>
                            <div className="text-base font-bold text-purple-300 mt-0.5">{m.turnosEsteMes}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-400">Visitas/Mes</div>
                            <div className="text-base font-bold text-emerald-300 mt-0.5">{m.visitasEsteMes}</div>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="mt-5 pt-3 border-t border-slate-700/50 flex items-center gap-2">
                        <button
                          onClick={() => handleSelectAndInspect(negocio.id || 'perfect-glass')}
                          className="flex-1 py-2 px-3 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Acceder al Panel
                        </button>
                        <button
                          onClick={() => setEditingNegocio(negocio)}
                          className="p-2 text-slate-300 hover:text-white bg-slate-700/70 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Editar configuración básica"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Métricas y Comparativa */}
        {activeTab === 'metricas' && (
          <div className="space-y-6">
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
                Rendimiento Comparativo por Negocio
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-700">
                    <tr>
                      <th className="py-3 px-4">Negocio</th>
                      <th className="py-3 px-4">ID</th>
                      <th className="py-3 px-4">Plan</th>
                      <th className="py-3 px-4 text-center">Estado</th>
                      <th className="py-3 px-4 text-right">Clientes</th>
                      <th className="py-3 px-4 text-right">Turnos Mes</th>
                      <th className="py-3 px-4 text-right">Visitas Mes</th>
                      <th className="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {negocios.map((negocio) => {
                      const m = metricas[negocio.id || ''] || {
                        totalClientes: 0,
                        turnosEsteMes: 0,
                        visitasEsteMes: 0,
                        solicitudesPendientes: 0,
                      };
                      return (
                        <tr key={negocio.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: negocio.colorPrimario || '#0284c7' }}
                            />
                            {negocio.nombreNegocio}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-400">{negocio.id}</td>
                          <td className="py-3 px-4">
                            <span className="capitalize text-xs font-semibold px-2 py-0.5 bg-slate-800 rounded border border-slate-700">
                              {negocio.plan || 'pro'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {negocio.activo !== false ? (
                              <span className="inline-flex items-center text-xs text-emerald-400 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Activo
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-xs text-slate-500 font-medium">
                                <XCircle className="w-3.5 h-3.5 mr-1" /> Inactivo
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-white">{m.totalClientes}</td>
                          <td className="py-3 px-4 text-right font-bold text-purple-300">{m.turnosEsteMes}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-300">{m.visitasEsteMes}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleSelectAndInspect(negocio.id || 'perfect-glass')}
                              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1"
                            >
                              Ver Panel <ArrowRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SuperAdmins del Sistema */}
        {activeTab === 'superadmins' && (
          <div className="space-y-6">
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
              <div className="max-w-2xl">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  Autorizaciones Globales de SuperAdministrador
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Los correos autorizados aquí tienen acceso completo para crear, editar y acceder como
                  SuperAdmin a cualquiera de los negocios de la plataforma.
                </p>

                {/* Form to add new SuperAdmin */}
                <form onSubmit={handleAddSuperAdmin} className="mt-6 flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={newSuperAdminEmail}
                      onChange={(e) => setNewSuperAdminEmail(e.target.value)}
                      placeholder="nuevo.superadmin@empresa.com"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isAddingSuperAdmin}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    Autorizar
                  </button>
                </form>

                {superAdminMsg && (
                  <div
                    className={`mt-3 p-3 rounded-lg text-xs flex items-center gap-2 ${
                      superAdminMsg.type === 'ok'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {superAdminMsg.text}
                  </div>
                )}
              </div>

              {/* List of SuperAdmins */}
              <div className="mt-8 border-t border-slate-700/60 pt-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
                  SuperAdmins Actuales ({superAdmins.length})
                </h3>
                <div className="space-y-3 max-w-2xl">
                  {superAdmins.map((adm) => {
                    const isMaster = adm.email.toLowerCase() === DEFAULT_SUPERADMIN_EMAIL.toLowerCase();
                    return (
                      <div
                        key={adm.email}
                        className="flex items-center justify-between p-3.5 bg-slate-900 border border-slate-800 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white flex items-center gap-2">
                              {adm.email}
                              {isMaster && (
                                <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                                  Owner Master
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 font-mono">
                              Autorizado el {new Date(adm.agregadoEn).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        {!isMaster && (
                          <button
                            onClick={() => handleRemoveSuperAdmin(adm.email)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Revocar acceso SuperAdmin"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Emails Simulados */}
        {activeTab === 'emailsSimulados' && (
          <EmailsSimuladosTab onGoToDemo={onOpenDemo} />
        )}
      </main>

      {/* MODAL: Crear Nuevo Negocio */}
      {isModalCrearOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <Building2 className="w-5 h-5 text-indigo-400" />
                Registrar Nuevo Negocio
              </div>
              <button
                onClick={() => setIsModalCrearOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {crearError && (
              <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {crearError}
              </div>
            )}

            <form onSubmit={handleCrearNegocio} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre del Negocio *</label>
                <input
                  type="text"
                  required
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Ej: Vidriería San Martín"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Identificador / Slug (opcional, generado automático si se omite)
                </label>
                <input
                  type="text"
                  value={nuevoId}
                  onChange={(e) => setNuevoId(e.target.value)}
                  placeholder="Ej: vidrieria-san-martin"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email Administrador</label>
                  <input
                    type="email"
                    value={nuevoEmail}
                    onChange={(e) => setNuevoEmail(e.target.value)}
                    placeholder="admin@vidrieria.com"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    value={nuevoTelefono}
                    onChange={(e) => setNuevoTelefono(e.target.value)}
                    placeholder="+54 9 11 0000-0000"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Dirección Física</label>
                <input
                  type="text"
                  value={nuevaDireccion}
                  onChange={(e) => setNuevaDireccion(e.target.value)}
                  placeholder="Av. Principal 1234, Local 2"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Plan</label>
                  <select
                    value={nuevoPlan}
                    onChange={(e) => setNuevoPlan(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Color de Marca</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={nuevoColor}
                      onChange={(e) => setNuevoColor(e.target.value)}
                      className="w-10 h-8 rounded bg-transparent border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={nuevoColor}
                      onChange={(e) => setNuevoColor(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Sellos para Recompensa</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={nuevosSellos}
                    onChange={(e) => setNuevosSellos(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Descripción Recompensa</label>
                  <input
                    type="text"
                    value={nuevaRecompensa}
                    onChange={(e) => setNuevaRecompensa(e.target.value)}
                    placeholder="Ej: Limpieza gratis"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalCrearOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCrear}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-md shadow-indigo-600/30 disabled:opacity-50"
                >
                  {isSubmittingCrear ? 'Provisionando...' : 'Crear Negocio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Negocio */}
      {editingNegocio && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <Edit3 className="w-5 h-5 text-indigo-400" />
                Editar Negocio: {editingNegocio.nombreNegocio}
              </div>
              <button
                onClick={() => setEditingNegocio(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditarNegocio} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre del Negocio</label>
                <input
                  type="text"
                  required
                  value={editingNegocio.nombreNegocio}
                  onChange={(e) => setEditingNegocio({ ...editingNegocio, nombreNegocio: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email Administrador</label>
                  <input
                    type="email"
                    value={editingNegocio.emailAdministrador || ''}
                    onChange={(e) => setEditingNegocio({ ...editingNegocio, emailAdministrador: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={editingNegocio.telefono || ''}
                    onChange={(e) => setEditingNegocio({ ...editingNegocio, telefono: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Plan</label>
                  <select
                    value={editingNegocio.plan || 'pro'}
                    onChange={(e) => setEditingNegocio({ ...editingNegocio, plan: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Estado</label>
                  <select
                    value={editingNegocio.activo !== false ? 'activo' : 'inactivo'}
                    onChange={(e) => setEditingNegocio({ ...editingNegocio, activo: e.target.value === 'activo' })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Color de Marca</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editingNegocio.colorPrimario || '#0284c7'}
                    onChange={(e) => setEditingNegocio({ ...editingNegocio, colorPrimario: e.target.value })}
                    className="w-10 h-8 rounded bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={editingNegocio.colorPrimario || '#0284c7'}
                    onChange={(e) => setEditingNegocio({ ...editingNegocio, colorPrimario: e.target.value })}
                    className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingNegocio(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-md shadow-indigo-600/30 disabled:opacity-50"
                >
                  {isSubmittingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
