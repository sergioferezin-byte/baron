/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configurações do Firebase utilizando variáveis de ambiente seguras para Vite.
// Nenhum valor possui default hardcoded: todas as chaves devem vir do .env.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app: any = null;
let auth: any = null;
let db: any = null;

// Verifica se a chave de API está definida de maneira válida para evitar que o Firebase jogue um erro crítico
const hasApiKey = firebaseConfig.apiKey && firebaseConfig.apiKey.trim() !== "" && firebaseConfig.apiKey !== "undefined";

if (hasApiKey) {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    auth = getAuth(app);
    // This project's Cloud Firestore instance is a named database (auto-provisioned by AI
    // Studio), not the "(default)" one getFirestore(app) connects to by convention — so the
    // database id must be passed explicitly, or every Firestore call fails with
    // "Database '(default)' not found."
    const firestoreDatabaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID;
    db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
  } catch (error) {
    console.error("Erro durante a inicialização do Firebase Client:", error);
  }
} else {
  console.warn("[Firebase] Chave VITE_FIREBASE_API_KEY pendente de configuração no ambiente. Inicialização suspensa.");
}

export { app, auth, db };
export default app;
