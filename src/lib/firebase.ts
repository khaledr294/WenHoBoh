import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, setDoc, onSnapshot, updateDoc, deleteDoc, query, orderBy, limit, addDoc, writeBatch, where } from 'firebase/firestore';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Pharmacy, CustomerRequest, PharmacyResponse, Reservation, SystemEvent } from '../types';

// Safely handle potential ESM/CJS bundler wrapping on JSON imports
const config = (firebaseConfig as any).default || firebaseConfig;

const app = initializeApp(config);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(console.error);

/**
 * ⚠️ IMPORTANT AUTHENTICATION SETUP INSTRUCTIONS ⚠️
 * 
 * If you encounter the 'auth/operation-not-allowed' error, you must enable
 * the corresponding authentication providers in the Firebase Console:
 * 
 * 1. Go to your Firebase Console: https://console.firebase.google.com/
 * 2. Select your project.
 * 3. Navigate to "Authentication" > "Sign-in method".
 * 4. Enable "Phone" provider.
 * 
 * IF YOU GET A REGION ERROR ("SMS unable to be sent until this region enabled"):
 * 1. In Firebase Console, go to "Authentication" > "Settings".
 * 2. Click on "SMS Region Policy".
 * 3. Select "Allow only specific regions" (or "Allow all") and add the countries you are testing from (e.g., Saudi Arabia).
 * 4. Save your changes and try logging in again.
 */

export const db = getFirestore(app, config.firestoreDatabaseId || undefined);

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 1. Connection Validation as requested by SKILL.md
import { getDocFromServer } from 'firebase/firestore';
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'systemEvents', 'connection_test'));
    // Connection established successfully
  } catch (error) {
    console.error("Firebase/Firestore Connection test failed! Error details:", error);
  }
}
testConnection();

// 2. Real-time Listeners and Sync Helpers

export function listenToPharmacies(callback: (pharmacies: Pharmacy[]) => void) {
  const colRef = collection(db, 'pharmacies');
  return onSnapshot(colRef, (snapshot) => {
    const list: Pharmacy[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Pharmacy);
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'pharmacies');
  });
}

export function listenToActiveRequest(callback: (request: CustomerRequest | null) => void) {
  const colRef = collection(db, 'customerRequests');
  // Order by createdAt descending to get the latest active request
  const q = query(colRef, orderBy('createdAt', 'desc'), limit(1));
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
      return;
    }
    const latestDoc = snapshot.docs[0];
    const data = latestDoc.data() as CustomerRequest;
    if (data.status === 'active') {
      callback(data);
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'customerRequests');
  });
}

export function listenToResponses(requestId: string | null, callback: (responses: PharmacyResponse[]) => void) {
  const colRef = collection(db, 'pharmacyResponses');
  // Filter responses by the active requestId if provided for per-request scoping
  const q = requestId
    ? query(colRef, orderBy('respondedAt', 'desc'))
    : query(colRef, orderBy('respondedAt', 'desc'), limit(100));
  return onSnapshot(q, (snapshot) => {
    const list: PharmacyResponse[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as PharmacyResponse;
      // Client-side filter: only return responses relevant to the active request
      if (!requestId || data.requestId === requestId) {
        list.push(data);
      }
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'pharmacyResponses');
  });
}

export function listenToActiveReservation(callback: (reservation: Reservation | null) => void) {
  const colRef = collection(db, 'reservations');
  const q = query(colRef, orderBy('reservedAt', 'desc'), limit(1));
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
      return;
    }
    const latestDoc = snapshot.docs[0];
    const data = latestDoc.data() as Reservation;
    if (data.status === 'active') {
      callback(data);
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'reservations');
  });
}

export function listenToSystemEvents(callback: (events: SystemEvent[]) => void) {
  const colRef = collection(db, 'systemEvents');
  const q = query(colRef, orderBy('timestamp', 'desc'), limit(50));
  return onSnapshot(q, (snapshot) => {
    const list: SystemEvent[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as SystemEvent);
    });
    // Reverse so latest is shown correctly at bottom or top as required
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'systemEvents');
  });
}

// 3. Mutation Helpers

export async function addOrUpdatePharmacy(pharmacy: Pharmacy) {
  const docRef = doc(db, 'pharmacies', pharmacy.id);
  try {
    await setDoc(docRef, pharmacy);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `pharmacies/${pharmacy.id}`);
  }
}

export async function createCustomerRequest(request: CustomerRequest) {
  const docRef = doc(db, 'customerRequests', request.id);
  try {
    await setDoc(docRef, request);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `customerRequests/${request.id}`);
  }
}

export async function updateCustomerRequestStatus(requestId: string, status: 'active' | 'fulfilled' | 'expired' | 'cancelled' | 'archived') {
  const docRef = doc(db, 'customerRequests', requestId);
  try {
    await updateDoc(docRef, { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `customerRequests/${requestId}`);
  }
}

export async function submitPharmacyResponse(response: PharmacyResponse) {
  const docRef = doc(db, 'pharmacyResponses', response.id);
  try {
    await setDoc(docRef, response);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `pharmacyResponses/${response.id}`);
  }
}

export async function createReservation(reservation: Reservation) {
  const docRef = doc(db, 'reservations', reservation.id);
  try {
    await setDoc(docRef, reservation);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `reservations/${reservation.id}`);
  }
}

export async function updateReservationStatus(reservationId: string, status: 'active' | 'completed' | 'expired' | 'cancelled_customer' | 'cancelled_pharmacy' | 'no_show') {
  const docRef = doc(db, 'reservations', reservationId);
  try {
    await updateDoc(docRef, { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `reservations/${reservationId}`);
  }
}

export async function addSystemEvent(event: SystemEvent) {
  const docRef = doc(db, 'systemEvents', event.id);
  try {
    await setDoc(docRef, event);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `systemEvents/${event.id}`);
  }
}

// 3b. Admin-only: listen to ALL requests and ALL reservations (not scoped to latest)
export function listenToAllRequests(callback: (requests: CustomerRequest[]) => void) {
  const q = query(collection(db, 'customerRequests'), orderBy('createdAt', 'desc'), limit(200));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => d.data() as CustomerRequest));
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'customerRequests/all');
  });
}

export function listenToAllReservations(callback: (reservations: Reservation[]) => void) {
  const q = query(collection(db, 'reservations'), orderBy('reservedAt', 'desc'), limit(200));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => d.data() as Reservation));
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'reservations/all');
  });
}

// 4. Clear/Wipe Firestore Data for Production Clean Slate
export async function wipeFirestoreData() {
  try {
    const colNames = ['pharmacies', 'customerRequests', 'pharmacyResponses', 'reservations', 'systemEvents'];
    for (const colName of colNames) {
      const snap = await getDocs(collection(db, colName));
      // Delete in batches of 500
      let b = writeBatch(db);
      let count = 0;
      for (const docSnap of snap.docs) {
        b.delete(docSnap.ref);
        count++;
        if (count === 500) {
          await b.commit();
          b = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) {
        await b.commit();
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'wipe');
  }
}
