import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, setDoc, onSnapshot, updateDoc, deleteDoc, query, orderBy, limit, addDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Pharmacy, CustomerRequest, PharmacyResponse, Reservation, SystemEvent } from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

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
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.error("Please check your Firebase configuration or network status.");
    }
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

export function listenToResponses(callback: (responses: PharmacyResponse[]) => void) {
  const colRef = collection(db, 'pharmacyResponses');
  return onSnapshot(colRef, (snapshot) => {
    const list: PharmacyResponse[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as PharmacyResponse);
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

export async function updateCustomerRequestStatus(requestId: string, status: 'active' | 'fulfilled' | 'expired' | 'cancelled') {
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

// 4. Clear/Wipe Firestore Data for Production Clean Slate
export async function wipeFirestoreData() {
  try {
    // We fetch and delete all documents in collections for the reset action
    const colNames = ['customerRequests', 'pharmacyResponses', 'reservations', 'systemEvents'];
    for (const colName of colNames) {
      const snap = await getDocs(collection(db, colName));
      for (const docSnap of snap.docs) {
        await deleteDoc(doc(db, colName, docSnap.id));
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'wipe');
  }
}
