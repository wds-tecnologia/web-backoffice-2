// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

// const firebaseConfig = {
//   apiKey: "AIzaSyDxrED7qI5uQuBZHuZDq90BtDmYRrqwIXY",
//   authDomain: "yntech-5bddf.firebaseapp.com",
//   projectId: "yntech-5bddf",
//   storageBucket: "yntech-5bddf.appspot.com",
//   messagingSenderId: "434551409037",
//   appId: "1:434551409037:web:f8553a61b77d571cea15c4",
//   measurementId: "G-1RFK4N4LQK"
// };

export const firebaseConfig = {
  apiKey: "AIzaSyCDikBrDmbZwiUKRcbRHs7K74BqSPMnrsA",
  authDomain: "teste-6e193.firebaseapp.com",
  projectId: "teste-6e193",
  storageBucket: "teste-6e193.appspot.com",
  messagingSenderId: "880656675122",
  appId: "1:880656675122:web:aabe27083e522ebe9ce72b",
  measurementId: "G-8QLVFZ7Y0N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
