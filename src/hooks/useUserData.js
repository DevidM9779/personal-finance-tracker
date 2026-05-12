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
    const unsub = onSnapshot(
      q,
      (snap) => {
        const out = [];
        snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
        setItems(out);
        setLoading(false);
      },
      (err) => {
        console.warn("collection snapshot error", err);
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
  const transactions = useCollectionSnapshot(
    uid ? query(transactionsCol(uid), orderBy("date", "desc")) : null
  );
  const recurring = useCollectionSnapshot(uid ? recurringCol(uid) : null);

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
