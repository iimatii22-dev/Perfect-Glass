/**
 * Script de inicialización y promoción segura de SuperAdmin para 'gestion-servicios-uy'.
 * Utiliza Firebase Admin SDK para garantizar máxima seguridad y control de acceso.
 *
 * USO:
 * node scripts/bootstrapSuperAdmin.js <email-del-superadmin>
 */

import { readFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';

const EXPECTED_PROJECT_ID = 'gestion-servicios-uy';
const SERVICE_ACCOUNT_FILE = './serviceAccountKey.json';

// Helper para confirmación interactiva en terminal
function pedirConfirmacion(pregunta) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(pregunta, (respuesta) => {
      rl.close();
      resolve(respuesta.trim());
    });
  });
}

async function main() {
  const emailArg = process.argv[2];

  if (!emailArg || !emailArg.includes('@')) {
    console.error('\n❌ Error: Debes proporcionar un correo electrónico válido.');
    console.error('Uso: node scripts/bootstrapSuperAdmin.js EMAIL\n');
    process.exit(1);
  }

  const targetEmail = emailArg.trim().toLowerCase();

  // a) Validación de existencia de serviceAccountKey.json
  if (!existsSync(SERVICE_ACCOUNT_FILE)) {
    console.error(`\n❌ Error: No se encontró el archivo '${SERVICE_ACCOUNT_FILE}' en la raíz del proyecto.`);
    console.error('Pasos para solucionarlo:');
    console.error('1. Abre Firebase Console -> Configuración del proyecto -> Cuentas de servicio.');
    console.error('2. Haz clic en "Generar nueva clave privada".');
    console.error(`3. Guarda el archivo descargado como '${SERVICE_ACCOUNT_FILE}' en la raíz del proyecto.`);
    console.error('(El archivo está protegido por .gitignore para no subirse a Git).\n');
    process.exit(1);
  }

  // b) Validación de JSON válido
  let serviceAccount;
  try {
    const rawData = readFileSync(SERVICE_ACCOUNT_FILE, 'utf8');
    serviceAccount = JSON.parse(rawData);
  } catch {
    console.error(`\n❌ Error: El archivo '${SERVICE_ACCOUNT_FILE}' no tiene un formato JSON válido o está corrupto.\n`);
    process.exit(1);
  }

  // d) Validación de que las credenciales correspondan estrictamente a gestion-servicios-uy
  if (!serviceAccount.project_id || serviceAccount.project_id !== EXPECTED_PROJECT_ID) {
    console.error(`\n❌ Error de seguridad: Las credenciales provistas corresponden al proyecto '${serviceAccount.project_id || 'desconocido'}', pero este script solo autoriza el proyecto '${EXPECTED_PROJECT_ID}'. Operación abortada.\n`);
    process.exit(1);
  }

  // Carga de firebase-admin con mensaje de ayuda si falta instalar
  let admin;
  try {
    const adminModule = await import('firebase-admin');
    admin = adminModule.default || adminModule;
  } catch {
    console.error('\n❌ Error: El paquete "firebase-admin" no está instalado en este entorno.');
    console.error('Instálalo desde la carpeta raíz ejecutando:');
    console.error('  npm install firebase-admin\n');
    process.exit(1);
  }

  // Inicialización de Firebase Admin SDK
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (initError) {
    console.error('\n❌ Error al inicializar Firebase Admin SDK:', initError.message || initError);
    process.exit(1);
  }

  const auth = admin.auth();
  const db = admin.firestore();

  // c) Validación de que el email exista en Firebase Authentication
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(targetEmail);
  } catch (authError) {
    if (authError.code === 'auth/user-not-found') {
      console.error(`\n❌ Error: El usuario con email '${targetEmail}' no existe en Firebase Authentication.`);
      console.error('El usuario debe registrarse previamente en la aplicación o crearse desde la consola de Firebase Authentication.\n');
      process.exit(1);
    }
    console.error('\n❌ Error al consultar Firebase Authentication:', authError.message || authError);
    process.exit(1);
  }

  const uid = userRecord.uid;
  const userDocRef = db.collection('usuarios').doc(uid);
  const superAdminDocRef = db.collection('superAdmins').doc(uid);

  // e) Verificación de intento de sobrescribir un SuperAdmin ya existente
  let userDocSnap;
  let superAdminSnap;
  try {
    [userDocSnap, superAdminSnap] = await Promise.all([
      userDocRef.get(),
      superAdminDocRef.get(),
    ]);
  } catch (dbError) {
    console.error('\n❌ Error al consultar Firestore:', dbError.message || dbError);
    process.exit(1);
  }

  const yaEsSuperAdmin =
    userDocSnap.exists &&
    userDocSnap.data()?.rol === 'superadmin' &&
    userDocSnap.data()?.estado === 'activo' &&
    superAdminSnap.exists &&
    superAdminSnap.data()?.activo === true;

  if (yaEsSuperAdmin) {
    console.log(`\nℹ️ El usuario '${targetEmail}' (UID: ${uid}) ya cuenta con el rol 'superadmin' activo en '${EXPECTED_PROJECT_ID}'.`);
    console.log('No se requirieron cambios ni se sobrescribió el registro.\n');
    process.exit(0);
  }

  // Confirmación interactiva previa
  const promptText = `Vas a asignar el rol superadmin a ${targetEmail} en ${EXPECTED_PROJECT_ID}. Escribí SI para continuar: `;
  const respuesta = await pedirConfirmacion(promptText);

  if (respuesta !== 'SI') {
    console.log('\n❌ Operación cancelada por el usuario. No se realizaron cambios.\n');
    process.exit(0);
  }

  // Asignación de roles y persistencia
  const now = new Date().toISOString();

  try {
    // 1. Asignar rol superadmin en usuarios/{uid} (autoridad de permisos principal)
    const existingUserData = userDocSnap.exists ? userDocSnap.data() : {};
    await userDocRef.set({
      uid,
      email: targetEmail,
      rol: 'superadmin',
      estado: 'activo',
      nombre: userRecord.displayName || existingUserData.nombre || 'Super Administrador',
      telefono: userRecord.phoneNumber || existingUserData.telefono || '',
      fotoPerfilUrl: userRecord.photoURL || existingUserData.fotoPerfilUrl || '',
      creadoEn: existingUserData.creadoEn || now,
      actualizadoEn: now,
    }, { merge: true });

    // 2. Registro auxiliar en superAdmins/{uid}
    const existingSuperAdminData = superAdminSnap.exists ? superAdminSnap.data() : {};
    await superAdminDocRef.set({
      uid,
      email: targetEmail,
      activo: true,
      creadoEn: existingSuperAdminData.creadoEn || now,
    });

    console.log('\n✅ SuperAdmin configurado exitosamente:');
    console.log(`- Proyecto: ${EXPECTED_PROJECT_ID}`);
    console.log(`- Email:    ${targetEmail}`);
    console.log(`- UID:      ${uid}`);
    console.log(`- Rol:      superadmin`);
    console.log(`- Estado:   activo`);
    console.log(`- Registro principal: usuarios/${uid}`);
    console.log(`- Registro auxiliar:  superAdmins/${uid}\n`);
  } catch (writeError) {
    console.error('\n❌ Error al guardar datos en Firestore:', writeError.message || writeError);
    process.exit(1);
  }
}

main();
