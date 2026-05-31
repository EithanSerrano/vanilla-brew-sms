import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; 


const firebaseConfig = {
  apiKey: "AIzaSyDM32iorEzxNtkpokv4R2WVdZCOGq9AwkA",
  authDomain: "vnlbrewsystem.firebaseapp.com",
  projectId: "vnlbrewsystem",
  storageBucket: "vnlbrewsystem.firebasestorage.app",
  messagingSenderId: "113399496147",
  appId: "1:113399496147:web:48b9214b106dfdedbcc326",
  measurementId: "G-S601KQ7JPX"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
export { firebaseConfig };

