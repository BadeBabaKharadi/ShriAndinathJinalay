import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-functions.js";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC7JQJ6MmkcKF_ijnIUyahzmKER78FXZFw",
  appId: "1:817235117988:web:5d879779d999bce98ce331",
  authDomain: "jain-community-platform.firebaseapp.com",
  projectId: "jain-community-platform",
  storageBucket: "jain-community-platform.firebasestorage.app",
  messagingSenderId: "817235117988",
};

export function createFirebaseFunctionsClient() {
  const app = initializeApp(FIREBASE_CONFIG);
  return getFunctions(app, "asia-south1");
}

export async function callFirebaseFunction(functions, functionName, data) {
  const callable = httpsCallable(functions, functionName);
  return callable(data);
}
