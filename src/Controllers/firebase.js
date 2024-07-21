// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyDCPtYoraiMIevTHeCoj1lYLmeXSy0lmfA",
  authDomain: "salondekho-55d7c.firebaseapp.com",
  projectId: "salondekho-55d7c",
  storageBucket: "salondekho-55d7c.appspot.com",
  messagingSenderId: "354866489960",
  appId: "1:354866489960:web:96194f96a0e99a6015e9dd",
  measurementId: "G-8GQ9HRRFD3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


export default db;