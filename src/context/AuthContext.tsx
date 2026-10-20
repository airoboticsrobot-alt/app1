import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  setPersistence,
  User,
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db, firebaseConfigError, isFirebaseConfigured } from '../services/firebase';
import { dataService } from '../services/dataService';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  profileError: string | null;
  loading: boolean;
  login: (email: string, password: string, requiredRole: UserRole, admissionNumber?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  role: UserRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const authEventId = useRef(0);

  if (!isFirebaseConfigured || !auth || !db) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-xl rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-bold text-slate-900">Firebase configuration required</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This app cannot start until the Firebase environment variables are added to the project root .env file.
          </p>
          <div className="mt-5 rounded-lg bg-slate-50 p-4 text-left text-xs text-slate-700">
            <p className="font-semibold text-slate-800">Example:</p>
            <pre className="mt-2 whitespace-pre-wrap break-words">
{`VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id`}
            </pre>
          </div>
          <p className="mt-4 text-xs text-amber-700">
            {firebaseConfigError || 'Missing environment variables are preventing Firebase from initializing.'}
          </p>
        </div>
      </div>
    );
  }

  const fetchProfile = async (firebaseUser: User): Promise<UserProfile> => {
    const snapshot = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (!snapshot.exists()) {
      throw new Error('Your account has no school profile. Contact your school administrator.');
    }

    const data = snapshot.data();
    const role = data.role;
    if (role !== 'admin' && role !== 'teacher' && role !== 'student') {
      throw new Error('Your school profile does not have a valid portal role. Contact your administrator.');
    }

    if (role === 'student') {
      const linkedId = typeof data.linkedId === 'string' ? data.linkedId : '';
      if (!linkedId || !(await dataService.getStudentByLinkedId(linkedId))) {
        throw new Error('This student account is inactive or has no linked student record. Contact your school administrator.');
      }
    }

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      role,
      displayName: typeof data.displayName === 'string' && data.displayName.trim()
        ? data.displayName
        : firebaseUser.displayName || firebaseUser.email || 'User',
      linkedId: typeof data.linkedId === 'string' ? data.linkedId : undefined,
    };
  };

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const eventId = ++authEventId.current;
      setCurrentUser(user);
      setLoading(true);
      if (!user) {
        setUserProfile(null);
        setProfileError(null);
        setLoading(false);
        return;
      }

      try {
        const profile = await fetchProfile(user);
        if (active && eventId === authEventId.current) {
          setUserProfile(profile);
          setProfileError(null);
        }
      } catch (error) {
        console.error('Unable to load school user profile:', error);
        if (active && eventId === authEventId.current) {
          setUserProfile(null);
          setProfileError(error instanceof Error ? error.message : 'Unable to verify your school account.');
        }
      } finally {
        if (active && eventId === authEventId.current) setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string, requiredRole: UserRole, admissionNumber?: string) => {
    if (!auth || !db) {
      throw new Error(firebaseConfigError || 'Firebase is not configured.');
    }

    setLoading(true);
    let authenticatedUid: string | null = null;
    try {
      await setPersistence(auth, browserLocalPersistence);
      const { user } = await signInWithEmailAndPassword(auth, email.trim(), pass);
      authenticatedUid = user.uid;
      if (requiredRole === 'student') {
        await dataService.ensureStudentUserProfile(user.uid, user.email || email, admissionNumber || '');
      }
      const profile = await fetchProfile(user);
      if (profile.role !== requiredRole) {
        await firebaseSignOut(auth);
        throw new Error('Access denied. This account is not authorized for the ' + requiredRole + ' portal.');
      }

      authEventId.current += 1;
      setCurrentUser(user);
      setUserProfile(profile);
      setProfileError(null);
    } catch (error) {
      if (authenticatedUid && auth.currentUser?.uid === authenticatedUid) {
        await firebaseSignOut(auth);
        setCurrentUser(null);
        setUserProfile(null);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    setCurrentUser(null);
    setUserProfile(null);
    setProfileError(null);
  };

  const updateDisplayName = async (displayName: string) => {
    const normalizedName = displayName.trim();
    if (normalizedName.length < 2 || normalizedName.length > 100) {
      throw new Error('Display name must be between 2 and 100 characters.');
    }
    if (!currentUser || !userProfile) throw new Error('No authenticated school profile is available.');

    await updateDoc(doc(db, 'users', currentUser.uid), { displayName: normalizedName });
    setUserProfile({ ...userProfile, displayName: normalizedName });
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        profileError,
        loading,
        login,
        logout,
        updateDisplayName,
        role: userProfile?.role || null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
