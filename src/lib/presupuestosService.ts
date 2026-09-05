import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { Presupuesto } from '../types';

const PRESUPUESTOS_STORAGE_KEY = 'perfectglass_presupuestos_cache';

export function subscribeToPresupuestos(
  callback: (list: Presupuesto[]) => void,
  negocioId: string = 'perfect-glass'
) {
  const colRef = collection(db, 'presupuestos');
  const q = query(colRef, orderBy('creadoEn', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const all = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Presupuesto[];
      const list = all.filter(
        (p) => !p.negocioId || p.negocioId === negocioId || (negocioId === 'perfect-glass' && !p.negocioId)
      );
      try {
        localStorage.setItem(`${PRESUPUESTOS_STORAGE_KEY}_${negocioId}`, JSON.stringify(list));
      } catch (e) {
        // ignore storage quota issues
      }
      callback(list);
    },
    (error) => {
      console.warn('Firestore presupuestos subscription notice:', error);
      try {
        const cached = localStorage.getItem(`${PRESUPUESTOS_STORAGE_KEY}_${negocioId}`);
        if (cached) {
          callback(JSON.parse(cached));
          return;
        }
      } catch (e) {
        // ignore
      }
      callback([]);
    }
  );
}
