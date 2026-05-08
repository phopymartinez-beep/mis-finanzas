import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCgfxsb7OQ0I4V784NsEWlTTFOJ0bn2f9s",
  authDomain: "mis-finanzas-128be.firebaseapp.com",
  projectId: "mis-finanzas-128be",
  storageBucket: "mis-finanzas-128be.firebasestorage.app",
  messagingSenderId: "1075794025775",
  appId: "1:1075794025775:web:4a94c5fde9c67bbf3a15da"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
