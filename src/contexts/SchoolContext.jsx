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
  const [status, setStatus] = useState("loading"); // loading | main | notFound | ready
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

        const { db } = getFirebase();

        // Subscribe (or resubscribe) to the school root doc.
        // Cleans up any prior listener first.
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
              setStatus("ready"); // still ready, just no school doc yet
            },
          );
        }

        // Initial subscribe — will fail with permission-denied if anonymous
        subscribeToSchoolDoc();

        // Resubscribe whenever auth state changes so that after login we
        // read the doc with the user's credentials.
        try {
          const auth = getAuth();
          authUnsub = onAuthStateChanged(auth, () => {
            subscribeToSchoolDoc();
          });
        } catch (authErr) {
          console.warn(
            "[SchoolContext] Could not attach auth listener:",
            authErr.message,
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
