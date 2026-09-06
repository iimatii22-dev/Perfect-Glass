import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK (Cloud Functions runtime provides default credentials)
if (!admin.apps.length) {
  admin.initializeApp();
}

// Export 2nd Gen Firestore Trigger for Turnos creation & confirmation email
export { onTurnoCreated } from './turnosTrigger';

// Export 2nd Gen HTTP public endpoint for secure appointment cancellation
export { cancelarTurno } from './cancelarTurnoHttp';
