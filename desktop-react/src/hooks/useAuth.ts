import { useState, useEffect } from 'react';
import { auth, rtdb } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { ref, get, set, update, serverTimestamp, onDisconnect } from 'firebase/database';
import type { User } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const userRef = ref(rtdb, 'users/' + fbUser.uid);
          const snap = await get(userRef);

          if (snap.exists()) {
            const data = snap.val();
            setUser({ uid: fbUser.uid, ...data } as User);
          } else {
            // Create user profile in RTDB
            const newUser: User = {
              uid: fbUser.uid,
              nick: fbUser.email?.split('@')[0] || 'user_' + fbUser.uid.slice(0, 6),
              displayName: fbUser.displayName || '',
              avatar: '',
              online: true,
            };
            await set(userRef, {
              ...newUser,
              createdAt: serverTimestamp(),
            });
            setUser(newUser);
          }

          // Presence management via RTDB
          await update(userRef, { online: true, lastSeen: serverTimestamp() });
          try {
            onDisconnect(ref(rtdb, `users/${fbUser.uid}/online`)).set(false);
          } catch (_) {}
        } catch (e) {
          console.error('Error fetching user from RTDB:', e);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: unknown) {
      const err = e as { code: string };
      const msgs: Record<string, string> = {
        'auth/invalid-credential': 'Неверный email или пароль',
        'auth/user-not-found': 'Пользователь не найден',
        'auth/wrong-password': 'Неверный пароль',
        'auth/invalid-email': 'Неверный формат email',
      };
      setError(msgs[err.code] || 'Ошибка входа');
      throw e;
    }
  };

  const register = async (email: string, password: string, nick: string) => {
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      try {
        await sendEmailVerification(cred.user, {
          url: window.location.origin + '/?emailVerified=true',
          handleCodeInApp: false
        });
      } catch (mailErr) {
        console.warn('sendEmailVerification error:', mailErr);
      }
      const userRef = ref(rtdb, 'users/' + cred.user.uid);
      await set(userRef, {
        uid: cred.user.uid,
        nick,
        displayName: nick,
        avatar: '',
        bio: '',
        online: true,
        createdAt: serverTimestamp(),
      });
    } catch (e: unknown) {
      const err = e as { code: string };
      const msgs: Record<string, string> = {
        'auth/email-already-in-use': 'Email уже используется',
        'auth/weak-password': 'Слабый пароль (мин. 6 символов)',
        'auth/invalid-email': 'Неверный формат email',
      };
      setError(msgs[err.code] || 'Ошибка регистрации');
      throw e;
    }
  };

  const logout = async () => {
    if (firebaseUser) {
      try {
        await update(ref(rtdb, 'users/' + firebaseUser.uid), {
          online: false,
          lastSeen: serverTimestamp(),
        });
      } catch (_) {}
    }
    await signOut(auth);
  };

  return { user, firebaseUser, loading, error, login, register, logout };
}
