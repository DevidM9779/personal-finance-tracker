import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";

// All financial data is nested under /users/{uid} so that Firestore security
// rules can enforce a hard boundary: no user can ever read another user's
// data.

export const userDoc = (uid) => doc(db, "users", uid);
export const accountsCol = (uid) => collection(db, "users", uid, "accounts");
export const transactionsCol = (uid) =>
  collection(db, "users", uid, "transactions");
export const recurringCol = (uid) =>
  collection(db, "users", uid, "recurringExpenses");

export async function ensureUserProfile(user) {
  if (!user) return;
  const ref = userDoc(user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email: user.email || "",
      displayName: user.displayName || "",
      expectedMonthlyIncome: 0,
      preferredDebtPaymentDayOfMonth: 1,
      createdAt: serverTimestamp(),
    });
  }
}

export async function updateProfile(uid, patch) {
  // Replace your existing db reference if it's named differently
  const userRef = doc(db, "users", uid); 
  
  // Use setDoc with { merge: true } instead of updateDoc
  return setDoc(userRef, patch, { merge: true });
}

export async function createAccount(uid, data) {
  return addDoc(accountsCol(uid), {
    ...data,
    isActive: data.isActive !== false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateAccount(uid, accountId, patch) {
  await updateDoc(doc(db, "users", uid, "accounts", accountId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAccount(uid, accountId) {
  await deleteDoc(doc(db, "users", uid, "accounts", accountId));
}

export async function createTransaction(uid, data) {
  return addDoc(transactionsCol(uid), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTransaction(uid, txId) {
  await deleteDoc(doc(db, "users", uid, "transactions", txId));
}

export async function updateTransaction(uid, txId, patch) {
  await updateDoc(doc(db, "users", uid, "transactions", txId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function createRecurring(uid, data) {
  return addDoc(recurringCol(uid), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateRecurring(uid, recurringId, patch) {
  await updateDoc(doc(db, "users", uid, "recurringExpenses", recurringId), patch);
}

export async function deleteRecurring(uid, recurringId) {
  await deleteDoc(doc(db, "users", uid, "recurringExpenses", recurringId));
}
