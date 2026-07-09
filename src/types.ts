/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
  isVoice?: boolean;
  date?: string; // ISO date format YYYY-MM-DD for daily clustering
  attachments?: {
    name: string;
    type: 'image' | 'video' | 'file';
    url: string;
  }[];
}

export interface AmbientSound {
  id: string;
  name: string;
  nativeName: string;
  icon: string;
  audioUrl: string; // We can use royalty-free ambient synth or build an audio oscillator loop
  isPlaying: boolean;
  volume: number;
}

export interface AudioSession {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: "meditacao" | "diario" | "audioterapia" | "fantasia";
  narrativeText: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  nickname: string;
  preferredSound?: string;
  createdAt: string;
  plan?: 'free' | 'premium' | 'elite';
  tokens?: number;
}

export interface DiaryEntry {
  id: string; // "YYYY-MM-DD" style key
  date: string; // readable date, like "28 de Maio de 2026"
  content: string; // Narrative
  status: "generated" | "insufficient" | "edited";
  summary?: string[]; // key highlights
  intensity?: number; // emotional weight 1-5
  createdAt: string;
}

export interface HistoryEntry {
  id: string;
  title: string;
  imageUrl: string;
  description: string;
  story: string;
  type: "upload" | "generated";
  createdAt: string;
}


