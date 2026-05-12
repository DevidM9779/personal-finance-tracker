import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { ensureUserProfile } from "../lib/firestoreData";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (current) => {
      setUser(current);
      if (current) {
        try {
          await ensureUserProfile(current);
        } catch (err) {
          console.warn("Failed to ensure user profile", err);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { user, loading };
}
