import { createContext, useContext, useEffect, useState } from "react";
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
 * AuthProvider — tracks the current auth user AND their /users/{uid} doc.
 *
 * v2 change: uses onSnapshot for the profile so it updates LIVE. When a
 * new teacher signs up via /api/staff-signup, the profile doc is created
 * by the server a moment after the Firebase Auth account. The listener
 * catches that and updates without a page refresh.
 *
 * When the director approves a pending teacher (status: pending → active),
 * the listener catches that too — the teacher's UI updates instantly.
 */
export function AuthProvider({ children }) {
  const { status: schoolStatus, school } = useSchool();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (schoolStatus !== "ready") {
      setLoading(schoolStatus === "loading");
      return;
    }
    if (!isFirebaseReady()) return;

    const { auth, db } = getFirebase();
    let profileUnsub = null;

    const authUnsub = onAuthStateChanged(auth, (fbUser) => {
      setUser(fbUser);

      // Clean up any prior profile listener
      if (profileUnsub) {
        try {
          profileUnsub();
        } catch {}
        profileUnsub = null;
      }

      if (!fbUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Subscribe to the profile doc LIVE. Fires when doc is created by
      // /api/staff-signup, when director approves, when anything changes.
      profileUnsub = onSnapshot(
        doc(db, "users", fbUser.uid),
        async (snap) => {
          if (snap.exists()) {
            setProfile({ id: snap.id, ...snap.data() });
            setLoading(false);
            return;
          }

          // Doc doesn't exist yet. Two cases:
          //   1. Fresh signup — API is still writing. Wait a moment.
          //   2. First director on a new school — auto-bootstrap.
          try {
            const schoolSnap = await getDoc(doc(db, "school", "root"));
            const schoolReady =
              schoolSnap.exists() && schoolSnap.data().setupComplete === true;

            if (!schoolReady) {
              // First director on a new portal — auto-promote
              await setDoc(doc(db, "users", fbUser.uid), {
                email: fbUser.email,
                fullName: fbUser.displayName || fbUser.email.split("@")[0],
                role: "director",
                status: "active",
                active: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              // onSnapshot will fire again with the new doc
              console.info(
                "[AuthContext] Auto-promoted first user to director",
              );
              return;
            }

            // School is set up — this is likely a teacher signup mid-flight.
            // Keep loading=true briefly to give the API time to write.
            // If after 6 seconds the doc still doesn't exist, treat as no profile.
            setLoading(true);
            setTimeout(() => {
              // Re-check
              getDoc(doc(db, "users", fbUser.uid)).then((s) => {
                if (!s.exists()) {
                  console.warn("[AuthContext] No profile after wait");
                  setProfile(null);
                  setLoading(false);
                }
              });
            }, 6000);
          } catch (err) {
            console.error("[AuthContext] profile check error:", err);
            setProfile(null);
            setLoading(false);
          }
        },
        (err) => {
          console.error("[AuthContext] profile listener error:", err);
          setProfile(null);
          setLoading(false);
        },
      );
    });

    return () => {
      authUnsub();
      if (profileUnsub) {
        try {
          profileUnsub();
        } catch {}
      }
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
      value={{ user, profile, loading, login, logout, registerDirector }}
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
