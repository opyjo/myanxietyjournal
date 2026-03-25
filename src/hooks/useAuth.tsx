import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { auth, isFirebaseConfigured } from "../lib/firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  firebaseReady: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      firebaseReady: isFirebaseConfigured,
      signInWithGoogle: async () => {
        if (!auth) {
          return;
        }

        await signInWithPopup(auth, new GoogleAuthProvider());
      },
      signOut: async () => {
        if (!auth) {
          return;
        }

        await firebaseSignOut(auth);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
