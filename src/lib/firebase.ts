/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configurações do Firebase utilizando variáveis de ambiente seguras para Vite.
// Os valores padrões são preenchidos apontando para o seu projeto 'meubarao-b049c'.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCuGbFNRoKNDdertNjdodplkSNuoa-eXZ0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "meubarao-b049c.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "meubarao-b049c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "meubarao-b049c.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1024630213933",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1024630213933:web:11aa178f30ffcfac17d7a4"
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
    db = getFirestore(app);
  } catch (error) {
    console.error("Erro durante a inicialização do Firebase Client:", error);
  }
} else {
  console.warn("[Firebase] Chave VITE_FIREBASE_API_KEY pendente de configuração no ambiente. Inicialização suspensa.");
}

export { app, auth, db };
export default app;
