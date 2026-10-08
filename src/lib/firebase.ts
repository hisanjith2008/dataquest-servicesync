import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  updateDoc,
  onSnapshot,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
import { getAuth, signInAnonymously, Auth, User } from 'firebase/auth';

const firebaseConfig = {
  projectId: 'spiritual-origin-m4mm2',
  appId: '1:915819019927:web:9fa36c46880d3ace8d73d2',
  apiKey: 'AIzaSyBzgjOH68QgSucm8iTsB1Va5nqWshRT5y8',
  authDomain: 'spiritual-origin-m4mm2.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-remixremixremixr-663c2470-f683-4c12-8360-8fff383bf87d',
  storageBucket: 'spiritual-origin-m4mm2.firebasestorage.app',
  messagingSenderId: '915819019927',
};

// Initialize Firebase App
export const app: FirebaseApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApps()[0];

// Initialize Firestore targeting the provisioned database ID
export const db: Firestore = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId
);

// Initialize Firebase Auth
export const auth: Auth = getAuth(app);

// Keep track of auth ready state
let authPromise: Promise<User | null> | null = null;

export const ensureFirebaseAuth = async (): Promise<User | null> => {
  if (auth.currentUser) return auth.currentUser;
  if (!authPromise) {
    authPromise = signInAnonymously(auth)
      .then((cred) => cred.user)
      .catch((err) => {
        console.warn('Anonymous Firebase auth note:', err);
        return null;
      });
  }
  return authPromise;
};

// Bootstrap auth immediately
ensureFirebaseAuth();

// Validate connection to Firestore (Required by skill)
async function testConnection() {
  try {
    await ensureFirebaseAuth();
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Please check your Firebase configuration.');
    }
  }
}

testConnection();

export { doc, setDoc, updateDoc, onSnapshot };
export type { Unsubscribe };
