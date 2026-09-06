import * as admin from 'firebase-admin';

/**
 * Sends a native Firebase Cloud Messaging (FCM) push notification to the glazier/admin
 * when an appointment is cancelled by a client.
 */
export async function notificarVidrieroPushCancelacion(
  negocioId: string,
  nombreCliente: string,
  fecha: string,
  horaInicio: string,
  horaFin: string
): Promise<{ enviadas: number; errores: number }> {
  const db = admin.firestore();
  let enviadas = 0;
  let errores = 0;

  try {
    // 1. Query registered FCM tokens for admins / glazier of this business
    let tokensSnap = await db
      .collection('tokensPush')
      .where('rol', '==', 'admin')
      .where('pushActivo', '==', true)
      .get();

    // Fallback if no specific business tokens found or if tokens collection uses different query
    if (tokensSnap.empty) {
      tokensSnap = await db
        .collection('tokensPush')
        .where('pushActivo', '==', true)
        .limit(20)
        .get();
    }

    if (tokensSnap.empty) {
      return { enviadas: 0, errores: 0 };
    }

    const tokens: string[] = [];
    tokensSnap.forEach((doc) => {
      const data = doc.data();
      if (data.fcmToken && typeof data.fcmToken === 'string') {
        tokens.push(data.fcmToken);
      }
    });

    if (tokens.length === 0) {
      return { enviadas: 0, errores: 0 };
    }

    const title = 'Turno Cancelado';
    const body = `${nombreCliente} canceló su turno del ${fecha} (${horaInicio}-${horaFin} hs). El horario quedó libre.`;

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title,
        body,
      },
      data: {
        tipo: 'cancelacion_turno',
        negocioId,
        fecha,
        horaInicio,
        url: '/?tab=agenda',
      },
      webpush: {
        notification: {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: `cancelacion-${fecha}-${horaInicio}`,
        },
        fcmOptions: {
          link: '/?tab=agenda',
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    enviadas = response.successCount;
    errores = response.failureCount;

    // Log the notification attempt
    await db.collection('logsNotificaciones').add({
      tipo: 'push_cancelacion_vidriero',
      negocioId,
      destinatariosCount: tokens.length,
      exitosas: enviadas,
      fallidas: errores,
      titulo: title,
      cuerpo: body,
      fecha: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error sending FCM push to glazier:', err);
  }

  return { enviadas, errores };
}
