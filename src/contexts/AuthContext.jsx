import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebase, isFirebaseReady } from "../config/firebase";
import { useSchool } from "./SchoolContext";

const AuthContext = createContext(null);

/**
 * AuthProvider — v3
 *
 * v3 change: robust profile loading for slow devices. When a teacher signs
 * up on a fresh phone, several things can delay the profile:
 *   - Auth token propagation to Firestore SDK (1-3 seconds)
 *   - API server-side write commit (can be 2-5 seconds on cold Vercel start)
 *   - Firestore listener replication to client (variable on slow networks)
 *
 * Old behavior: give up after 6 seconds, set profile=null, get stuck on
 * "Loading your account…" forever.
 *
 * New behavior:
 *   1. onSnapshot with error retry — permission-denied restarts the listener
 *      after 2s (auth not ready yet)
 *   2. Doc-doesn't-exist wait extended to 30 seconds with polling
 *   3. Final failsafe: after 30s of trying, sign user out and send back to
 *      login with a friendly message. No more infinite spinner.
 */
export function AuthProvider({ children }) {
  const { status: schoolStatus, school } = useSchool();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Refs so timeout handlers can check "am I still relevant" without stale closures
  const cleanupRef = useRef(null);

  useEffect(() => {
    if (schoolStatus !== "ready") {
      setLoading(schoolStatus === "loading");
      return;
    }
    if (!isFirebaseReady()) return;

    const { auth, db } = getFirebase();
    let profileUnsub = null;
    let retryTimeout = null;
    let failsafeTimeout = null;
    let listenerRetries = 0;
    let pollingActive = false;

    function cleanupSubscriptions() {
      if (profileUnsub) {
        try {
          profileUnsub();
        } catch {}
        profileUnsub = null;
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
      }
      if (failsafeTimeout) {
        clearTimeout(failsafeTimeout);
        failsafeTimeout = null;
      }
      pollingActive = false;
    }

    cleanupRef.current = cleanupSubscriptions;

    const authUnsub = onAuthStateChanged(auth, (fbUser) => {
      setUser(fbUser);
      cleanupSubscriptions();
      listenerRetries = 0;

      if (!fbUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Set failsafe — if after 30 seconds we don't have a profile, sign out
      failsafeTimeout = setTimeout(() => {
        console.error(
          "[AuthContext] Profile load timed out after 30s. Signing out.",
        );
        setErrorMessage("We couldn't load your account. Please sign in again.");
        signOut(auth).catch(() => {});
      }, 30000);

      subscribeToProfile();

      function subscribeToProfile() {
        if (profileUnsub) {
          try {
            profileUnsub();
          } catch {}
        }

        profileUnsub = onSnapshot(
          doc(db, "users", fbUser.uid),
          async (snap) => {
            if (snap.exists()) {
              // Profile is here — clear all timers and settle
              if (failsafeTimeout) {
                clearTimeout(failsafeTimeout);
                failsafeTimeout = null;
              }
              if (retryTimeout) {
                clearTimeout(retryTimeout);
                retryTimeout = null;
              }
              setProfile({ id: snap.id, ...snap.data() });
              setLoading(false);
              return;
            }

            // Doc doesn't exist yet. Two cases:
            //   1. Brand-new Firebase project, no school doc at all → the
            //      first person to sign in bootstraps themselves as director
            //   2. Fresh staff signup where the API is still writing
            try {
              const schoolSnap = await getDoc(doc(db, "school", "root"));

              // The bootstrap window is ONLY while school/root is absent.
              // It used to be "school not setupComplete", which left a live
              // school wide open: anyone who created an auth account got a
              // director profile written for them. Once the director creates
              // the school doc in step 1 of the wizard, this path is closed
              // and Firestore rules reject it too.
              const isFreshProject = !schoolSnap.exists();

              if (isFreshProject) {
                await setDoc(doc(db, "users", fbUser.uid), {
                  email: fbUser.email,
                  fullName: fbUser.displayName || fbUser.email.split("@")[0],
                  role: "director",
                  status: "active",
                  active: true,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
                console.info(
                  "[AuthContext] Auto-promoted first user to director",
                );
                // onSnapshot will fire again with the new doc
                return;
              }

              // Wait — we're expecting the API to write. Poll every 2s
              // until the failsafe fires (30s total).
              if (!pollingActive) {
                pollingActive = true;
                pollForProfile();
              }
            } catch (err) {
              console.error("[AuthContext] setup check error:", err);
              // Ignore — the listener + failsafe will handle the outcome
            }
          },
          (err) => {
            console.warn(
              "[AuthContext] profile listener error:",
              err.message,
              "attempt",
              listenerRetries + 1,
            );
            // Permission-denied often means auth token isn't fully propagated
            // yet. Retry the subscription up to 5 times with backoff.
            if (listenerRetries < 5) {
              listenerRetries++;
              retryTimeout = setTimeout(() => {
                subscribeToProfile();
              }, 2000 * listenerRetries);
            } else {
              setErrorMessage(
                "We couldn't verify your account. Please try again.",
              );
              setProfile(null);
              setLoading(false);
            }
          },
        );
      }

      // Poll for the profile doc — used when signup API is still completing
      async function pollForProfile() {
        for (let i = 0; i < 15 && pollingActive; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          if (!pollingActive) return;
          try {
            const snap = await getDoc(doc(db, "users", fbUser.uid));
            if (snap.exists()) {
              // Found it — the onSnapshot listener will pick it up too,
              // but set it now to avoid extra delay
              if (failsafeTimeout) {
                clearTimeout(failsafeTimeout);
                failsafeTimeout = null;
              }
              setProfile({ id: snap.id, ...snap.data() });
              setLoading(false);
              pollingActive = false;
              return;
            }
          } catch (err) {
            console.warn(`[AuthContext] Poll ${i + 1} failed:`, err.message);
          }
        }
      }
    });

    return () => {
      authUnsub();
      cleanupSubscriptions();
    };
  }, [schoolStatus]);

  const login = async (email, password) => {
    const { auth } = getFirebase();
    return signInWithEmailAndPassword(auth, email, password);
  };

  const registerDirector = async ({ email, password, fullName }) => {
    const { auth, db } = getFirebase();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: fullName });
    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      fullName,
      role: "director",
      status: "active",
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return cred.user;
  };

  const logout = async () => {
    const { auth } = getFirebase();
    return signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        errorMessage,
        login,
        logout,
        registerDirector,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
