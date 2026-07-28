import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebase, isFirebaseReady } from "../config/firebase";
import { useSchool } from "./SchoolContext";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { status: schoolStatus, school } = useSchool();
  const [user, setUser] = useState(null); // firebase auth user
  const [profile, setProfile] = useState(null); // /users/{uid} doc
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (schoolStatus !== "ready") {
      setLoading(schoolStatus === "loading");
      return;
    }
    if (!isFirebaseReady()) return;

    const { auth, db } = getFirebase();
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        try {
          const ref = doc(db, "users", fbUser.uid);
          let snap = await getDoc(ref);

          // AUTO-BOOTSTRAP: if this user has no profile AND the school isn't
          // set up yet, they are the first person on this portal. Promote them
          // to director automatically. This handles the case where someone
          // creates a Firebase Auth user directly (via console or elsewhere)
          // and then logs in for the first time.
          if (!snap.exists()) {
            const schoolSnap = await getDoc(doc(db, "school", "root"));
            const schoolReady =
              schoolSnap.exists() && schoolSnap.data().setupComplete === true;
            if (!schoolReady) {
              await setDoc(ref, {
                email: fbUser.email,
                fullName: fbUser.displayName || fbUser.email.split("@")[0],
                role: "director",
                active: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              snap = await getDoc(ref);
              console.info(
                "[AuthContext] Auto-promoted first user to director",
              );
            }
          }

          setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        } catch (err) {
          console.error("[AuthContext] profile fetch error:", err);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
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
