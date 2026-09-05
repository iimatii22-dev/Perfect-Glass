# Security Specification & Threat Model - Perfect Glass RBAC

## 1. Data Invariants & Access Control Policy

### Roles:
- **Administrador (Vidriero)**:
  - Can read, create, update, and delete any client in `clientes`.
  - Can create and modify `sellosHistorial` subcollection entries.
  - Can manage `turnos`, `configuracion`, and `agenda`.
  - Can approve or reject client registration requests (`estadoRegistro: 'aprobado' | 'rechazado'`).
- **Cliente (Customer)**:
  - Can register publicly with `estadoRegistro: 'pendiente'`.
  - Once registered/authenticated, can ONLY read their own client document (`uid == request.auth.uid` or doc ID).
  - Can ONLY update allowed personal profile fields (`telefono`, `nombre`, `localComercial`).
  - CANNOT write, modify, or delete loyalty stamps (`sellosAcumulados`, `sellosNecesarios`, `recompensaDisponible`, `totalRecompensasCanjeadas`).
  - CANNOT modify visit scheduling fields (`fechaUltimaVisita`, `fechaProximaVisita`, `frecuenciaVisitaDias`).
  - Can read their own immutable `sellosHistorial` subcollection (`visible == true`).
  - Can NEVER edit or delete entries in `sellosHistorial`.
  - Can create a `turno` publicly with `estado: 'confirmado'` and valid start/end times.

---

## 2. The "Dirty Dozen" Security Payloads

1. **Client Self-Awarding Stamp (Privilege Escalation)**:
   - Malicious client attempts `updateDoc(clienteRef, { sellosAcumulados: 5, recompensaDisponible: true })`.
   - *Expected Outcome*: DENIED.

2. **Client Modifying Next Visit Date**:
   - Malicious client attempts `updateDoc(clienteRef, { fechaProximaVisita: '2026-09-01' })`.
   - *Expected Outcome*: DENIED.

3. **Client Approving Their Own Account**:
   - Malicious client attempts `updateDoc(clienteRef, { estadoRegistro: 'aprobado' })`.
   - *Expected Outcome*: DENIED.

4. **Client Reading Another Customer's Profile**:
   - Client with `uid_A` attempts to `getDoc` or query `/clientes/cliente_B`.
   - *Expected Outcome*: DENIED.

5. **Client Deleting Stamp History Entry**:
   - Malicious user attempts `deleteDoc(/clientes/{id}/sellosHistorial/{selloId})`.
   - *Expected Outcome*: DENIED.

6. **Client Modifying Existing Stamp Date**:
   - Malicious user attempts `updateDoc(/clientes/{id}/sellosHistorial/{selloId}, { fecha: '2026-01-01' })`.
   - *Expected Outcome*: DENIED.

7. **Client Deleting Their Entire Profile**:
   - Client attempts `deleteDoc(/clientes/{id})`.
   - *Expected Outcome*: DENIED (only Admin can delete).

8. **Unauthenticated Public Write to Business Config**:
   - Unauthenticated attacker attempts `setDoc(/configuracion/general, { nombreNegocio: 'Hacked' })`.
   - *Expected Outcome*: DENIED.

9. **Injecting Malicious Ghost Fields During Registration**:
   - Attacker attempts `addDoc(/clientes, { uid: auth.uid, estadoRegistro: 'aprobado', sellosAcumulados: 10, role: 'admin' })`.
   - *Expected Outcome*: DENIED.

10. **Modifying an Already Completed Turno**:
    - Attacker attempts to update a turno that is already in terminal state (`estado == 'completado'`).
    - *Expected Outcome*: DENIED.

11. **Client Scraping All Turnos from Others**:
    - Client attempts `getDocs(collection(db, 'turnos'))` without filtering by their own token or client ID.
    - *Expected Outcome*: Controlled by list rule.

12. **Denial-of-Wallet Path Variable Poisoning**:
    - Attacker sends 2MB string as document ID `{clienteId}` or `{turnoId}`.
    - *Expected Outcome*: DENIED by `isValidId()` guard.
