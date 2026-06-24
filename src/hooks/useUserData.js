import { useEffect, useState } from "react";
import { onSnapshot, query, orderBy } from "firebase/firestore";
import {
  accountsCol,
  recurringCol,
  transactionsCol,
  userDoc,
} from "../lib/firestoreData";

function useDocSnapshot(ref) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!ref) return;
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
      },
      (err) => {
        console.warn("doc snapshot error", err);
        setLoading(false);
      }
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref?.path]);
  return { data, loading };
}

function useCollectionSnapshot(q) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!q) return;
    console.log("[useCollectionSnapshot] Setting up listener for:", q?._query?.path?.canonicalString?.());
    const unsub = onSnapshot(
      q,
      (snap) => {
        const out = [];
        snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
        console.log("[useCollectionSnapshot] Fetched", out.length, "items from", q?._query?.path?.canonicalString?.());
        setItems(out);
        setLoading(false);
      },
      (err) => {
        console.error("[useCollectionSnapshot] Error for", q?._query?.path?.canonicalString?.(), ":", err);
        setLoading(false);
      }
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?._query?.path?.canonicalString?.()]);
  return { items, loading };
}

export function useUserData(uid) {
  const profile = useDocSnapshot(uid ? userDoc(uid) : null);
  const accounts = useCollectionSnapshot(uid ? accountsCol(uid) : null);
  // Try without ordering first to see if that's the issue
  const transactions = useCollectionSnapshot(uid ? transactionsCol(uid) : null);
  const recurring = useCollectionSnapshot(uid ? recurringCol(uid) : null);

  console.log("[useUserData] Fetched transactions:", transactions.items.length, "items");
  if (transactions.items.length > 0) {
    console.log("[useUserData] Date range:", transactions.items[0].date, "to", transactions.items[transactions.items.length - 1].date);
    console.log("[useUserData] First 3 transactions:", transactions.items.slice(0, 3).map(t => ({ id: t.id, date: t.date, amount: t.amount, type: t.type })));
  }

  return {
    profile: profile.data,
    accounts: accounts.items,
    transactions: transactions.items,
    recurring: recurring.items,
    loading:
      profile.loading ||
      accounts.loading ||
      transactions.loading ||
      recurring.loading,
  };
}
