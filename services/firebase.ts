import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDQENN70h56K73SdBrV0ybrYNQUUlNGvcw",
  authDomain: "asistenguru-aa8e6.firebaseapp.com",
  projectId: "asistenguru-aa8e6",
  storageBucket: "asistenguru-aa8e6.firebasestorage.app",
  messagingSenderId: "958343153745",
  appId: "1:958343153745:web:8f54e0eb1b02b1f6a91070",
  measurementId: "G-FG26Y77MF9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export auth instance
export const auth = getAuth(app);
