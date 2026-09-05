import React, { useState, useEffect, useRef } from 'react';
import {
  FlaskConical,
  Play,
  CheckCircle2,
  Calendar,
  CalendarX2,
  Award,
  Star,
  Trash2,
  RefreshCw,
  Terminal,
  ShieldCheck,
  Mail,
  ArrowLeft,
  Info,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { useConfig } from '../../contexts/ConfigContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeModoSandbox,
  setModoSandbox,
  limpiarDatosDePrueba,
  simularCrearClientePrueba,
  simularAprobarClientePrueba,
  simularAgendarTurnoPrueba,
  simularCancelarTurnoPrueba,
  simularMarcarVisitaPrueba,
  simularDejarResenaPrueba,
  subscribeEmailsSimulados,
} from '../../lib/sandboxService';
import { Cliente, Turno, EmailSimulado, ModoSandboxConfig } from '../../types';

interface LogEntry {
  id: string;
  hora: string;
  tipo: 'info' | 'success' | 'warning' | 'error';
  titulo: string;
  detalle?: string;
  data?: any;
}

interface DemoPageProps {
  onBackToDashboard?: () => void;
}

export function DemoPage({ onBackToDashboard }: DemoPageProps) {
  const { config } = useConfig();
  const { user, isSuperAdmin } = useAuth();

  const [sandboxConfig, setSandboxConfig] = useState<ModoSandboxConfig>({ activo: false });
  const [emailsSimulados, setEmailsSimulados] = useState<EmailSimulado[]>([]);
  const [isTogglingSandbox, setIsTogglingSandbox] = useState(false);

  // Workflow state across steps
  const [clienteActual, setClienteActual] = useState<Cliente | null>(null);
  const [turnoActual, setTurnoActual] = useState<Turno | null>(null);
  const [ultimoResultado, setUltimoResultado] = useState<string | null>(null);

  // Loading flags per action
  const [loadingStep, setLoadingStep] = useState<string | null>(null);

  // Logs stream
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'init',
      hora: new Date().toLocaleTimeString(),
      tipo: 'info',
      titulo: 'Consola E2E Inicializada',
      detalle: 'Entorno de pruebas listo para simular el ciclo de vida completo.',
    },
  ]);

  const logContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new log
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Subscribe to Modo Sandbox state
  useEffect(() => {
    const unsubSandbox = subscribeModoSandbox((cfg) => {
      setSandboxConfig(cfg);
    });
    const unsubEmails = subscribeEmailsSimulados((emails) => {
      setEmailsSimulados(emails);
    });

    return () => {
      unsubSandbox();
      unsubEmails();
    };
  }, []);

  const addLog = (
    tipo: 'info' | 'success' | 'warning' | 'error',
    titulo: string,
    detalle?: string,
    data?: any
  ) => {
    setLogs((prev) => [
      ...prev,
      {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        hora: new Date().toLocaleTimeString(),
        tipo,
        titulo,
        detalle,
        data,
      },
    ]);
  };

  const handleToggleSandbox = async () => {
    try {
      setIsTogglingSandbox(true);
      const nuevoEstado = !sandboxConfig.activo;
      await setModoSandbox(nuevoEstado, user?.email || undefined);
      addLog(
        nuevoEstado ? 'success' : 'warning',
        nuevoEstado ? 'Modo Sandbox ACTIVADO' : 'Modo Sandbox DESACTIVADO',
        nuevoEstado
          ? 'Todos los emails automáticos serán interceptados y los registros llevarán el flag esSandbox: true.'
          : 'La plataforma vuelve a despachar emails y guardar registros en producción.'
      );
    } catch (err: any) {
      addLog('error', 'Error al cambiar Modo Sandbox', err.message);
    } finally {
      setIsTogglingSandbox(false);
    }
  };

  // STEP 1: Crear cliente de prueba
  const handleCrearCliente = async () => {
    try {
      setLoadingStep('crearCliente');
      addLog('info', 'Creando cliente de prueba en Firestore...');
      const cli = await simularCrearClientePrueba(config.id || 'perfect-glass');
      setClienteActual(cli);
      addLog(
        'success',
        `Cliente de prueba creado: ${cli.nombre}`,
        `ID: ${cli.id} | Email: ${cli.emailRegistro} | Estado: ${cli.estadoRegistro} (Pendiente de aprobación)`,
        cli
      );
    } catch (err: any) {
      addLog('error', 'Error al crear cliente de prueba', err.message);
    } finally {
      setLoadingStep(null);
    }
  };

  // STEP 2: Aprobar cliente
  const handleAprobarCliente = async () => {
    if (!clienteActual) {
      addLog('warning', 'Primero debes crear un cliente de prueba en el Paso 1');
      return;
    }
    try {
      setLoadingStep('aprobarCliente');
      addLog('info', `Aprobando cliente de prueba ${clienteActual.nombre}...`);
      const cliAprobado = await simularAprobarClientePrueba(clienteActual.id);
      setClienteActual(cliAprobado);
      addLog(
        'success',
        `Cliente aprobado con éxito`,
        `Estado actualizado a: ${cliAprobado.estadoRegistro}. Ahora está habilitado para agendar turnos y registrar visitas.`,
        cliAprobado
      );
    } catch (err: any) {
      addLog('error', 'Error al aprobar cliente', err.message);
    } finally {
      setLoadingStep(null);
    }
  };

  // STEP 3: Agendar turno
  const handleAgendarTurno = async () => {
    if (!clienteActual) {
      addLog('warning', 'Primero debes crear un cliente de prueba en el Paso 1');
      return;
    }
    try {
      setLoadingStep('agendarTurno');
      addLog('info', `Agendando turno online para ${clienteActual.nombre}...`);
      const turno = await simularAgendarTurnoPrueba(clienteActual, config);
      setTurnoActual(turno);
      addLog(
        'success',
        `Turno agendado con éxito (esSandbox: true)`,
        `ID Turno: ${turno.id} | Fecha: ${turno.fecha} ${turno.horaInicio}hs | Token Cancelación: ${turno.tokenCancelacion.substring(0, 10)}... | Email enviado: ${turno.emailEnviado}`,
        turno
      );
    } catch (err: any) {
      addLog('error', 'Error al agendar turno', err.message);
    } finally {
      setLoadingStep(null);
    }
  };

  // STEP 4: Cancelar turno con token
  const handleCancelarTurno = async () => {
    if (!turnoActual) {
      addLog('warning', 'No hay ningún turno agendado actualmente para cancelar. Ejecuta el Paso 3 primero.');
      return;
    }
    try {
      setLoadingStep('cancelarTurno');
      addLog('info', `Simulando cancelación de turno mediante token seguro...`);
      const turnoCancelado = await simularCancelarTurnoPrueba(turnoActual, config);
      setTurnoActual(turnoCancelado);
      addLog(
        'success',
        `Turno cancelado exitosamente mediante token`,
        `Estado: ${turnoCancelado.estado} | Notificaciones enviadas al vidriero y al cliente (interceptadas a emailsSimulados si Sandbox está activo).`,
        turnoCancelado
      );
    } catch (err: any) {
      addLog('error', 'Error al cancelar turno', err.message);
    } finally {
      setLoadingStep(null);
    }
  };

  // STEP 5: Marcar visita completada y solicitar reseña
  const handleMarcarVisita = async () => {
    if (!clienteActual) {
      addLog('warning', 'Primero debes crear un cliente de prueba en el Paso 1');
      return;
    }
    try {
      setLoadingStep('marcarVisita');
      addLog('info', `Registrando visita completada y sumando sello de fidelidad...`);
      const res = await simularMarcarVisitaPrueba(clienteActual, config);
      setClienteActual(res.clienteActualizado);
      addLog(
        'success',
        `Visita completada: Sello #${res.selloAgregado} acreditado`,
        `Recompensa desbloqueada: ${res.recompensaDesbloqueada ? 'SÍ (Premio listo)' : 'NO'}. Se ha generado automáticamente el email simulado de solicitud de reseña.`,
        res
      );
    } catch (err: any) {
      addLog('error', 'Error al registrar visita', err.message);
    } finally {
      setLoadingStep(null);
    }
  };

  // STEP 6: Dejar reseña 1-3 estrellas
  const handleDejarResenaCritica = async () => {
    if (!clienteActual) {
      addLog('warning', 'Primero debes crear un cliente de prueba en el Paso 1');
      return;
    }
    try {
      setLoadingStep('resena1a3');
      addLog('info', 'Simulando feedback negativo (2 estrellas con queja interna)...');
      const res = await simularDejarResenaPrueba(
        clienteActual,
        config,
        2,
        'Llegaron 25 minutos tarde y quedaron marcas en la vidriera superior. Necesitamos que vengan a corregirlo.'
      );
      addLog(
        'warning',
        'Reseña Crítica (2/5) registrada en "reseñas"',
        `ID: ${res.resenaId} | Comentario interno guardado. Derivado a Google: NO (Filtro de reputación activo). Flag esSandbox: true.`,
        res
      );
    } catch (err: any) {
      addLog('error', 'Error al registrar reseña', err.message);
    } finally {
      setLoadingStep(null);
    }
  };

  // STEP 7: Dejar reseña 4-5 estrellas
  const handleDejarResenaPositiva = async () => {
    if (!clienteActual) {
      addLog('warning', 'Primero debes crear un cliente de prueba en el Paso 1');
      return;
    }
    try {
      setLoadingStep('resena4a5');
      addLog('info', 'Simulando feedback positivo (5 estrellas con derivación a Google Maps)...');
      const res = await simularDejarResenaPrueba(
        clienteActual,
        config,
        5,
        '¡Servicio impecable! La marquesina y las vidrieras quedaron relucientes como nuevas.'
      );
      addLog(
        'success',
        'Reseña Excelente (5/5) registrada en "reseñas"',
        `ID: ${res.resenaId} | Derivado a Google Maps: SÍ. Flag esSandbox: true (no afecta promedio comercial real).`,
        res
      );
    } catch (err: any) {
      addLog('error', 'Error al registrar reseña', err.message);
    } finally {
      setLoadingStep(null);
    }
  };

  // STEP 8: Limpiar datos de prueba
  const handleLimpiarDatos = async () => {
    if (!window.confirm('¿Deseas eliminar todos los registros de prueba (clientes demo, turnos con esSandbox, reseñas de prueba y emails simulados)?')) {
      return;
    }
    try {
      setLoadingStep('limpiar');
      addLog('info', 'Limpiando datos de prueba de Firestore...');
      const resultado = await limpiarDatosDePrueba(config.id);
      setClienteActual(null);
      setTurnoActual(null);
      addLog(
        'success',
        'Limpieza de datos de prueba completada',
        `Clientes borrados: ${resultado.clientesBorrados} | Turnos borrados: ${resultado.turnosBorrados} | Reseñas borradas: ${resultado.resenasBorrados} | Emails simulados borrados: ${resultado.emailsBorrados}`,
        resultado
      );
    } catch (err: any) {
      addLog('error', 'Error al limpiar datos de prueba', err.message);
    } finally {
      setLoadingStep(null);
    }
  };

  return (
    <div id="demo-e2e-console" className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Bar / Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {onBackToDashboard && (
              <button
                id="btn-demo-back"
                onClick={onBackToDashboard}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
                title="Volver al Panel SuperAdmin"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                  <FlaskConical className="w-3.5 h-3.5 text-purple-400" />
                  CONSOLA E2E EXCLUSIVA SUPERADMIN
                </span>
                <span className="text-xs font-mono text-slate-400">/demo</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white mt-1">
                Laboratorio de Pruebas & Simulación Integral
              </h1>
            </div>
          </div>

          {/* Sandbox Toggle Header Button */}
          <div className="flex items-center gap-3 bg-slate-800/90 p-2.5 rounded-2xl border border-slate-700">
            <div className="text-right">
              <div className="text-xs font-bold text-slate-300">Modo Sandbox Global</div>
              <div className="text-[11px] text-slate-400">
                {sandboxConfig.activo ? 'Activado (Emails simulados)' : 'Desactivado (Emails reales)'}
              </div>
            </div>
            <button
              id="btn-toggle-sandbox-demo"
              onClick={handleToggleSandbox}
              disabled={isTogglingSandbox}
              className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
                sandboxConfig.activo
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  sandboxConfig.activo ? 'bg-slate-950 animate-pulse' : 'bg-slate-400'
                }`}
              />
              {sandboxConfig.activo ? 'MODO SANDBOX: ON' : 'MODO SANDBOX: OFF'}
            </button>
          </div>
        </div>

        {/* Warning Banner if Sandbox is OFF */}
        {!sandboxConfig.activo && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <strong className="font-black text-amber-300">Aviso importante:</strong> El Modo Sandbox está actualmente <strong>APAGADO</strong>. Al simular acciones, los emails podrían dispararse a través de la cola de producción. Recomendamos hacer clic en <strong>"MODO SANDBOX: ON"</strong> arriba para garantizar que todas las notificaciones se guarden únicamente en la colección de prueba <code className="text-amber-100 bg-amber-950/60 px-1 py-0.5 rounded">emailsSimulados</code>.
            </div>
          </div>
        )}

        {/* Status Tracker & Quick Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-sky-400" />
              Cliente en Memoria
            </div>
            {clienteActual ? (
              <div>
                <div className="font-extrabold text-white text-sm truncate">{clienteActual.nombre}</div>
                <div className="text-xs text-slate-400 font-mono truncate">{clienteActual.emailRegistro}</div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      clienteActual.estadoRegistro === 'aprobado'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {clienteActual.estadoRegistro}
                  </span>
                  <span className="text-xs text-slate-400">
                    Sellos: <strong className="text-white">{clienteActual.sellosAcumulados || 0}</strong>/5
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic py-2">
                Ningún cliente de prueba activo. Presiona "Crear cliente de prueba" abajo.
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-purple-400" />
              Turno en Memoria
            </div>
            {turnoActual ? (
              <div>
                <div className="font-extrabold text-white text-sm">
                  {turnoActual.fecha} a las {turnoActual.horaInicio} hs
                </div>
                <div className="text-xs text-slate-400 truncate">Token: {turnoActual.tokenCancelacion?.substring(0, 16)}...</div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      turnoActual.estado === 'confirmado'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {turnoActual.estado}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-500/20 text-purple-300">
                    PRUEBA
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic py-2">
                Ningún turno agendado para la prueba actual.
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-amber-400" />
              Emails Simulados Capturados
            </div>
            <div className="text-2xl font-black text-amber-300">{emailsSimulados.length}</div>
            <div className="text-xs text-slate-400 mt-1">
              Guardados en Firestore <code className="text-slate-300">emailsSimulados</code> sin spamear clientes.
            </div>
          </div>
        </div>

        {/* Main Interactive Action Cards Grid */}
        <div>
          <h2 className="text-base font-extrabold text-white mb-3 flex items-center gap-2">
            <Play className="w-4 h-4 text-sky-400" />
            Acciones de Demostración Paso a Paso
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Step 1: Crear cliente */}
            <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between hover:border-slate-600 transition-all">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-black uppercase">
                    Paso 1
                  </span>
                </div>
                <h3 className="font-extrabold text-white text-sm">Crear cliente de prueba</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Genera un cliente con datos ficticios pero realistas listo para aprobar en Firestore.
                </p>
              </div>
              <button
                id="btn-demo-crear-cliente"
                onClick={handleCrearCliente}
                disabled={loadingStep !== null}
                className="mt-4 w-full py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                {loadingStep === 'crearCliente' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>Ejecutar Creación</span>
              </button>
            </div>

            {/* Step 2: Aprobar cliente */}
            <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between hover:border-slate-600 transition-all">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase">
                    Paso 2
                  </span>
                </div>
                <h3 className="font-extrabold text-white text-sm">Aprobar cliente</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Aprueba la cuenta del cliente de prueba simulando la acción del vidriero o admin.
                </p>
              </div>
              <button
                id="btn-demo-aprobar-cliente"
                onClick={handleAprobarCliente}
                disabled={loadingStep !== null || !clienteActual}
                className={`mt-4 w-full py-2.5 px-3 rounded-xl font-black text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm ${
                  !clienteActual
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {loadingStep === 'aprobarCliente' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Aprobar Cuenta</span>
              </button>
            </div>

            {/* Step 3: Agendar turno */}
            <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between hover:border-slate-600 transition-all">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-black uppercase">
                    Paso 3
                  </span>
                </div>
                <h3 className="font-extrabold text-white text-sm">Agendar turno</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Crea un turno con token único y simula los emails de confirmación al cliente y vidriero.
                </p>
              </div>
              <button
                id="btn-demo-agendar-turno"
                onClick={handleAgendarTurno}
                disabled={loadingStep !== null || !clienteActual}
                className={`mt-4 w-full py-2.5 px-3 rounded-xl font-black text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm ${
                  !clienteActual
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-500 text-white'
                }`}
              >
                {loadingStep === 'agendarTurno' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Calendar className="w-3.5 h-3.5" />
                )}
                <span>Agendar Turno</span>
              </button>
            </div>

            {/* Step 4: Cancelar turno */}
            <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between hover:border-slate-600 transition-all">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-black uppercase">
                    Paso 4
                  </span>
                </div>
                <h3 className="font-extrabold text-white text-sm">Cancelar turno</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Cancela el turno usando el token seguro, simulando el clic que haría el cliente desde su email.
                </p>
              </div>
              <button
                id="btn-demo-cancelar-turno"
                onClick={handleCancelarTurno}
                disabled={loadingStep !== null || !turnoActual || turnoActual.estado === 'cancelado'}
                className={`mt-4 w-full py-2.5 px-3 rounded-xl font-black text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm ${
                  !turnoActual || turnoActual.estado === 'cancelado'
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                {loadingStep === 'cancelarTurno' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CalendarX2 className="w-3.5 h-3.5" />
                )}
                <span>Cancelar con Token</span>
              </button>
            </div>

            {/* Step 5: Marcar visita completada */}
            <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between hover:border-slate-600 transition-all">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase">
                    Paso 5
                  </span>
                </div>
                <h3 className="font-extrabold text-white text-sm">Marcar visita completada</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Suma un sello al cliente y simula el envío del email de solicitud de reseña con link directo.
                </p>
              </div>
              <button
                id="btn-demo-marcar-visita"
                onClick={handleMarcarVisita}
                disabled={loadingStep !== null || !clienteActual}
                className={`mt-4 w-full py-2.5 px-3 rounded-xl font-black text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm ${
                  !clienteActual
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-500 text-white'
                }`}
              >
                {loadingStep === 'marcarVisita' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Award className="w-3.5 h-3.5" />
                )}
                <span>Completar Visita</span>
              </button>
            </div>

            {/* Step 6: Dejar reseña 1-3 estrellas */}
            <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between hover:border-slate-600 transition-all">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 text-[10px] font-black uppercase">
                    Paso 6
                  </span>
                </div>
                <h3 className="font-extrabold text-white text-sm">Dejar reseña 1-3 ⭐</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Simula feedback crítico con comentario interno obligatorio para proteger la reputación.
                </p>
              </div>
              <button
                id="btn-demo-resena-critica"
                onClick={handleDejarResenaCritica}
                disabled={loadingStep !== null || !clienteActual}
                className={`mt-4 w-full py-2.5 px-3 rounded-xl font-black text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm ${
                  !clienteActual
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-500 text-white'
                }`}
              >
                {loadingStep === 'resena1a3' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Star className="w-3.5 h-3.5" />
                )}
                <span>Simular Feedback 2⭐</span>
              </button>
            </div>

            {/* Step 7: Dejar reseña 4-5 estrellas */}
            <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between hover:border-slate-600 transition-all">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[10px] font-black uppercase">
                    Paso 7
                  </span>
                </div>
                <h3 className="font-extrabold text-white text-sm">Dejar reseña 4-5 ⭐</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Simula feedback positivo excelente con derivación a Google Maps (esSandbox: true).
                </p>
              </div>
              <button
                id="btn-demo-resena-positiva"
                onClick={handleDejarResenaPositiva}
                disabled={loadingStep !== null || !clienteActual}
                className={`mt-4 w-full py-2.5 px-3 rounded-xl font-black text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm ${
                  !clienteActual
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-teal-600 hover:bg-teal-500 text-white'
                }`}
              >
                {loadingStep === 'resena4a5' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Star className="w-3.5 h-3.5 fill-teal-200" />
                )}
                <span>Simular 5⭐ (Google)</span>
              </button>
            </div>

            {/* Step 8: Limpiar datos de prueba */}
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 flex flex-col justify-between hover:border-rose-700 transition-all">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-black uppercase">
                    Reset
                  </span>
                </div>
                <h3 className="font-extrabold text-rose-200 text-sm">Limpiar datos de prueba</h3>
                <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">
                  Borra todos los registros marcados como demo/prueba (clientes, turnos, reseñas y emails simulados).
                </p>
              </div>
              <button
                id="btn-demo-limpiar-datos"
                onClick={handleLimpiarDatos}
                disabled={loadingStep !== null}
                className="mt-4 w-full py-2.5 px-3 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-black text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                {loadingStep === 'limpiar' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Limpiar Todo</span>
              </button>
            </div>
          </div>
        </div>

        {/* Realtime Terminal / Action Log */}
        <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl">
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-bold text-slate-200">
                LOG EN TIEMPO REAL (Firestore Actions & Emails Stream)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-mono">{logs.length} eventos</span>
              <button
                id="btn-clear-logs"
                onClick={() => setLogs([])}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[10px] font-mono transition-colors"
              >
                Limpiar consola
              </button>
            </div>
          </div>

          <div
            ref={logContainerRef}
            className="p-4 font-mono text-xs max-h-80 overflow-y-auto space-y-2 text-slate-300"
          >
            {logs.map((item) => (
              <div
                key={item.id}
                className={`p-2 rounded-lg border ${
                  item.tipo === 'success'
                    ? 'bg-emerald-950/30 border-emerald-900/60 text-emerald-300'
                    : item.tipo === 'warning'
                    ? 'bg-amber-950/30 border-amber-900/60 text-amber-300'
                    : item.tipo === 'error'
                    ? 'bg-rose-950/30 border-rose-900/60 text-rose-300'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  <span className="text-slate-500 text-[10px]">{item.hora}</span>
                  <span>[{item.tipo.toUpperCase()}]</span>
                  <span>{item.titulo}</span>
                </div>
                {item.detalle && <div className="mt-1 text-[11px] text-slate-400 pl-4">{item.detalle}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
