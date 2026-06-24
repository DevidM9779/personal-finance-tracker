import {
  collection,
  doc,
  setDoc,
  addDoc,
  query,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export const netWorthSnapshotsCol = (uid) =>
  collection(db, "users", uid, "netWorthSnapshots");

/**
 * Create a net worth snapshot for a specific month
 */
export async function createNetWorthSnapshot(uid, snapshotData) {
  return addDoc(netWorthSnapshotsCol(uid), {
    ...snapshotData,
    createdAt: serverTimestamp(),
  });
}

/**
 * Get all net worth snapshots for a user, ordered by creation time
 */
export async function getNetWorthSnapshots(uid) {
  const q = query(netWorthSnapshotsCol(uid));
  const querySnapshot = await getDocs(q);
  const items = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  // Sort by createdAt descending (newest first)
  items.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() || a.createdAt || 0;
    const bTime = b.createdAt?.toMillis?.() || b.createdAt || 0;
    return bTime - aTime;
  });
  return items;
}

/**
 * Create or update a net worth snapshot for the current date
 */
export async function upsertNetWorthSnapshot(uid, accounts) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  const date = now.toISOString().split('T')[0]; // YYYY-MM-DD format

  // Calculate current net worth
  const liquidCash = accounts
    .filter((a) => a.type === "bank" && a.isActive !== false)
    .reduce((sum, a) => sum + Number(a.balance || 0), 0);

  const assets = accounts
    .filter((a) => a.type === "asset" && a.isActive !== false)
    .reduce((sum, a) => sum + Number(a.balance || 0), 0);

  const creditDebt = accounts
    .filter((a) => a.type === "creditCard" && a.isActive !== false)
    .reduce((sum, a) => sum + Number(a.currentBalance || 0), 0);

  const netWorth = liquidCash + assets - creditDebt;

  // Check if snapshot already exists for this date
  const q = query(netWorthSnapshotsCol(uid));
  const querySnapshot = await getDocs(q);

  const existingSnapshot = querySnapshot.docs.find(
    (doc) => doc.data().date === date
  );

  const snapshotData = {
    year,
    month,
    liquidCash,
    assets,
    creditDebt,
    netWorth,
    date,
  };

  if (existingSnapshot) {
    // Update existing snapshot
    await setDoc(doc(db, "users", uid, "netWorthSnapshots", existingSnapshot.id), snapshotData, {
      merge: true,
    });
    return { id: existingSnapshot.id, ...snapshotData };
  } else {
    // Create new snapshot
    return await createNetWorthSnapshot(uid, snapshotData);
  }
}