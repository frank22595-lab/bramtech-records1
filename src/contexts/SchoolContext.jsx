import { createContext, useContext, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getSchoolSlug, getSchoolConfig } from "../config/schoolRegistry";
import { initFirebaseForSchool, getFirebase } from "../config/firebase";

const SchoolContext = createContext(null);

/**
 * SchoolProvider bootstraps the Firebase project for the current subdomain
 * and provides school-level state to the app.
 *
 * States:
 *  - loading: still figuring out which school and connecting
 *  - main:    on the main marketing/signup domain, no specific school
 *  - notFound: on a subdomain that isn't in the registry
 *  - ready:   Firebase initialized, school doc loaded (or absent if new school)
 *
 * The school doc listener resubscribes on auth state changes so that
 * a permission-denied error from an anonymous visit auto-recovers once
 * the user signs in.
 */
export function SchoolProvider({ children }) {
  const [status, setStatus] = useState("loading");
  const [slug, setSlug] = useState(null);
  const [school, setSchool] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let schoolUnsub = null;
    let authUnsub = null;

    async function boot() {
      try {
        const detectedSlug = getSchoolSlug();

        if (!detectedSlug) {
          setStatus("main");
          return;
        }

        const config = await getSchoolConfig(detectedSlug);
        if (!config) {
          setSlug(detectedSlug);
          setStatus("notFound");
          return;
        }

        initFirebaseForSchool(detectedSlug, config);
        setSlug(detectedSlug);

        const firebaseHandles = getFirebase();
        const db = firebaseHandles.db;

        // Get the auth instance from the school-specific Firebase app.
        // Try multiple ways since we don't know the exact shape of getFirebase().
        let auth = null;
        try {
          if (firebaseHandles.auth) {
            auth = firebaseHandles.auth;
          } else if (firebaseHandles.app) {
            auth = getAuth(firebaseHandles.app);
          }
        } catch (authErr) {
          console.warn(
            "[SchoolContext] Could not get auth instance:",
            authErr.message,
          );
        }

        function subscribeToSchoolDoc() {
          if (schoolUnsub) {
            try {
              schoolUnsub();
            } catch {}
            schoolUnsub = null;
          }
          schoolUnsub = onSnapshot(
            doc(db, "school", "root"),
            (snap) => {
              setSchool(snap.exists() ? { id: snap.id, ...snap.data() } : null);
              setError(null);
              setStatus("ready");
            },
            (err) => {
              console.error("[SchoolContext] school doc listener error:", err);
              setError(err.message);
              setStatus("ready");
            },
          );
        }

        // Initial subscribe
        subscribeToSchoolDoc();

        // Resubscribe on auth state changes so permission-denied errors
        // recover automatically once the user signs in.
        if (auth) {
          authUnsub = onAuthStateChanged(auth, () => {
            subscribeToSchoolDoc();
          });
        } else {
          console.warn(
            "[SchoolContext] No auth instance available — auto-resubscribe on login disabled",
          );
        }
      } catch (err) {
        console.error("[SchoolContext] boot error:", err);
        setError(err.message);
        setStatus("notFound");
      }
    }

    boot();

    return () => {
      if (schoolUnsub) {
        try {
          schoolUnsub();
        } catch {}
      }
      if (authUnsub) {
        try {
          authUnsub();
        } catch {}
      }
    };
  }, []);

  return (
    <SchoolContext.Provider value={{ status, slug, school, error }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  const ctx = useContext(SchoolContext);
  if (!ctx) throw new Error("useSchool must be used within SchoolProvider");
  return ctx;
}
