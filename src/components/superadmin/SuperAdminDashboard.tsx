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
  ShieldAlert,
} from 'lucide-react';
import { BusinessConfig, SuperAdminRecord, ModoSandboxConfig, Cliente } from '../../types';
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
  subscribeToAllClientesGlobal,
  superAdminUpdateCliente,
  superAdminCreateClienteParaNegocio,
  superAdminDeleteCliente,
} from '../../lib/clientesService';
import { registrarAuditoria } from '../../lib/auditoriaService';
import {
  subscribeModoSandbox,
  setModoSandbox,
  subscribeEmailsSimulados,
} from '../../lib/sandboxService';
import { EmailsSimuladosTab } from './EmailsSimuladosTab';
import { AuditoriaTab } from './AuditoriaTab';
import { VidrierosYClientesTab } from './VidrierosYClientesTab';
import { DirectorioClientesTab } from './DirectorioClientesTab';
import { ModalEditarCliente } from './ModalEditarCliente';
import { ModalCrearCliente } from './ModalCrearCliente';
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
  const [allClientes, setAllClientes] = useState<Cliente[]>([]);
  const [metricas, setMetricas] = useState<Record<string, NegocioMetricas>>({});
  const [superAdmins, setSuperAdmins] = useState<SuperAdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'negocios' | 'todosClientes' | 'metricas' | 'superadmins' | 'emailsSimulados' | 'auditoria'
  >('negocios');

  // Client Modals state
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [isModalCrearClienteOpen, setIsModalCrearClienteOpen] = useState(false);
  const [targetNegocioParaCliente, setTargetNegocioParaCliente] = useState<string>('perfect-glass');

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

  // Subscribe to negocios, clientes, superAdmins and sandbox
  useEffect(() => {
    setLoading(true);
    const unsubNegocios = subscribeToNegocios((list) => {
      setNegocios(list);
      setLoading(false);
      // Fetch metrics
      obtenerMetricasGlobalesNegocios(list).then(setMetricas).catch(console.warn);
    });

    const unsubClientes = subscribeToAllClientesGlobal((clientesList) => {
      setAllClientes(clientesList);
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
      unsubClientes();
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
    await toggleEstadoNegocio(negocio.id, nuevoEstado, user?.email || undefined);
    await registrarAuditoria(
      nuevoEstado ? 'activar_negocio' : 'suspender_negocio',
      negocio.id,
      user?.email || 'superadmin',
      { negocioNombre: negocio.nombreNegocio, nuevoEstado }
    );
  };

  const handleSelectAndInspect = async (negocioId: string) => {
    setCurrentNegocioId(negocioId);
    await registrarAuditoria(
      'impersonar_soporte',
      negocioId,
      user?.email || 'superadmin',
      { motivo: 'Modo vista segura de soporte técnico y supervisión' }
    );
    onSelectNegocio(negocioId);
  };

  const handleSaveCliente = async (id: string, updates: Partial<Cliente>) => {
    await superAdminUpdateCliente(id, updates);
    await registrarAuditoria(
      'modificar_cliente' as any,
      updates.negocioId || 'perfect-glass',
      user?.email || 'msosa.illescas94@gmail.com',
      { clienteId: id, clienteNombre: updates.nombre, updates }
    );
  };

  const handleDeleteCliente = async (id: string) => {
    const c = allClientes.find((x) => x.id === id);
    await superAdminDeleteCliente(id);
    await registrarAuditoria(
      'eliminar_cliente' as any,
      c?.negocioId || 'perfect-glass',
      user?.email || 'msosa.illescas94@gmail.com',
      { clienteId: id, clienteNombre: c?.nombre }
    );
  };

  const handleCreateCliente = async (negocioId: string, data: any) => {
    const newId = await superAdminCreateClienteParaNegocio(negocioId, data);
    await registrarAuditoria(
      'crear_cliente' as any,
      negocioId,
      user?.email || 'msosa.illescas94@gmail.com',
      { clienteId: newId, nombre: data.nombre }
    );
  };

  const handleEliminarNegocio = async (negocio: BusinessConfig) => {
    if (!negocio.id) return;
    if (negocio.id === 'perfect-glass') {
      alert('No es posible eliminar el negocio matriz principal (Perfect Glass).');
      return;
    }
    if (
      window.confirm(
        `¿Confirmas que deseas eliminar permanentemente el negocio "${negocio.nombreNegocio}"? Esta acción no se puede deshacer.`
      )
    ) {
      await eliminarNegocio(negocio.id);
      await registrarAuditoria(
        'eliminar_negocio',
        negocio.id,
        user?.email || 'msosa.illescas94@gmail.com',
        { negocioNombre: negocio.nombreNegocio }
      );
    }
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
        <div className="flex border-b border-slate-800 gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('negocios')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'negocios'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Vidrieros & Clientes ({negocios.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('todosClientes')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'todosClientes'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Directorio Clientes ({allClientes.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('metricas')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'metricas'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Métricas Micro SaaS</span>
          </button>
          <button
            onClick={() => setActiveTab('superadmins')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'superadmins'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>SuperAdmins ({superAdmins.length})</span>
          </button>
          <button
            id="tab-btn-emails-simulados"
            onClick={() => setActiveTab('emailsSimulados')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'emailsSimulados'
                ? 'border-purple-500 text-purple-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Emails Simulados</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {emailsSimuladosCount}
            </span>
          </button>
          <button
            id="tab-btn-auditoria"
            onClick={() => setActiveTab('auditoria')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'auditoria'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Auditoría</span>
          </button>
        </div>

        {/* TAB 1: Vidrieros y Clientes (Árbol Jerárquico Micro SaaS) */}
        {activeTab === 'negocios' && (
          <VidrierosYClientesTab
            negocios={negocios}
            allClientes={allClientes}
            metricas={metricas}
            currentNegocioId={currentNegocioId}
            onSelectAndInspect={handleSelectAndInspect}
            onEditNegocio={(n) => setEditingNegocio(n)}
            onToggleActivo={handleToggleActivo}
            onEliminarNegocio={handleEliminarNegocio}
            onEditCliente={(c) => setEditingCliente(c)}
            onDeleteCliente={handleDeleteCliente}
            onCrearClienteParaNegocio={(negocioId) => {
              setTargetNegocioParaCliente(negocioId);
              setIsModalCrearClienteOpen(true);
            }}
            onCrearNegocio={() => setIsModalCrearOpen(true)}
          />
        )}

        {/* TAB: Directorio Global de Todos los Clientes */}
        {activeTab === 'todosClientes' && (
          <DirectorioClientesTab
            clientes={allClientes}
            negocios={negocios}
            onEditCliente={(c) => setEditingCliente(c)}
            onDeleteCliente={handleDeleteCliente}
            onCrearCliente={() => {
              setTargetNegocioParaCliente(negocios[0]?.id || 'perfect-glass');
              setIsModalCrearClienteOpen(true);
            }}
          />
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
                            <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
                              <span>UID: {adm.uid || adm.id}</span>
                              <span>•</span>
                              <span>
                                {adm.creadoEn
                                  ? `Creado el ${new Date(adm.creadoEn).toLocaleDateString()}`
                                  : (adm.fechaAlta ? `Creado el ${new Date(adm.fechaAlta).toLocaleDateString()}` : 'Activo')}
                              </span>
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

        {/* TAB 5: Auditoría */}
        {activeTab === 'auditoria' && (
          <AuditoriaTab />
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

      {/* Modal Editar Cliente (SuperAdmin Master) */}
      {editingCliente && (
        <ModalEditarCliente
          cliente={editingCliente}
          negocios={negocios}
          onClose={() => setEditingCliente(null)}
          onSave={handleSaveCliente}
        />
      )}

      {/* Modal Crear Cliente (SuperAdmin Master) */}
      {isModalCrearClienteOpen && (
        <ModalCrearCliente
          negocios={negocios}
          preselectedNegocioId={targetNegocioParaCliente}
          onClose={() => setIsModalCrearClienteOpen(false)}
          onCreate={handleCreateCliente}
        />
      )}
    </div>
  );
}
