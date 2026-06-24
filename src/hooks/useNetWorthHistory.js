import { useEffect, useState } from "react";
import { onSnapshot, query } from "firebase/firestore";
import { netWorthSnapshotsCol, upsertNetWorthSnapshot } from "../lib/netWorthSnapshots";

export function useNetWorthHistory(uid, accounts = []) {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!uid) {
      setSnapshots([]);
      setLoading(false);
      return;
    }

    console.log("[NetWorthHistory] Fetching for user:", uid, "with accounts:", accounts.length);
    const q = query(netWorthSnapshotsCol(uid));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
        // Sort by year and month descending (newest first)
        items.sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        });
        console.log("[NetWorthHistory] Fetched snapshots:", items.length, "items:", items);
        setSnapshots(items);
        setLoading(false);

        // Hydration logic: create initial snapshot if none exist
        if (!hydrated && items.length === 0 && accounts.length > 0) {
          console.log("[NetWorthHistory] No snapshots, attempting hydration with", accounts.length, "accounts");
          // Delay hydration slightly to avoid conflicts with initial fetch
          setTimeout(() => {
            upsertNetWorthSnapshot(uid, accounts)
              .then((result) => {
                console.log("[NetWorthHistory] Hydration successful:", result);
                setHydrated(true);
              })
              .catch((err) => {
                console.error("[NetWorthHistory] Hydration failed:", err);
              });
          }, 1000);
        }
      },
      (err) => {
        console.error("[NetWorthHistory] Snapshot fetch error:", err);
        setLoading(false);
        // If fetch fails, try hydration anyway
        if (!hydrated && accounts.length > 0) {
          console.log("[NetWorthHistory] Fetch failed, attempting hydration anyway");
          upsertNetWorthSnapshot(uid, accounts)
            .then((result) => {
              console.log("[NetWorthHistory] Hydration after fetch error successful:", result);
              setHydrated(true);
            })
            .catch((err) => {
              console.error("[NetWorthHistory] Hydration after fetch error failed:", err);
            });
        }
      }
    );

    return () => unsub();
  }, [uid, accounts, hydrated]);

  console.log("[NetWorthHistory] Returning snapshots:", snapshots.length, "loading:", loading);
  return { snapshots, loading };
}