import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCVH8_UhxO5hAj0ZBlA_lRw3B0hnN1zEOc",
  authDomain: "nonsensechattm-e5d18.firebaseapp.com",
  databaseURL: "https://nonsensechattm-e5d18-default-rtdb.firebaseio.com",
  projectId: "nonsensechattm-e5d18",
  storageBucket: "nonsensechattm-e5d18.firebasestorage.app",
  messagingSenderId: "497380539024",
  appId: "1:497380539024:web:cace5570f62f9e073af615",
  measurementId: "G-NC89Y47FVD"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
