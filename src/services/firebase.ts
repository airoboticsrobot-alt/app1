import { initializeApp, getApps, getApp, deleteApp } from 'firebase/app';
import { getAuth, inMemoryPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const missingConfig = Object.entries(firebaseConfig)
  .filter(([key, value]) => key !== 'measurementId' && (!value || String(value).trim() === ''))
  .map(([key]) => key);

export const firebaseConfigError = missingConfig.length > 0
  ? 'Missing Firebase configuration: ' + missingConfig.join(', ')
  : null;

export const isFirebaseConfigured = missingConfig.length === 0;

const app = isFirebaseConfigured ? (!getApps().length ? initializeApp(firebaseConfig) : getApp()) : null;
export const auth = app ? getAuth(app) : (null as any);
export const db = app ? getFirestore(app) : (null as any);

export const createStudentProvisioningAuth = async () => {
  if (!isFirebaseConfigured) {
    throw new Error(firebaseConfigError || 'Firebase is not configured.');
  }

  const provisioningApp = initializeApp(firebaseConfig, 'student-provisioning-' + crypto.randomUUID());
  const provisioningAuth = getAuth(provisioningApp);
  await setPersistence(provisioningAuth, inMemoryPersistence);

  return {
    auth: provisioningAuth,
    dispose: () => deleteApp(provisioningApp),
  };
};

export default app;
