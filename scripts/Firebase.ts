import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyByu91PzcKHoQoo2lYLtHgK2tLde7YLRh8",
  authDomain: "oneridetho-41cfa.firebaseapp.com",
  projectId: "oneridetho-41cfa",
  storageBucket: "oneridetho-41cfa.appspot.com",
  messagingSenderId: "22675141081",
  appId: "1:22675141081:web:ce6585ebd6b1df405229c8",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
