import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

/**
 * 1. Scheduled Reservation Auto-Cancel
 * Runs every 10 minutes to find reservations that are 'active' but older than 2 hours.
 * It updates them to 'expired' status.
 */
export const expireOldReservations = functions.scheduler.onSchedule('every 10 minutes', async (event) => {
  const twoHoursAgo = new Date();
  twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

  const snapshot = await db.collection('reservations')
    .where('status', '==', 'active')
    .where('reservedAt', '<=', twoHoursAgo.toISOString()) // Fixed: use reservedAt (not createdAt)
    .get();

  if (snapshot.empty) {
    console.log('No expired reservations found.');
    return;
  }

  const batch = db.batch();
  snapshot.forEach(doc => {
    batch.update(doc.ref, { status: 'expired', expiredAt: new Date().toISOString() });
    
    // Optional: Log an event to systemEvents
    const eventRef = db.collection('systemEvents').doc();
    batch.set(eventRef, {
      type: 'reservation_expired',
      reservationId: doc.id,
      timestamp: new Date().toISOString(),
      messageAr: `تم إلغاء الحجز تلقائياً لانتهاء الوقت (${doc.id})`,
      messageEn: `Reservation automatically expired due to timeout (${doc.id})`
    });
  });

  await batch.commit();
  console.log(`Expired ${snapshot.size} reservations.`);
});

/**
 * 2. Daily Request Cleanup
 * Runs every day at midnight (Riyadh time) to archive requests older than 24 hours.
 */
export const archiveOldRequests = functions.scheduler.onSchedule(
  {
    schedule: '0 0 * * *',
    timeZone: 'Asia/Riyadh'
  },
  async (event) => {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Archiving active requests that are older than 24 hours
    const snapshot = await db.collection('customerRequests')
      .where('status', '==', 'active')
      .where('createdAt', '<=', twentyFourHoursAgo.toISOString())
      .get();

    if (snapshot.empty) {
      console.log('No old requests to archive.');
      return;
    }

    const batch = db.batch();
    snapshot.forEach(doc => {
      batch.update(doc.ref, { status: 'archived', archivedAt: new Date().toISOString() }); // 'archived' added to CustomerRequest.status type
    });

    await batch.commit();
    console.log(`Archived ${snapshot.size} old requests.`);
  }
);

/**
 * 3. Firestore Trigger: Audit Logs for New Requests
 * Automatically catches new requests and writes an audit log to systemEvents.
 */
export const logNewRequestEvent = functions.firestore.onDocumentCreated(
  'customerRequests/{requestId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data();
    
    await db.collection('systemEvents').add({
      type: 'request_created_audit',
      requestId: event.params.requestId,
      timestamp: new Date().toISOString(),
      messageAr: `طلب جديد تم إنشاؤه لمنتج: ${data.productName}`,
      messageEn: `New request created for product: ${data.productName}`
    });
    
    console.log(`Logged new request creation for ${event.params.requestId}`);
  }
);
