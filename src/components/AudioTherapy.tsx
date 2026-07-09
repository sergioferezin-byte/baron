/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { audioSessions } from "../data/sessions";
import { synther } from "../utils/audioSynthesizer";
import { 
  Play, Square, Headphones, Sparkles, Wind, Hourglass, Smile, HelpCircle,
  Music, Copy, Trash, Check, Volume2, Sliders, ChevronRight, RotateCcw,
  FileText, Flame, Disc, Heart, ArrowRight, CornerDownRight, ListMusic,
  Send, AlertCircle, RefreshCw, Mic, MicOff, BookOpen, ArrowLeft, X
} from "lucide-react";
import { User } from "../types";
import BaraoPaywall from "./BaraoPaywall";

interface AudioTherapyProps {
  currentUser?: User | null;
  onPromptAuth?: () => void;
  onUserUpdate?: (updatedUser: User) => void;
  initialSubTab?: "meditacao" | "composicao";
  hideSubTabHeader?: boolean;
}

interface Composition {
  id: string;
  title: string;
  styleTags: string;
  lyrics: string;
  tempo: string;
  instrumentation: string[];
  baronComment: string;
  createdAt: string;
  genre: string;
}

interface SavedMeditation {
  id: string;
  title: string;
  soundHealingConcept: string;
  narrativeSnippet: string;
  sunoPrompt: string;
  chatSummary: string;
  createdAt: string;
}

export default function AudioTherapy({ currentUser, onPromptAuth, onUserUpdate, initialSubTab, hideSubTabHeader }: AudioTherapyProps) {
  // Check if premium or elite
  const isLicensed = currentUser && (currentUser.plan === "premium" || currentUser.plan === "elite");

  if (!isLicensed) {
    return (
      <BaraoPaywall
        currentUser={currentUser || null}
        onPromptAuth={onPromptAuth}
        onUserUpdate={onUserUpdate}
        featureName="Meditação Guiada & Compositor Atmosférico"
      />
    );
  }

  // Navigation tabs of feeling
  const [activeSubTab, setActiveSubTab] = useState<"meditacao" | "composicao">(
    initialSubTab || "meditacao"
  );

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Preset sessions states
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [activeCharIndex, setActiveCharIndex] = useState(0);

  // Respiratory guide state
  const [breathPhase, setBreathPhase] = useState<"inspire" | "segure" | "expire" | "relax">("inspire");
  const [breathTimer, setBreathTimer] = useState(4); // seconds left

  // Composer States
  const [theme, setTheme] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("Bossa Nova Melancólica");
  const [isComposing, setIsComposing] = useState(false);
  const [composingStep, setComposingStep] = useState(0);

  // Load creations from local storage
  const [compositions, setCompositions] = useState<Composition[]>(() => {
    const storeKey = currentUser ? `mb_compositions_${currentUser.id}` : "mb_compositions_guest";
    const saved = localStorage.getItem(storeKey);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });

  const [activeComposition, setActiveComposition] = useState<Composition | null>(() => {
    const storeKey = currentUser ? `mb_compositions_${currentUser.id}` : "mb_compositions_guest";
    const saved = localStorage.getItem(storeKey);
    if (saved) {
      try {
        const list = JSON.parse(saved);
        if (list.length > 0) return list[0];
      } catch (e) {}
    }
    return null;
  });

  const [isReciting, setIsReciting] = useState(false);
  const [reciteType, setReciteType] = useState<"lyrics" | "comment" | null>(null);
  const [copiedTags, setCopiedTags] = useState(false);
  const [copiedLyrics, setCopiedLyrics] = useState(false);
  const [selectedSubCard, setSelectedSubCard] = useState<"lyrics" | "suno" | "comment">("comment");

  // Customized Meditation prompt builder states
  const [meditationMessages, setMeditationMessages] = useState<any[]>([]);
  const [meditationInput, setMeditationInput] = useState("");
  const [isMeditationChatLoading, setIsMeditationChatLoading] = useState(false);
  const [hasCheckedEmotionalState, setHasCheckedEmotionalState] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState<string | null>(null);
  const [activeMeditationProposal, setActiveMeditationProposal] = useState<{
    title: string;
    soundHealingConcept: string;
    narrativeSnippet: string;
    sunoPrompt: string;
  } | null>(null);
  const [isProposalAccepted, setIsProposalAccepted] = useState(false);
  const [copiedSunoPrompt, setCopiedSunoPrompt] = useState(false);
  const [copiedSavedLyrics, setCopiedSavedLyrics] = useState(false);
  const [isSnippetReciting, setIsSnippetReciting] = useState(false);
  const [saveSuccessNotification, setSaveSuccessNotification] = useState<{
    show: boolean;
    title: string;
    date: string;
  } | null>(null);

  // Audio recording simulation states
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingIntervalRef = React.useRef<any>(null);

  const poeticTranscriptions = [
    "Sinto um cansaço mental profundo hoje devido ao peso do trabalho. Minha mente não desliga e busco um porto seguro para suavizar meus pensamentos e respirar em paz.",
    "Sinto um tanto de melancolia e solidão no peito nesta noite... Gostaria de uma frequência doce de sound healing para confortar o coração e encontrar abrigo amoroso.",
    "Minha respiração está muito acelerada e sinto ansiedade física, como um tremor sutil. Desejo me sintonizar para ancorar meus pés na terra e acalmar o sistema nervoso.",
    "Não estou conseguindo adormecer. Os pensamentos aceleram no escuro e trazem insônia. Preciso desatar esses nós e adormecer de modo terno e seguro.",
    "Sinto carência e uma fadiga incompreensível na alma... Gostaria de me conectar com uma frequência de 528Hz ou 852Hz para transmutar o cansaço em renovação."
  ];

  const startRecordingAudio = () => {
    setIsRecordingAudio(true);
    setRecordingSeconds(0);
    recordingIntervalRef.current = setInterval(() => {
      setRecordingSeconds(prev => prev + 1);
    }, 1000);
  };

  const cancelRecordingAudio = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    setIsRecordingAudio(false);
    setRecordingSeconds(0);
  };

  // Saved meditations list
  const [meditations, setMeditations] = useState<SavedMeditation[]>(() => {
    const storeKey = currentUser ? `mb_meditations_${currentUser.id}` : "mb_meditations_guest";
    const saved = localStorage.getItem(storeKey);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });

  const [activeSavedMeditation, setActiveSavedMeditation] = useState<SavedMeditation | null>(null);

  // Load the user's profile to read emotional/musical sintonization
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const profileKey = currentUser ? `mb_user_profile_${currentUser.id}` : "mb_user_profile_guest";
    const saved = localStorage.getItem(profileKey);
    if (saved) {
      try {
        setUserProfile(JSON.parse(saved));
      } catch (e) {
        setUserProfile(null);
      }
    } else {
      setUserProfile(null);
    }
  }, [currentUser, activeSubTab]);

  // Analyze recent main conversations to initialize meditation chat under "sentir/meditação"
  useEffect(() => {
    if (activeSubTab !== "meditacao" || hasCheckedEmotionalState) return;

    const fetchEmotionalSintonization = async () => {
      setIsMeditationChatLoading(true);
      try {
        const storeKey = currentUser 
          ? `barao_chat_messages_${currentUser.id}` 
          : "barao_chat_messages_guest";
        
        const rawSaved = localStorage.getItem(storeKey);
        let recentMessages = [];
        if (rawSaved) {
          try {
            recentMessages = JSON.parse(rawSaved);
          } catch (e) {
            recentMessages = [];
          }
        }

        const response = await fetch("/api/meditation/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recentMessages,
            nickname: userProfile?.nickname || currentUser?.name || "doce alma"
          })
        });

        if (!response.ok) throw new Error("API failed");
        const data = await response.json();

        setDetectedEmotion(data.emotionDetected);
        setMeditationMessages([
          {
            id: "welcome-system",
            role: "model",
            text: data.text,
            timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
          }
        ]);
        setHasCheckedEmotionalState(true);
      } catch (err) {
        console.error("Failed to initiate meditation chat:", err);
        setMeditationMessages([
          {
            id: "welcome-system-fallback",
            role: "model",
            text: "Olá... Senti um sopro suave de ruído silenciando nossos canais hoje, doce alma. Mesmo assim, meu coração sutil continua aqui inteiro para te ouvir. Como está a sua mente e a sua respiração neste instante? O que mais você sente que precisa de abrigo no silêncio de seu peito hoje?",
            timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
          }
        ]);
      } finally {
        setIsMeditationChatLoading(false);
      }
    };

    fetchEmotionalSintonization();
  }, [activeSubTab, currentUser, userProfile, hasCheckedEmotionalState]);

  // Send a custom message in the meditation builder chat
  const handleSendMeditationMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!meditationInput.trim() || isMeditationChatLoading) return;

    const userMsg = {
      id: Math.random().toString(36).substring(2, 10),
      role: "user" as const,
      text: meditationInput,
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    };

    const updatedMessages = [...meditationMessages, userMsg];
    setMeditationMessages(updatedMessages);
    const textToSend = meditationInput;
    setMeditationInput("");
    setIsMeditationChatLoading(true);

    try {
      const response = await fetch("/api/meditation/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          chatHistory: updatedMessages.map(m => 
            m.id.startsWith("welcome") 
              ? { role: "model", text: m.text } 
              : { role: m.role, text: m.text }
          ),
          nickname: userProfile?.nickname || currentUser?.name || "doce alma",
          userProfile
        })
      });

      if (!response.ok) throw new Error("API failed");
      const data = await response.json();

      const modelMsg = {
        id: Math.random().toString(36).substring(2, 10),
        role: "model" as const,
        text: data.text,
        proposal: data.proposal || null,
        isAccepted: false,
        isRejected: false,
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      };

      setMeditationMessages(prev => [...prev, modelMsg]);
    } catch (err) {
      console.error("Meditation conversation error:", err);
      setMeditationMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 10),
          role: "model" as const,
          text: "Senti minhas correntes de pensamento se dissipando devagar... Fale comigo novamente, doce alma, estarei atento à sua melodia.",
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setIsMeditationChatLoading(false);
    }
  };

  // Recite the snippet generated for this meditation
  const handleReciteSnippet = () => {
    if (!activeMeditationProposal) return;
    if (isSnippetReciting) {
      handleStopReciteSnippet();
      return;
    }

    setIsSnippetReciting(true);
    synther.startPiano(0.35); // start romantic, peaceful piano loop
    synther.speakText(
      `Prece meditativa, ${activeMeditationProposal.title}. \n\n ${activeMeditationProposal.narrativeSnippet}`,
      () => {},
      () => {
        setIsSnippetReciting(false);
        synther.stopPiano();
      }
    );
  };

  const handleStopReciteSnippet = () => {
    synther.stopSpeaking();
    synther.stopPiano();
    setIsSnippetReciting(false);
  };

  const handleReciteMeditation = (title: string, narrativeSnippet: string) => {
    if (isSnippetReciting) {
      handleStopReciteSnippet();
      return;
    }

    setIsSnippetReciting(true);
    synther.startPiano(0.35); // start romantic, peaceful piano loop
    synther.speakText(
      `Prece meditativa, ${title}. \n\n ${narrativeSnippet}`,
      () => {},
      () => {
        setIsSnippetReciting(false);
        synther.stopPiano();
      }
    );
  };

  const handleAcceptProposalInChat = (msgId: string, proposal: any) => {
    setMeditationMessages(prev => 
      prev.map(m => m.id === msgId ? { ...m, isAccepted: true } : m)
    );

    const summaryText = detectedEmotion 
      ? `Sintonização de ${detectedEmotion}`
      : "Sintonia de cura meditativa e sound healing personalizado.";
    
    const now = new Date();
    const formattedDate = now.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const newMeditation: SavedMeditation = {
      id: Math.random().toString(36).substring(2, 10),
      title: proposal.title,
      soundHealingConcept: proposal.soundHealingConcept,
      narrativeSnippet: proposal.narrativeSnippet,
      sunoPrompt: proposal.sunoPrompt,
      chatSummary: summaryText,
      createdAt: formattedDate
    };

    const updated = [newMeditation, ...meditations];
    setMeditations(updated);
    setActiveSavedMeditation(null);

    const storeKey = currentUser ? `mb_meditations_${currentUser.id}` : "mb_meditations_guest";
    localStorage.setItem(storeKey, JSON.stringify(updated));

    // Show a beautiful glowing notification toast
    setSaveSuccessNotification({
      show: true,
      title: proposal.title,
      date: formattedDate
    });

    // Automatically hide notification after 5 seconds
    setTimeout(() => {
      setSaveSuccessNotification(null);
    }, 5000);
  };

  const handleRejectProposalInChat = (msgId: string) => {
    setMeditationMessages(prev => 
      prev.map(m => m.id === msgId ? { ...m, isRejected: true } : m)
    );
    
    // Add context to chat that they wanted adjustments
    setMeditationMessages(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 10),
        role: "model" as const,
        text: "Entendo perfeitamente, doce alma. O compasso da prece que teci não ressoou perfeitamente em seu peito. Mantenha os olhos abertos e me diga: o que você sentiu que destoou na proposta? Foi o conceito de Sound Healing, o tom da narrativa ou a intensidade? Vamos remodelar esse abrigo juntos.",
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      }
    ]);
  };

  const handleAcceptProposal = () => {
    setIsProposalAccepted(true);
    if (activeMeditationProposal) {
      const summaryText = detectedEmotion 
        ? `Sintonização de ${detectedEmotion}`
        : "Sintonia de cura meditativa e sound healing personalizado.";
      
      const now = new Date();
      const formattedDate = now.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      const newMeditation: SavedMeditation = {
        id: Math.random().toString(36).substring(2, 10),
        title: activeMeditationProposal.title,
        soundHealingConcept: activeMeditationProposal.soundHealingConcept,
        narrativeSnippet: activeMeditationProposal.narrativeSnippet,
        sunoPrompt: activeMeditationProposal.sunoPrompt,
        chatSummary: summaryText,
        createdAt: formattedDate
      };

      const updated = [newMeditation, ...meditations];
      setMeditations(updated);
      setActiveSavedMeditation(null);

      const storeKey = currentUser ? `mb_meditations_${currentUser.id}` : "mb_meditations_guest";
      localStorage.setItem(storeKey, JSON.stringify(updated));

      // Show beautiful notification
      setSaveSuccessNotification({
        show: true,
        title: activeMeditationProposal.title,
        date: formattedDate
      });
      setTimeout(() => {
        setSaveSuccessNotification(null);
      }, 5000);

      setActiveMeditationProposal(null);
      setIsProposalAccepted(false);
    }
  };

  const handleDeleteMeditation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = meditations.filter(m => m.id !== id);
    setMeditations(updated);
    
    if (activeSavedMeditation?.id === id) {
      setActiveSavedMeditation(updated.length > 0 ? updated[0] : null);
    }

    const storeKey = currentUser ? `mb_meditations_${currentUser.id}` : "mb_meditations_guest";
    localStorage.setItem(storeKey, JSON.stringify(updated));

    if (isSnippetReciting) {
      handleStopReciteSnippet();
    }
  };

  const handleRejectProposal = () => {
    setActiveMeditationProposal(null);
    setIsProposalAccepted(false);
    handleStopReciteSnippet();
    
    // Add context to chat that they wanted adjustments
    setMeditationMessages(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 10),
        role: "model" as const,
        text: "Entendo perfeitamente, doce alma. O compasso da prece que teci não ressoou perfeitamente em seu peito. Mantenha os olhos abertos e me diga: o que você sentiu que destoou na proposta? Foi o conceito de Sound Healing, o tom da narrativa ou a intensidade? Vamos remodelar esse abrigo juntos.",
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      }
    ]);
  };

  const handleResetMeditationChat = () => {
    setActiveMeditationProposal(null);
    setIsProposalAccepted(false);
    setHasCheckedEmotionalState(false);
    setMeditationMessages([]);
    handleStopReciteSnippet();
  };

  // Sync meditations state with user login change
  useEffect(() => {
    const storeKey = currentUser ? `mb_meditations_${currentUser.id}` : "mb_meditations_guest";
    const saved = localStorage.getItem(storeKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMeditations(parsed);
        setActiveSavedMeditation(null);
      } catch (e) {
        setMeditations([]);
        setActiveSavedMeditation(null);
      }
    } else {
      setMeditations([]);
      setActiveSavedMeditation(null);
    }
  }, [currentUser]);

  // Sync composer state with user login change
  useEffect(() => {
    const storeKey = currentUser ? `mb_compositions_${currentUser.id}` : "mb_compositions_guest";
    const saved = localStorage.getItem(storeKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCompositions(parsed);
        setActiveComposition(parsed.length > 0 ? parsed[0] : null);
      } catch (e) {
        setCompositions([]);
        setActiveComposition(null);
      }
    } else {
      setCompositions([]);
      setActiveComposition(null);
    }
  }, [currentUser]);

  // Clean-up synthesis on tab switch or unmount
  useEffect(() => {
    return () => {
      synther.stopSpeaking();
      synther.stopPiano();
      setIsSnippetReciting(false);
    };
  }, [activeSubTab]);

  // Respiratory loop
  useEffect(() => {
    const intervals: Record<string, number> = {
      inspire: 4,
      segure: 4,
      expire: 4,
      relax: 2
    };

    const nextPhases: Record<string, "inspire" | "segure" | "expire" | "relax"> = {
      inspire: "segure",
      segure: "expire",
      expire: "relax",
      relax: "inspire"
    };

    const intervalId = setInterval(() => {
      setBreathTimer((prev) => {
        if (prev <= 1) {
          const next = nextPhases[breathPhase];
          setBreathPhase(next);
          return intervals[next];
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [breathPhase]);

  // Handle therapy play
  const startSession = (sessionId: string) => {
    const session = audioSessions.find(s => s.id === sessionId);
    if (!session) return;

    if (isPlaying && selectedSessionId === sessionId) {
      synther.stopSpeaking();
      setIsPlaying(false);
      setActiveWordIndex(-1);
    } else {
      synther.stopSpeaking();
      setSelectedSessionId(sessionId);
      setIsPlaying(true);
      setActiveWordIndex(0);

      // Speak narrative
      synther.speakText(
        session.narrativeText,
        (charIndex) => {
          setActiveCharIndex(charIndex);
          const wordsBefore = session.narrativeText.slice(0, charIndex).split(/\s+/).length;
          setActiveWordIndex(wordsBefore);
        },
        () => {
          setIsPlaying(false);
          setActiveWordIndex(-1);
        }
      );
    }
  };

  // Dynamic genre suggestions computed from userProfile's musical taste
  const genres = React.useMemo(() => {
    const list: { name: string; desc: string }[] = [];

    if (userProfile && userProfile.musicStyles && userProfile.musicStyles.length > 0) {
      // Loop through styles and atmospheres from profile to build customized suggestions
      const styles = userProfile.musicStyles;
      const atmosphere = (userProfile.musicAtmosphere && userProfile.musicAtmosphere.length > 0)
        ? userProfile.musicAtmosphere[0]
        : "madrugada chuvosa";

      styles.forEach((style: string) => {
        let styleName = style.charAt(0).toUpperCase() + style.slice(1);
        let styleDesc = `Gênero sintonizado de sua essência sob a atmosfera de ${atmosphere}.`;

        const styleLower = style.toLowerCase();
        if (styleLower === "jazz") {
          styleName = "Jazz Intimista";
          styleDesc = `Acordes suaves de piano e sax melancólico para a sua atmosfera de ${atmosphere}.`;
        } else if (styleLower === "mpb") {
          styleName = "MPB Acústica Coleção";
          styleDesc = `Dedilhado clássico de violão de nylon e voz terna sob a atmosfera de ${atmosphere}.`;
        } else if (styleLower === "lo-fi") {
          styleName = "Lo-Fi Devocional";
          styleDesc = `Sintonia terna de batidas lentas para acalentar o peito sob a atmosfera de ${atmosphere}.`;
        } else if (styleLower === "ambient") {
          styleName = "Ambiente de Conforto";
          styleDesc = `Pajens sintéticos lentos e sussurros na sutil atmosfera de ${atmosphere}.`;
        } else if (styleLower === "clássica") {
          styleName = "Clássico Transcendental";
          styleDesc = `Melodia de piano profundo e cordas acolhedoras sob a atmosfera de ${atmosphere}.`;
        } else if (styleLower === "synthwave") {
          styleName = "Retro Synthwave Suave";
          styleDesc = `Ondas eletrônicas nostálgicas e aconchego em sua atmosfera de ${atmosphere}.`;
        } else if (styleLower === "bossa nova") {
          styleName = "Bossa Nova Melancólica";
          styleDesc = `Batida sincopada clássica de nylon e aconchego em sua atmosfera de ${atmosphere}.`;
        } else if (styleLower === "indie") {
          styleName = "Folk-Indie Acústico";
          styleDesc = `Violão sussurrado e violoncelo em sua acolhedora atmosfera de ${atmosphere}.`;
        } else if (styleLower === "piano emocional") {
          styleName = "Sinfonia de Piano Íntimo";
          styleDesc = `Teclas de cauda tocadas com doçura e peso sob a atmosfera de ${atmosphere}.`;
        } else if (styleLower === "cinematic") {
          styleName = "Cinema Contemplativo";
          styleDesc = `Orquestração sutil que ressoa com sua terna atmosfera de ${atmosphere}.`;
        } else if (styleLower === "blues") {
          styleName = "Melodie de Blues Quente";
          styleDesc = `Guitarra rústica e melancolia profunda na atmosfera de ${atmosphere}.`;
        } else if (styleLower === "soul" || styleLower === "r&b") {
          styleName = "Compasso Soul e Tonal";
          styleDesc = `Voz aveludada e batida doce na atmosfera de ${atmosphere}.`;
        }

        list.push({ name: styleName, desc: styleDesc });
      });
    }

    // Append beautiful defaults to make sure we always have enough options
    const defaultGenres = [
      { name: "Bossa Nova Melancólica", desc: "Sussurros lentos, violão de nylon e compassos sincopados de jazz na penumbra." },
      { name: "MPB Acústica e Terna", desc: "Atmosférica e simples, impulsionada por piano acústico caloroso e leve dedilhado." },
      { name: "Jazz de Mudrugada Chuvosa", desc: "Nocturno, com contrabaixo sussurrado, piano profundo e saxofone melancólico sutil." },
      { name: "Folk Acústico Suave", desc: "Violão dedilhado, dedilhado intimista e violoncelo aconchegante de nostalgia rústica." },
      { name: "Sinfonia Orchestral", desc: "Cordas profundas e piano de cauda imersivo que cresce como um abraço solene." },
      { name: "Sintetizador Étereo", desc: "Ambientações cósmicas de ficção terna, acordes pulsantes e batidas sonhadoras." }
    ];

    defaultGenres.forEach(dg => {
      if (!list.some(existing => existing.name.toLowerCase() === dg.name.toLowerCase())) {
        list.push(dg);
      }
    });

    return list.slice(0, 6); // Top 6 suggestions
  }, [userProfile]);

  // Sync selectedGenre with current dynamic genres
  useEffect(() => {
    if (genres.length > 0 && !genres.some(g => g.name === selectedGenre)) {
      setSelectedGenre(genres[0].name);
    }
  }, [genres, selectedGenre]);

  // Composing cycle step texts
  const stepTexts = [
    "Sintonizando as memórias e desabafos de seu peito...",
    "Escrevendo versos íntimos em português sobre você...",
    "Afinando as cordas melancólicas do violão de O Barão...",
    "Espelhando as frequências do compasso em prece...",
    "Ajustando as integrações estéticas e rascunhando o Suno AI..."
  ];

  // Run a loop for typing/advancing steps of fabrication
  useEffect(() => {
    let interval: any = null;
    if (isComposing) {
      setComposingStep(0);
      interval = setInterval(() => {
        setComposingStep((prev) => (prev < 4 ? prev + 1 : prev));
      }, 3500);
    } else {
      setComposingStep(0);
    }
    return () => clearInterval(interval);
  }, [isComposing]);

  const handleCompose = async (mode: "direct" | "inspiration") => {
    if (isComposing) return;
    setIsComposing(true);

    try {
      // Load user details
      const profileKey = currentUser ? `mb_user_profile_${currentUser.id}` : "mb_user_profile_guest";
      const userProfile = localStorage.getItem(profileKey) 
        ? JSON.parse(localStorage.getItem(profileKey)!) 
        : null;

      const response = await fetch("/api/song/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: mode === "inspiration" ? "" : theme,
          genre: selectedGenre,
          nickname: userProfile?.nickname || userProfile?.name || currentUser?.name || "doce alma",
          mode: mode,
          userProfile: userProfile
        })
      });

      if (!response.ok) throw new Error("API call failed");

      const data = await response.json();

      const newComp: Composition = {
        id: Math.random().toString(36).substring(2, 10),
        title: data.title || "Prece Sem Nome",
        styleTags: data.styleTags || "slow acoustic, melancholic",
        lyrics: data.lyrics || "[Verse]\nEstrofes tocantes...",
        tempo: data.tempo || "65 BPM",
        instrumentation: data.instrumentation || ["Violão de nylon"],
        baronComment: data.baronComment || "Um sopro lírico em teu peito.",
        createdAt: new Date().toLocaleDateString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        genre: selectedGenre
      };

      const updated = [newComp, ...compositions];
      setCompositions(updated);
      setActiveComposition(newComp);
      setSelectedSubCard("comment");

      const storeKey = currentUser ? `mb_compositions_${currentUser.id}` : "mb_compositions_guest";
      localStorage.setItem(storeKey, JSON.stringify(updated));
      setTheme("");
    } catch (err) {
      console.error("Composer failed:", err);
    } finally {
      setIsComposing(false);
    }
  };

  const handleDeleteComposition = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = compositions.filter(c => c.id !== id);
    setCompositions(updated);
    
    if (activeComposition?.id === id) {
      setActiveComposition(updated.length > 0 ? updated[0] : null);
    }

    const storeKey = currentUser ? `mb_compositions_${currentUser.id}` : "mb_compositions_guest";
    localStorage.setItem(storeKey, JSON.stringify(updated));

    if (isReciting) {
      handleStopRecital();
    }
  };

  const handleStartRecital = (type: "lyrics" | "comment") => {
    if (!activeComposition) return;

    if (isReciting) {
      handleStopRecital();
    }

    setIsReciting(true);
    setReciteType(type);
    synther.startPiano(0.35); // procedural cozy piano in the background

    const textToSpeak = type === "lyrics"
      ? `Canção ${activeComposition.title}. \n\n ${activeComposition.lyrics.replace(/\[.*?\]/g, "")}`
      : activeComposition.baronComment;

    synther.speakText(
      textToSpeak,
      () => {},
      () => {
        setIsReciting(false);
        setReciteType(null);
        synther.stopPiano();
      }
    );
  };

  const handleStopRecital = () => {
    synther.stopSpeaking();
    synther.stopPiano();
    setIsReciting(false);
    setReciteType(null);
  };

  const copyToClipboard = (text: string, type: "tags" | "lyrics") => {
    navigator.clipboard.writeText(text);
    if (type === "tags") {
      setCopiedTags(true);
      setTimeout(() => setCopiedTags(false), 2000);
    } else {
      setCopiedLyrics(true);
      setTimeout(() => setCopiedLyrics(false), 2000);
    }
  };

  const getBreathLabel = () => {
    switch (breathPhase) {
      case "inspire": return "Inspire o ar... sinta seu peito expandir";
      case "segure": return "Segure... sintonize o silêncio interno";
      case "expire": return "Expire soltando todo o estresse";
      case "relax": return "Descanse... prepare o ciclo";
    }
  };

  const getBreathColor = () => {
    switch (breathPhase) {
      case "inspire": return "from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-300";
      case "segure": return "from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-300";
      case "expire": return "from-barao-rose/20 to-red-500/10 border-barao-rose/40 text-barao-gold";
      case "relax": return "from-zinc-800/10 to-zinc-900/10 border-zinc-700/30 text-zinc-400";
    }
  };

  const getBreathScale = () => {
    switch (breathPhase) {
      case "inspire": return "scale-130 duration-[4000ms] opacity-80";
      case "segure": return "scale-130 duration-1000 opacity-100 filter drop-shadow-[0_0_20px_rgba(232,182,147,0.4)]";
      case "expire": return "scale-100 duration-[4000ms] opacity-60";
      case "relax": return "scale-100 duration-1000 opacity-40";
    }
  };

  return (
    <div className="mx-auto max-w-5xl font-sans text-left space-y-8">
      {/* Visual Subtabs Navigator */}
      {!hideSubTabHeader && (
        <div className="border-b border-white/5 flex gap-4 md:gap-8 pb-1 font-mono text-xs uppercase tracking-widest animate-fade-in">
          <button
            onClick={() => setActiveSubTab("meditacao")}
            className={`flex items-center gap-2 px-1 py-3 border-b-2 transition-all duration-300 ${
              activeSubTab === "meditacao"
                ? "border-barao-rose text-white font-bold"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Wind className="h-4 w-4" />
            Meditação e Indução
          </button>
          <button
            onClick={() => setActiveSubTab("composicao")}
            className={`flex items-center gap-2 px-1 py-3 border-b-2 transition-all duration-300 ${
              activeSubTab === "composicao"
                ? "border-barao-rose text-white font-bold"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Music className="h-4 w-4 text-barao-rose" />
            Ateliê de Composição do Barão
            <span className="rounded-full bg-barao-rose/10 text-barao-gold text-[8px] px-1.5 py-0.5 border border-barao-rose/20 uppercase">
              Novo
            </span>
          </button>
        </div>
      )}

      {activeSubTab === "meditacao" ? (
        <div className="space-y-12 animate-fade-in">
          
          {/* Beautiful floating toast notification for saved meditation */}
          {saveSuccessNotification && (
            <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-sm border border-emerald-500/30 bg-zinc-950 p-4 shadow-xl shadow-emerald-950/20 animate-fade-in select-text">
              <div className="flex items-start gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Check className="h-3 w-3 text-emerald-400" />
                </div>
                <div className="space-y-1 text-left">
                  <h5 className="font-serif text-xs font-semibold text-white">Meditação Guardada no Diário!</h5>
                  <p className="font-serif text-[11px] text-zinc-400 italic leading-relaxed">
                    &ldquo;{saveSuccessNotification.title}&rdquo; foi adicionada ao seu Diário com sucesso em {saveSuccessNotification.date}.
                  </p>
                  <p className="font-mono text-[8px] text-zinc-500 uppercase tracking-wider pt-1">
                    O chat está livre para novas sintonizações.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {activeSavedMeditation && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto animate-fade-in select-text">
              {/* Clicking backdrop closes modal */}
              <div 
                className="absolute inset-0 cursor-default" 
                onClick={() => {
                  setActiveSavedMeditation(null);
                  if (isSnippetReciting) handleStopReciteSnippet();
                }} 
              />
              
              <div className="relative overflow-hidden rounded-sm border border-barao-rose/30 bg-zinc-950 p-6 md:p-8 shadow-2xl scale-[0.98] w-full max-w-2xl max-h-[90vh] overflow-y-auto immersive-corners bg-[radial-gradient(circle_at_top_right,rgba(232,182,147,0.04)_0%,transparent_50%)] animate-scale-in z-10 select-none">
                {/* Close button */}
                <button 
                  type="button"
                  onClick={() => {
                    setActiveSavedMeditation(null);
                    if (isSnippetReciting) handleStopReciteSnippet();
                  }}
                  className="absolute top-4 right-4 p-1.5 rounded-sm text-zinc-400 hover:text-white transition duration-200 cursor-pointer z-50"
                  title="Fechar Página"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Vintage glowing aura */}
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-barao-gold/30 to-transparent" />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-5 gap-4">
                  <div className="space-y-1.5 text-left pr-8">
                    <span className="flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.25em] text-[#CB8684]">
                      <BookOpen className="h-4 w-4" />
                      Página de Seu Diário de Meditação
                    </span>
                    <h3 className="font-serif text-xl md:text-2xl font-medium tracking-tight text-white italic">
                      &ldquo;{activeSavedMeditation.title}&rdquo;
                    </h3>
                  </div>
                  <div className="flex flex-col items-start sm:items-end font-mono text-[9px] text-zinc-300 gap-1 mt-1 shrink-0">
                    <span className="bg-zinc-950 px-2.5 py-0.5 rounded-sm uppercase tracking-wider text-zinc-350">{activeSavedMeditation.createdAt}</span>
                    <span className="text-[8px] text-[#E8B693] tracking-widest uppercase">REGISTRO SINTONIZADO</span>
                  </div>
                </div>

                <div className="mt-6 space-y-6 text-left relative z-10 select-none">
                  {/* Summary of sintonization */}
                  <div className="p-4 bg-black/45 border border-white/5 rounded-sm relative group overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 text-barao-rose/5 select-none font-serif text-6xl italic pointer-events-none font-bold">
                      &ldquo;
                    </div>
                    <span className="block font-mono text-[8.5px] uppercase tracking-wider text-[#E8B693] mb-1">
                      Resumo da Conversa & Sintonização
                    </span>
                    <p className="font-serif text-xs md:text-sm text-zinc-350 italic leading-relaxed whitespace-pre-wrap select-text pr-6 relative z-10">
                      {activeSavedMeditation.chatSummary}
                    </p>
                  </div>

                  {/* Sound healing description */}
                  <div>
                    <span className="block font-mono text-[8.5px] uppercase tracking-wider text-zinc-500 mb-1.5">
                      Conceito de Sound Healing & Ressonância
                    </span>
                    <p className="text-[11px] md:text-xs text-zinc-400 font-serif leading-relaxed bg-[#0B0B0B] p-4 border border-white/10 rounded-sm italic select-text">
                      {activeSavedMeditation.soundHealingConcept}
                    </p>
                  </div>

                  {/* Induction Lyre / Text */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="block font-mono text-[8.5px] uppercase tracking-wider text-zinc-500">
                        Letra Lírica e Prece de Indução
                      </span>
                      <div className="flex items-center gap-3.5">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(activeSavedMeditation.narrativeSnippet);
                            setCopiedSavedLyrics(true);
                            setTimeout(() => setCopiedSavedLyrics(false), 2000);
                          }}
                          className="text-[9.5px] uppercase font-mono text-[#CB8684] flex items-center gap-1 hover:text-white transition cursor-pointer"
                        >
                          {copiedSavedLyrics ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 text-[#CB8684]" />
                              Copiar Letra
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleReciteMeditation(activeSavedMeditation.title, activeSavedMeditation.narrativeSnippet)}
                          className="text-[9.5px] uppercase font-mono text-[#CB8684] flex items-center gap-1 hover:text-white transition cursor-pointer"
                        >
                          {isSnippetReciting ? (
                            <>
                              <Square className="h-2.5 w-2.5 fill-current text-[#CB8684] animate-pulse" />
                              Silenciar Recital
                            </>
                          ) : (
                            <>
                              <Headphones className="h-3 w-3 mr-0.5 text-[#CB8684]" />
                              Ouvir Meditação
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {/* Retro notebook layout */}
                    <div className="relative group rounded-sm border border-white/5 bg-black/60 p-6 md:p-8 overflow-hidden">
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:100%_20px] pointer-events-none select-none opacity-40" />
                      <div className="relative z-10 max-h-[180px] overflow-y-auto pr-2 text-zinc-200 select-text font-serif text-xs md:text-sm leading-relaxed whitespace-pre-wrap space-y-4 max-w-2xl mx-auto italic text-center text-zinc-350/90 tracking-wide font-medium">
                        {activeSavedMeditation.narrativeSnippet}
                      </div>
                    </div>
                  </div>

                  {/* Suno Prompt Box */}
                  <div className="pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between pb-2">
                      <span className="flex items-center gap-1.5 bg-zinc-900/80 text-[#E8B693] font-mono text-[8.5px] uppercase tracking-wider px-2.5 py-1 border border-white/5 rounded-sm">
                        <Sparkles className="h-3 w-3 text-[#E8B693]" /> Prompt Sintonizado do Suno AI
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(activeSavedMeditation.sunoPrompt);
                          setCopiedSunoPrompt(true);
                          setTimeout(() => setCopiedSunoPrompt(false), 2000);
                        }}
                        className="text-[9.5px] uppercase font-mono text-[#CB8684] hover:text-white flex items-center gap-1 transition"
                      >
                        {copiedSunoPrompt ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            Copiado com Sucesso!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 text-[#CB8684]" />
                            Copiar Prompt do Estúdio
                          </>
                        )}
                      </button>
                    </div>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-[#E8B693]/5 border border-[#E8B693]/20 rounded-sm scale-[1.01] blur-xs pointer-events-none" />
                      <div className="relative text-[11px] font-mono select-text bg-black py-4 px-4 rounded-sm border border-[#E8B693]/20 text-[#E8B693] font-semibold leading-relaxed break-all">
                        {activeSavedMeditation.sunoPrompt}
                      </div>
                    </div>
                    <p className="text-[8.5px] text-[#CB8684] leading-normal italic text-left mt-2">
                      Cole essa frequência estilística acústica em inglês no campo &ldquo;Style&rdquo; ou &ldquo;Instrumental&rdquo; do seu Suno AI para reproduzir com exatidão a ambientação física detalhada no ritual.
                    </p>
                  </div>

                </div>
              </div>
            </div>
          )}
            <section id="custom-meditation-builder" className="rounded-none sm:rounded-sm border-0 sm:border border-barao-rose/25 bg-transparent sm:bg-[#0F0F0F] p-0 sm:p-6 lg:p-8 backdrop-blur-sm immersive-corners relative overflow-hidden">
              {/* Glowing ambient background effect */}
              <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,rgba(232,182,147,0.06)_0%,transparent_50%)] pointer-events-none" />

              <div className="relative z-10 mb-4 sm:mb-8 flex flex-col items-start gap-1 px-4 sm:px-0 pt-2 sm:pt-0">
                <span className="flex items-center gap-1.5 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.22em] text-barao-rose">
                  <Sparkles className="h-3.5 w-3.5 text-barao-rose animate-pulse" />
                  Inteligência Holística e Sound Healing
                </span>
                <h3 className="font-serif text-lg sm:text-xl font-medium tracking-tight text-white lg:text-3xl">
                  Santuário de Meditação sob Medida
                </h3>
                <p className="hidden sm:block max-w-2xl text-xs text-zinc-400 leading-relaxed">
                  Desenhe uma sinfonia meditativa perfeita para o seu momento. O Barão sintoniza as suas confissões recentes ou conversas para selecionar frequências de Sound Healing e tecer uma prece de indução única que você poderá carregar para seu Suno AI.
                </p>
              </div>

              {/* Chat Container takes full width, eliminating clutter */}
              <div className="relative z-10 max-w-3xl mx-auto w-full">
                <div className="flex flex-col h-[460px] sm:h-[520px] rounded-none sm:rounded-sm bg-[#090909] sm:bg-black/40 border-0 sm:border border-white/5 overflow-hidden">
                  
                  {/* Chat Header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-white">Diálogo de Cura</span>
                    </div>
                    {detectedEmotion && (
                      <span className="font-serif text-[10.5px] italic text-barao-gold font-semibold bg-barao-rose/5 border border-barao-rose/10 rounded-sm px-2 py-0.5">
                        Frequência Coética: {detectedEmotion}
                      </span>
                    )}
                    <button 
                      onClick={handleResetMeditationChat}
                      title="Reiniciar diálogo"
                      className="p-1 hover:text-white text-zinc-500 transition"
                    >
                      <RefreshCw className="h-3.5 w-3.5 animate-spin-hover" />
                    </button>
                  </div>

                  {/* Messages Panel */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-4 select-text">
                    {meditationMessages.map((msg, index) => (
                      <div 
                        key={msg.id || index}
                        className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} animate-fade-in`}
                      >
                        <div className={`max-w-[90%] md:max-w-[80%] rounded-sm p-4 text-xs leading-relaxed space-y-1 ${
                          msg.role === "user" 
                            ? "bg-barao-rose/15 border border-barao-rose/25 text-white animate-fade-in text-right" 
                            : "bg-zinc-900/60 border border-white/5 text-zinc-200 animate-fade-in text-left"
                        }`}>
                          <div className="whitespace-pre-wrap select-text">{msg.text}</div>
                          <span className="block text-[8px] text-zinc-500 font-mono mt-1">{msg.timestamp}</span>
                        </div>

                        {/* Inline custom proposal with Suno Prompts inside the message block directly */}
                        {msg.proposal && (
                          <div className="mt-2 w-full max-w-[90%] md:max-w-[80%] p-4 rounded-sm border border-barao-rose/20 bg-black/65 space-y-4 text-left select-none animate-fade-in">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                              <div className="flex items-center gap-1.5">
                                <Wind className="h-3.5 w-3.5 text-[#CB8684] animate-pulse" />
                                <span className="font-serif text-xs font-semibold text-white italic">Atmosfera: &ldquo;{msg.proposal.title}&rdquo;</span>
                              </div>
                              <span className="font-mono text-[8px] uppercase text-barao-gold tracking-widest bg-barao-gold/15 px-2 py-0.5 border border-barao-gold/20 rounded-sm">
                                Suno Blueprint
                              </span>
                            </div>

                            <div className="space-y-3.5 text-xs">
                              <div>
                                <span className="block font-mono text-[8.5px] uppercase tracking-wider text-zinc-500 mb-1">Ressonância de Cura:</span>
                                <p className="text-[10.5px] text-zinc-400 leading-relaxed font-serif italic bg-zinc-900/30 p-2.5 border border-white/5 rounded-sm">
                                  {msg.proposal.soundHealingConcept}
                                </p>
                              </div>

                              <div>
                                <span className="block font-mono text-[8.5px] uppercase tracking-wider text-zinc-500 mb-1 flex items-center justify-between">
                                  Letra de Indução:
                                  <button
                                    type="button"
                                    onClick={() => handleReciteMeditation(msg.proposal.title, msg.proposal.narrativeSnippet)}
                                    className="text-[9px] uppercase font-mono text-barao-rose flex items-center gap-1 hover:text-barao-gold transition"
                                  >
                                    {isSnippetReciting ? (
                                      <>
                                        <Square className="h-2 w-2 fill-current text-barao-rose animate-pulse" />
                                        Silenciar
                                      </>
                                    ) : (
                                      <>
                                        <Headphones className="h-2.5 w-2.5" />
                                        Ouvir Sussurro
                                      </>
                                    )}
                                  </button>
                                </span>
                                <div className="bg-black/50 p-2.5 border border-white/5 text-[10.5px] text-zinc-300 leading-relaxed max-h-[140px] overflow-y-auto select-text whitespace-pre-wrap font-serif">
                                  {msg.proposal.narrativeSnippet}
                                </div>
                              </div>
                            </div>

                            {/* Actions inside message bubble */}
                            <div className="pt-3 border-t border-white/5">
                              {!msg.isAccepted && !msg.isRejected ? (
                                <div className="space-y-3 text-center">
                                  <p className="text-[9px] text-zinc-500 italic">
                                    Por favor, leia a indução. Se você aceita o conteúdo desta meditação, confirme para salvar no Diário e revelar o prompt.
                                  </p>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleRejectProposalInChat(msg.id)}
                                      className="flex-1 py-2 rounded-sm text-[9px] font-bold uppercase tracking-wider border border-white/10 hover:border-red-900/40 hover:text-red-350 transition"
                                    >
                                      Ajustar com o Barão
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAcceptProposalInChat(msg.id, msg.proposal)}
                                      className="flex-1 py-2 bg-barao-rose hover:bg-barao-gold text-black rounded-sm text-[9px] font-bold uppercase tracking-wider transition animate-pulse"
                                    >
                                      Aceitar e Salvar no Diário
                                    </button>
                                  </div>
                                </div>
                              ) : msg.isAccepted ? (
                                <div className="space-y-3.5 animate-fade-in text-left">
                                  <div className="flex items-center justify-between pb-1">
                                    <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 font-mono text-[8px] uppercase tracking-wider px-2 py-0.5 border border-emerald-500/20 rounded-sm">
                                      <Check className="h-2.5 w-2.5" /> Salva no Diário
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(msg.proposal.sunoPrompt);
                                        setCopiedSunoPrompt(true);
                                        setTimeout(() => setCopiedSunoPrompt(false), 2000);
                                      }}
                                      className="text-[9.5px] uppercase font-mono text-barao-gold hover:text-white flex items-center gap-1 transition"
                                    >
                                      {copiedSunoPrompt ? "Copiado!" : "Copiar Prompt Suno"}
                                    </button>
                                  </div>
                                  <div className="relative p-2.5 rounded-sm border border-[#E8B693]/30 bg-black/80 font-mono text-[9.5px] text-barao-gold select-text leading-relaxed break-words">
                                    {msg.proposal.sunoPrompt}
                                  </div>
                                  <div className="flex justify-end pt-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const existing = meditations.find(m => m.title === msg.proposal.title);
                                        if (existing) {
                                          setActiveSavedMeditation(existing);
                                        } else {
                                          const fallbackMed: SavedMeditation = {
                                            id: Math.random().toString(36).substring(2, 10),
                                            title: msg.proposal.title,
                                            soundHealingConcept: msg.proposal.soundHealingConcept,
                                            narrativeSnippet: msg.proposal.narrativeSnippet,
                                            sunoPrompt: msg.proposal.sunoPrompt,
                                            chatSummary: detectedEmotion ? `Sintonização de ${detectedEmotion}` : "Sintonia de cura",
                                            createdAt: new Date().toLocaleDateString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                                          };
                                          setActiveSavedMeditation(fallbackMed);
                                        }
                                      }}
                                      className="text-[9px] font-mono uppercase tracking-wider text-barao-rose hover:text-white flex items-center gap-1"
                                    >
                                      Ver página no Estilo Diário <ArrowRight className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-[9.5px] text-zinc-500 italic text-center font-serif">
                                  Ajustes solicitados ao mestre Barão.
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {isMeditationChatLoading && (
                      <div className="flex justify-start animate-pulse">
                        <div className="rounded-sm p-4 bg-zinc-900/40 border border-white/5 text-zinc-500 text-xs flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-barao-rose animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="h-2 w-2 rounded-full bg-barao-rose animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="h-2 w-2 rounded-full bg-barao-rose animate-bounce" style={{ animationDelay: '300ms' }}></span>
                          O Barão sintoniza as correntes do seu peito...
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pulsing Text Container Glow for custom heart-healing vibe based on chat emotions */}
                  <div className="relative p-[1px] bg-gradient-to-r from-barao-rose/10 to-barao-gold/10">
                    <div className={`absolute inset-0 bg-barao-gold/5 blur-md pointer-events-none rounded-sm ${
                      (() => {
                        if (!detectedEmotion) return "animate-pulse duration-[1.5s]";
                        const emo = detectedEmotion.toLowerCase();
                        if (emo.includes("ansiedade") || emo.includes("raiva") || emo.includes("euforia") || emo.includes("agitad") || emo.includes("estresse")) {
                          return "animate-pulse duration-[0.6s]";
                        } else if (emo.includes("paz") || emo.includes("calma") || emo.includes("medita") || emo.includes("leve")) {
                          return "animate-pulse duration-[2.2s]";
                        } else {
                          return "animate-pulse duration-[1.3s]";
                        }
                      })()
                    }`} />
                    
                    <form onSubmit={handleSendMeditationMessage} className="relative z-10 p-3 bg-black/90 border-t border-white/5 flex gap-2 items-center">
                      {isRecordingAudio ? (
                        <div className="flex-1 flex items-center justify-between px-3 h-9 bg-zinc-950 border border-barao-rose/30 rounded-sm text-xs text-zinc-300">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            <span className="font-mono text-[9px] uppercase text-zinc-400 font-semibold tracking-wider">Gravando...</span>
                            <span className="font-mono text-[10px] text-barao-rose font-bold bg-barao-rose/5 px-2 py-0.5 rounded-sm">
                              {(() => {
                                const mins = Math.floor(recordingSeconds / 60);
                                const secs = recordingSeconds % 60;
                                return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
                              })()}
                            </span>
                          </div>

                          <div className="flex items-end gap-[1.5px] h-3.5 pb-[2px] select-none">
                            {[1, 2, 3, 4, 3, 2, 1, 2, 3, 4, 2, 3, 1].map((v, i) => (
                              <div 
                                key={i} 
                                className="w-[1.2px] bg-barao-gold rounded-full animate-bounce" 
                                style={{ 
                                  height: `${v * 2.5}px`,
                                  animationDuration: `${0.5 + (i % 3) * 0.2}s`,
                                  animationDelay: `${i * 35}ms`
                                }} 
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={meditationInput}
                          onChange={(e) => setMeditationInput(e.target.value)}
                          disabled={isMeditationChatLoading}
                          placeholder="Converse ou diga o que sente para O Barão..."
                          className="flex-1 text-xs px-3 py-2 h-9 bg-black border border-white/10 rounded-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-barao-rose focus:border-barao-rose placeholder-zinc-700 disabled:opacity-50"
                        />
                      )}

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isRecordingAudio ? (
                          <>
                            <button
                              type="button"
                              onClick={cancelRecordingAudio}
                              className="px-2.5 py-2 h-9 bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-sm text-[9px] font-mono uppercase tracking-wider transition shrink-0"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (recordingIntervalRef.current) {
                                  clearInterval(recordingIntervalRef.current);
                                  recordingIntervalRef.current = null;
                                }
                                setIsRecordingAudio(false);

                                const randomIndex = Math.floor(Math.random() * poeticTranscriptions.length);
                                const textTranscribed = poeticTranscriptions[randomIndex];

                                const mins = Math.floor((recordingSeconds || 12) / 60);
                                const secs = (recordingSeconds || 12) % 60;
                                const duration = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
                                const userMsgText = `🎙️ [Áudio Gravado - ${duration}] ${textTranscribed}`;

                                const userMsg = {
                                  id: Math.random().toString(36).substring(2, 10),
                                  role: "user" as const,
                                  text: userMsgText,
                                  timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                                };

                                const updatedMessages = [...meditationMessages, userMsg];
                                setMeditationMessages(updatedMessages);
                                setIsMeditationChatLoading(true);

                                try {
                                  const response = await fetch("/api/meditation/chat", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      message: textTranscribed,
                                      chatHistory: updatedMessages.map(m => 
                                        m.id.startsWith("welcome") 
                                          ? { role: "model", text: m.text } 
                                          : { role: m.role, text: m.text }
                                      ),
                                      nickname: userProfile?.nickname || currentUser?.name || "doce alma",
                                      userProfile
                                    })
                                  });

                                  if (!response.ok) throw new Error("API failed");
                                  const data = await response.json();

                                  const modelMsg = {
                                    id: Math.random().toString(36).substring(2, 10),
                                    role: "model" as const,
                                    text: data.text,
                                    proposal: data.proposal || null,
                                    isAccepted: false,
                                    isRejected: false,
                                    timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                                  };

                                  setMeditationMessages(prev => [...prev, modelMsg]);
                                } catch (err) {
                                  console.error("Meditation message audio error:", err);
                                  setMeditationMessages(prev => [
                                    ...prev,
                                    {
                                      id: Math.random().toString(36).substring(2, 10),
                                      role: "model" as const,
                                      text: "Senti minhas correntes de pensamento se dissipando devagar... Fale comigo novamente, doce alma, estarei atento à sua melodia.",
                                      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                                    }
                                  ]);
                                } finally {
                                  setIsMeditationChatLoading(false);
                                  setRecordingSeconds(0);
                                }
                              }}
                              className="px-3 py-2 h-9 bg-[#CB8684] hover:bg-barao-rose text-black rounded-sm text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition shrink-0 animate-pulse"
                            >
                              <Mic className="h-3 w-3" /> Enviar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={startRecordingAudio}
                              disabled={isMeditationChatLoading}
                              title="Gravar confissão de voz"
                              className="p-2 h-9 border border-white/10 hover:border-barao-rose/50 text-zinc-400 hover:text-barao-rose rounded-sm transition disabled:opacity-40 shrink-0"
                            >
                              <Mic className="h-4.5 w-4.5" />
                            </button>
                            <button
                              type="submit"
                              disabled={isMeditationChatLoading || !meditationInput.trim()}
                              className="p-2.5 h-9 bg-barao-rose hover:bg-barao-gold text-black rounded-sm transition disabled:opacity-40 shrink-0"
                            >
                              <Send className="h-3.5 w-3.5 fill-current" />
                            </button>
                          </>
                        )}
                      </div>
                    </form>
                  </div>

                </div>
              </div>
            </section>

          {/* History Section - Bottom list of saved meditations */}
          {meditations.length > 0 && (
            <section className="space-y-4 pt-6 border-t border-white/5 animate-fade-in text-left">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-semibold">
                  <BookOpen className="h-4 w-4 text-barao-rose" />
                  Diário de Meditações Guiadas & Sound Healing
                </span>
                <span className="font-mono text-[9px] text-zinc-500 uppercase">
                  {meditations.length} meditações salvas
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {meditations.map((med) => {
                  const isActive = activeSavedMeditation?.id === med.id;
                  return (
                    <div
                      key={med.id}
                      onClick={() => {
                        setActiveSavedMeditation(med);
                        if (isSnippetReciting) handleStopReciteSnippet();
                      }}
                      className={`relative p-5 rounded-sm cursor-pointer border transition-all duration-300 flex flex-col justify-between group ${
                        isActive 
                          ? "bg-black border-barao-rose shadow-md shadow-barao-rose/5" 
                          : "bg-[#0F0F0F] border-white/5 hover:border-barao-rose/30"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[8px] uppercase tracking-wider text-barao-gold bg-barao-gold/5 px-2 py-0.5 rounded-sm">
                            {med.chatSummary}
                          </span>
                          <span className="font-mono text-[8.5px] text-zinc-500 block shrink-0">
                            {med.createdAt}
                          </span>
                        </div>

                        <h4 className="font-serif text-sm font-semibold text-white italic group-hover:text-barao-gold transition duration-200 line-clamp-1">
                          {med.title}
                        </h4>

                        <p className="text-[10px] text-zinc-400 leading-relaxed font-serif line-clamp-2">
                          {med.soundHealingConcept}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/5">
                        <span className="text-[9px] font-mono uppercase text-zinc-400 flex items-center gap-1">
                          Abrir Registro no Diário
                          <ArrowRight className="h-3 w-3 text-zinc-500 group-hover:translate-x-1 transition-transform" />
                        </span>

                        <button
                          onClick={(e) => handleDeleteMeditation(med.id, e)}
                          className="p-1 text-zinc-650 hover:text-red-400 transition"
                          title="Remover meditação"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Visual Respiratory Guide module - Top */}
          <section id="respiratory-guide" className="rounded-sm border border-barao-rose/25 bg-[#0F0F0F] p-6 lg:p-8 backdrop-blur-md immersive-corners">
            <div className="mb-6 flex flex-col items-start gap-1">
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-barao-rose">
                <Wind className="h-3.5 w-3.5" />
                Harmonia do Ritmo Cardíaco
              </span>
              <h3 className="font-serif text-xl font-medium tracking-tight text-white lg:text-2xl">
                Sintonia de Respiração Guiada
              </h3>
              <p className="max-w-2xl text-xs text-zinc-400 leading-relaxed">
                Sincronize sua inspiração com este regulador cardíaco. Inspirado nas técnicas de expansão corporal e controle emocional.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-12 items-center">
              {/* Rotating and expanding visual mandala */}
              <div className="flex justify-center md:col-span-5 py-6">
                <div className="relative flex h-52 w-52 items-center justify-center">
                  <div className={`absolute h-40 w-40 rounded-full border bg-gradient-to-tr transition-transform ease-linear ${getBreathScale()} ${getBreathColor()}`}></div>
                  <div className="absolute h-48 w-48 rounded-full border border-dashed border-barao-gold/10 animate-spin duration-20000"></div>
                  
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="font-serif text-3xl font-light text-white transition-all">
                      {breathTimer}s
                    </span>
                    <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                      {breathPhase}
                    </span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-7 space-y-4">
                <div className="rounded-sm bg-black/40 p-5 border border-barao-rose/10">
                  <h4 className="font-serif text-base font-semibold text-barao-gold mb-1">
                    {getBreathLabel()}
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Talvez você esteja buscando força na mente quando precisa apenas reestabelecer o compasso do pulmão. Sente-se confortavelmente, mantenha o foco na esfera e expire devagar.
                  </p>
                </div>

                <div className="flex items-center justify-around gap-2 text-center">
                  <div>
                    <span className="block font-serif text-base text-white">4s</span>
                    <span className="text-[10px] uppercase text-zinc-500 font-mono">Inspirar</span>
                  </div>
                  <div className="h-5 w-[1px] bg-zinc-850"></div>
                  <div>
                    <span className="block font-serif text-base text-white">4s</span>
                    <span className="text-[10px] uppercase text-zinc-500 font-mono">Reter</span>
                  </div>
                  <div className="h-5 w-[1px] bg-zinc-850"></div>
                  <div>
                    <span className="block font-serif text-base text-white">4s</span>
                    <span className="text-[10px] uppercase text-zinc-500 font-mono">Expirar</span>
                  </div>
                  <div className="h-5 w-[1px] bg-zinc-850"></div>
                  <div>
                    <span className="block font-serif text-base text-white">2s</span>
                    <span className="text-[10px] uppercase text-zinc-500 font-mono">Repouso</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Preset Clips - Meditação Guiada */}
          <section id="preset-audiotherapy">
            <div className="mb-6 flex flex-col items-start gap-1">
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-barao-rose">
                <Headphones className="h-3.5 w-3.5" />
                Voz e Memória Afetiva
              </span>
              <h3 className="font-serif text-xl font-medium tracking-tight text-white lg:text-2xl">
                Sessões de Meditação Guiada
              </h3>
              <p className="max-w-2xl text-xs text-zinc-400 leading-relaxed">
                Selecione uma indução profunda sussurrada. O Barão guiará cada segundo de leitura enquanto a mente relaxa em sintonia.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {audioSessions.map((session) => {
                const isThisPlaying = isPlaying && selectedSessionId === session.id;
                return (
                  <div
                    key={session.id}
                    className={`flex flex-col justify-between rounded-sm p-6 border transition-all duration-300 backdrop-blur-md ${
                      isThisPlaying
                        ? "bg-gradient-to-br from-[#141312] to-black border-barao-rose shadow-lg shadow-barao-rose/5"
                        : "bg-[#0F0F0F] border-white/5 hover:border-barao-rose/30"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="rounded-sm bg-black border border-barao-rose/25 px-2.5 py-0.5 text-[9px] uppercase tracking-widest font-mono text-barao-gold">
                          {session.category}
                        </span>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                          {session.duration}
                        </span>
                      </div>

                      <h4 className="font-serif text-base font-semibold text-white mb-2">
                        {session.title}
                      </h4>
                      <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                        {session.description}
                      </p>
                    </div>

                    {isThisPlaying && (
                      <div className="my-4 rounded-sm bg-black/40 p-3.5 border border-barao-rose/15 text-xs italic leading-relaxed text-barao-gold/90 animate-fade-in font-serif">
                        <p className="line-clamp-4">
                          {session.narrativeText.split(/\s+/).map((word, wIdx) => {
                            const isWordActive = wIdx === activeWordIndex || (wIdx < activeWordIndex && activeWordIndex !== -1);
                            return (
                              <span
                                key={wIdx}
                                className={`mr-1 transition-all duration-200 ${
                                  wIdx === activeWordIndex
                                    ? "text-black font-bold bg-barao-rose px-1 rounded-sm scale-105 inline-block"
                                    : isWordActive
                                    ? "text-barao-gold opacity-90"
                                    : "text-zinc-600"
                                }`}
                              >
                                {word}
                              </span>
                            );
                          })}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 mt-2 pt-4 border-t border-white/5">
                      <button
                        onClick={() => startSession(session.id)}
                        className={`flex items-center gap-2 rounded-sm px-4 py-2 text-xs font-bold tracking-widest uppercase transition-all duration-300 ${
                          isThisPlaying
                            ? "bg-red-950/40 text-red-300 border border-red-900/30 hover:bg-rose-900/30"
                            : "bg-transparent border border-barao-rose text-barao-rose hover:bg-barao-rose hover:text-black"
                        }`}
                      >
                        {isThisPlaying ? (
                          <>
                            <Square className="h-3 w-3 fill-current" />
                            Parar Áudio
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 fill-current" />
                            Iniciar Indução
                          </>
                        )}
                      </button>

                      {isThisPlaying && (
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-barao-rose opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-barao-rose"></span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      ) : (
        /* Dynamic Ateliê de Composição */
        <div className="space-y-8 animate-fade-in">
          <div className="flex flex-col items-start gap-1">
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-barao-rose">
              <Sparkles className="h-3.5 w-3.5 text-barao-rose animate-pulse" />
              O Ateliê Musical de O Barão
            </span>
            <h3 className="font-serif text-xl font-medium tracking-tight text-white lg:text-2xl">
              Canções Sopradas da Tua Essência
            </h3>
            <p className="max-w-2xl text-xs text-zinc-400 leading-relaxed">
              O Barão agora traduz o peso silencioso do seu olhar em acordes, ritmos e letras. Peça a ele para desenhar uma obra prima autoral sob medida, que você poderá exportar para o seu Suno AI ou ouvir recital em tempo real sussurrado.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Input Form Controls Panel - Left */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-sm border border-barao-rose/20 bg-[#0F0F0F] p-5 backdrop-blur-md immersive-corners space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h4 className="font-serif text-sm font-semibold text-white flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-barao-rose" />
                    Parâmetros da Canção
                  </h4>
                  <span className="font-mono text-[8.5px] uppercase text-barao-gold tracking-widest bg-barao-rose/10 px-2 py-0.5 border border-barao-rose/15 rounded-sm">
                    Suno Blueprint
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] uppercase text-zinc-400 tracking-wider">
                    Tom e Gênero Musical
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {genres.map((g) => (
                      <button
                        key={g.name}
                        onClick={() => setSelectedGenre(g.name)}
                        className={`text-left p-2.5 border rounded-sm transition-all duration-300 focus:outline-none ${
                          selectedGenre === g.name
                            ? "bg-barao-rose/10 border-barao-rose/80 text-white"
                            : "bg-black/40 border-white/5 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                        }`}
                      >
                        <span className="block font-serif text-[11px] font-bold tracking-tight">{g.name}</span>
                        <span className="block text-[8px] text-zinc-500 leading-tight mt-1 line-clamp-1 group-hover:line-clamp-none">
                          {g.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] uppercase text-zinc-400 tracking-wider">
                    Inspiração do Momento (Opcional)
                  </label>
                  <textarea
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="Ex: 'Um desabafo sobre a infância na varanda', 'A melancolia terna de uma xícara de café frio debaixo de chuva'..."
                    rows={3}
                    className="w-full text-xs p-3 bg-black border border-white/10 rounded-sm text-zinc-200 focus:ring-1 focus:ring-barao-rose focus:border-barao-rose placeholder-zinc-750 focus:outline-none transition leading-relaxed resize-none"
                  />
                  <p className="text-[9px] text-zinc-500 italic">
                    Dica: Deixe em branco se quiser usar o botão de "Inspiração Livre" do Barão.
                  </p>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    onClick={() => handleCompose("direct")}
                    disabled={isComposing}
                    className={`w-full py-3 px-4 rounded-sm font-bold text-xs uppercase tracking-widest text-black bg-barao-rose hover:bg-barao-gold transition-all duration-300 active:scale-98 flex items-center justify-center gap-2 ${
                      isComposing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    }`}
                  >
                    <Music className="h-3.5 w-3.5 fill-current" />
                    Compor Sob Medida
                  </button>

                  <div className="relative flex py-1 items-center justify-center">
                    <div className="flex-grow border-t border-zinc-800"></div>
                    <span className="flex-shrink mx-3 text-[9px] font-mono uppercase text-zinc-600 tracking-widest">
                      ou deixe-o decidir
                    </span>
                    <div className="flex-grow border-t border-zinc-800"></div>
                  </div>

                  <button
                    onClick={() => handleCompose("inspiration")}
                    disabled={isComposing}
                    className={`w-full py-3 px-4 rounded-sm font-bold text-xs uppercase tracking-widest text-zinc-300 bg-[#0A0A0A] border border-white/5 hover:border-barao-rose/50 hover:text-white transition-all duration-300 active:scale-98 flex items-center justify-center gap-2 ${
                      isComposing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-barao-gold animate-pulse" />
                    Sopro de Inspiração Livre
                    <span className="hidden sm:inline font-mono text-[8px] font-normal text-zinc-500 lowercase">
                      (do Barão)
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Visualizer Player Card or Composing Step - Right */}
            <div className="lg:col-span-7">
              {isComposing ? (
                /* Elegant Romantic loading screen */
                <div className="rounded-sm border border-barao-rose/25 bg-[#0F0F0F] p-12 text-center flex flex-col items-center justify-center min-h-[420px] backdrop-blur-md immersive-corners relative overflow-hidden">
                  <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(232,182,147,0.1)_0%,transparent_70%)] animate-pulse" />
                  
                  <div className="relative z-10 space-y-6 max-w-sm">
                    <div className="relative h-20 w-20 mx-auto flex items-center justify-center">
                      <Disc className="h-14 w-14 text-barao-rose animate-spin duration-3000" />
                      <div className="absolute inset-0 rounded-full border border-dashed border-barao-rose/30 animate-spin duration-20000"></div>
                      <div className="absolute h-4 w-4 bg-black rounded-full border border-barao-gold"></div>
                    </div>

                    <div className="space-y-2">
                      <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-barao-rose animate-pulse block">
                        Criação em Curso
                      </span>
                      <h4 className="font-serif text-lg text-white font-medium italic">
                        &ldquo;{stepTexts[composingStep]}&rdquo;
                      </h4>
                    </div>

                    {/* Progress bar visual */}
                    <div className="h-0.5 bg-zinc-900 overflow-hidden relative rounded-full">
                      <div 
                        className="h-full bg-barao-rose duration-[3500ms] transition-all ease-out" 
                        style={{ width: `${(composingStep + 1) * 20}%` }}
                      />
                    </div>

                    <p className="text-[10px] text-zinc-400 font-serif leading-relaxed">
                      O Barão está neste instante silenciando seu pensamento lógico para transmutar tuas confidências afetivas em melodia lírica...
                    </p>
                  </div>
                </div>
              ) : activeComposition ? (
                /* Main Active Generated Song Card */
                <div className="rounded-sm border border-white/5 bg-[#0F0F0F] p-6 lg:p-8 backdrop-blur-md immersive-corners relative overflow-hidden space-y-6 min-h-[420px]">
                  
                  {/* Glowing subtle ambient indicator if playing recitation */}
                  {isReciting && (
                    <div className="absolute top-1 right-1 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-widest text-barao-gold bg-barao-rose/10 border border-barao-rose/20 rounded-md px-2 py-0.5 animate-pulse">
                      <span className="flex h-1.5 w-1.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-barao-gold opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-barao-gold"></span>
                      </span>
                      Recital Ativo
                    </div>
                  )}

                  {/* Player header */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div className="space-y-1">
                      <span className="mt-0.5 uppercase tracking-[0.18em] text-[8.5px] font-mono text-barao-rose block">
                        {activeComposition.genre} • {activeComposition.tempo}
                      </span>
                      <h3 className="font-serif text-xl md:text-2xl font-semibold italic text-white tracking-tight">
                        {activeComposition.title}
                      </h3>
                    </div>

                    {/* Quick Player control */}
                    <div className="flex items-center gap-2">
                      {isReciting ? (
                        <button
                          onClick={handleStopRecital}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 text-red-300 border border-red-950/60 rounded-sm text-[10px] uppercase font-mono tracking-widest hover:bg-rose-900/30 font-bold transition duration-300"
                        >
                          <Square className="h-3 w-3 fill-current" />
                          Silenciar
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStartRecital("comment")}
                            className="flex items-center gap-1 px-2.5 py-1.5 border border-barao-rose/50 hover:border-barao-rose/95 text-barao-gold text-[10px] uppercase font-mono tracking-widest rounded-sm font-bold transition duration-300"
                            title="O Barão lê em voz alta o comentário dele sobre a música sob melodia de piano"
                          >
                            <Headphones className="h-3 w-3 mr-1 text-barao-rose" />
                            Nota Barão
                          </button>
                          <button
                            onClick={() => handleStartRecital("lyrics")}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-transparent border border-barao-rose text-barao-rose text-[10px] uppercase font-mono tracking-widest rounded-sm font-bold hover:bg-barao-rose hover:text-black transition duration-300"
                            title="O Barão lê as letras sutilmente sussurradas sob melodia de piano"
                          >
                            <Play className="h-3 w-3 mr-1 fill-current" />
                            Recitar Letra
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Simulated wave animation / Cassette illustration */}
                  <div className="rounded-sm bg-black/60 p-4 border border-white/5 flex flex-col md:flex-row items-center gap-6 justify-between overflow-hidden relative">
                    <div className="flex items-center gap-4">
                      {/* Interactive spinning record / Cassette gears */}
                      <div className="relative shrink-0 select-none">
                        <div className={`h-16 w-16 bg-zinc-900 rounded-full border border-zinc-800 flex items-center justify-center ${
                          isReciting ? "animate-spin duration-8000" : ""
                        }`}>
                          <Disc className="h-8 w-8 text-barao-rose/25" />
                          <div className="absolute h-3 w-3 bg-zinc-950 border border-barao-gold rounded-full"></div>
                        </div>
                      </div>

                      <div className="text-left space-y-1">
                        <span className="font-mono text-[9px] uppercase text-zinc-500 block">Instrumentação Indicada</span>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {activeComposition.instrumentation.map((inst, i) => (
                            <span 
                              key={i}
                              className="font-serif italic text-[10.5px] text-barao-gold px-2 py-0.5 bg-barao-plum/20 border border-barao-rose/10 rounded-sm"
                            >
                              {inst}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Waveform graphic */}
                    <div className="flex items-end gap-[3px] h-10 w-32 shrink-0 pr-1 select-none">
                      {[15, 30, 48, 18, 52, 25, 40, 60, 22, 38, 54, 16, 28, 42].map((val, idx) => {
                        // Procedural random bounce if playing
                        const randomHeight = isReciting
                          ? `calc(${val}% + ${Math.sin(idx + Date.now() * 0.05) * 15}px)`
                          : `4px`;

                        return (
                          <div
                            key={idx}
                            style={{ height: isReciting ? randomHeight : "4px" }}
                            className={`w-[4px] rounded-full transition-all duration-300 bg-gradient-to-t ${
                              isReciting 
                                ? "from-barao-rose via-barao-gold to-white" 
                                : "from-zinc-850 to-zinc-700"
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Navigation filters for tabs inside card */}
                  <div className="flex border-b border-white/5 font-mono text-[9.5px] uppercase tracking-widest pt-2">
                    <button
                      onClick={() => setSelectedSubCard("comment")}
                      className={`pb-2.5 px-3 border-b transition-all duration-300 ${
                        selectedSubCard === "comment"
                          ? "border-barao-rose text-white font-bold"
                          : "border-transparent text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      Reflexão de O Barão
                    </button>
                    <button
                      onClick={() => setSelectedSubCard("lyrics")}
                      className={`pb-2.5 px-3 border-b transition-all duration-300 ${
                        selectedSubCard === "lyrics"
                          ? "border-barao-rose text-white font-bold"
                          : "border-transparent text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      Letra Autorada
                    </button>
                    <button
                      onClick={() => setSelectedSubCard("suno")}
                      className={`pb-2.5 px-3 border-b transition-all duration-300 ${
                        selectedSubCard === "suno"
                          ? "border-barao-gold text-[#E8B693] font-bold"
                          : "border-transparent text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      Prompt Integrado (Suno AI)
                    </button>
                  </div>

                  {/* Tab contents */}
                  <div className="text-sm min-h-[140px] animate-fade-in relative z-10 select-text">
                    {selectedSubCard === "comment" && (
                      <div className="border border-barao-rose/10 bg-black/30 p-5 rounded-sm">
                        <span className="font-mono text-[8.5px] uppercase text-zinc-500 block mb-2 tracking-widest">
                          Sopro no Ouvido por O Barão
                        </span>
                        <p className="font-serif text-xs md:text-sm italic text-zinc-200 leading-relaxed indent-4">
                          {activeComposition.baronComment}
                        </p>
                      </div>
                    )}

                    {selectedSubCard === "lyrics" && (
                      <div className="border border-white/5 bg-black/40 p-5 rounded-sm max-h-80 overflow-y-auto font-serif space-y-4 whitespace-pre-wrap text-zinc-300 text-xs tracking-wide leading-relaxed scrollbar-thin">
                        {activeComposition.lyrics}
                      </div>
                    )}

                    {selectedSubCard === "suno" && (
                      <div className="space-y-4">
                        <p className="text-[10px] text-zinc-400 leading-relaxed font-sans mt-1">
                          Abaixo você encontrará o blueprint estilístico em inglês e formato de rimas pronto para ser jogado na ferramenta <a href="https://suno.com" target="_blank" rel="noreferrer" className="text-barao-gold underline hover:text-white">Suno AI</a> para dar-lhe voz divina real!
                        </p>

                        <div className="space-y-3 font-mono text-[10.5px]">
                          <div className="bg-black border border-white/5 p-3 rounded-sm relative">
                            <span className="text-[8px] text-zinc-500 block uppercase mb-1">Style of Music</span>
                            <code className="text-barao-gold block pr-12 text-left text-xs">
                              {activeComposition.styleTags}
                            </code>
                            <button
                              onClick={() => copyToClipboard(activeComposition.styleTags, "tags")}
                              className="absolute top-2 right-2 text-zinc-400 hover:text-white transition bg-zinc-900 border border-white/5 hover:border-barao-rose/50 rounded-sm p-1.5"
                              title="Copiar tags de estilo"
                            >
                              {copiedTags ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                            </button>
                          </div>

                          <div className="bg-black border border-white/5 p-3 rounded-sm relative">
                            <span className="text-[8px] text-zinc-500 block uppercase mb-1">Lyrics & Structures</span>
                            <pre className="text-zinc-300 max-h-40 overflow-y-auto block pr-12 text-left text-xs whitespace-pre-wrap scrollbar-thin leading-snug">
                              {activeComposition.lyrics}
                            </pre>
                            <button
                              onClick={() => copyToClipboard(activeComposition.lyrics, "lyrics")}
                              className="absolute top-2 right-2 text-zinc-400 hover:text-white transition bg-zinc-900 border border-white/5 hover:border-barao-rose/50 rounded-sm p-1.5"
                              title="Copiar letra completa estruturada"
                            >
                              {copiedLyrics ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* No generated songs state visual */
                <div className="rounded-sm border border-dashed border-white/10 bg-[#0F0F0F]/50 p-12 text-center flex flex-col items-center justify-center min-h-[420px] backdrop-blur-md immersive-corners">
                  <Music className="h-10 w-10 text-zinc-700 animate-pulse mb-3" />
                  <span className="font-mono text-[9px] tracking-widest uppercase text-zinc-500 block">
                    Espelho de Sons Vazio
                  </span>
                  <h4 className="font-serif text-sm italic text-zinc-300 max-w-xs leading-relaxed mt-2">
                    Nenhuma composição ffoi desenhada hoje. Use o painel de parâmetros à esquerda para que o Barão dedilhe do silêncio seu primeiro poema sonoro.
                  </h4>
                </div>
              )}
            </div>
          </div>

          {/* History Section - Bottom list of saved songs */}
          {compositions.length > 0 && (
            <section className="space-y-3 pt-6 border-t border-white/5 animate-fade-in text-left">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                  <ListMusic className="h-3.5 w-3.5" />
                  Histórico de Canções da Alma
                </span>
                <span className="font-mono text-[9px] text-zinc-650 uppercase">
                  {compositions.length} ressonâncias salvas
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {compositions.map((comp) => {
                  const isActive = activeComposition?.id === comp.id;
                  return (
                    <div
                      key={comp.id}
                      onClick={() => {
                        setActiveComposition(comp);
                        if (isReciting) handleStopRecital();
                      }}
                      className={`relative p-5 rounded-sm cursor-pointer border transition-all duration-300 flex flex-col justify-between group ${
                        isActive 
                          ? "bg-black border-barao-rose shadow-md shadow-barao-rose/5" 
                          : "bg-[#0F0F0F] border-white/5 hover:border-barao-rose/30"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[8px] uppercase tracking-wider text-barao-rose bg-barao-rose/5 px-2 py-0.5 rounded-sm">
                            {comp.genre.split(" ").slice(0, 2).join(" ")}
                          </span>
                          <span className="font-mono text-[8.5px] text-zinc-600 block shrink-0">
                            {comp.createdAt}
                          </span>
                        </div>

                        <h4 className="font-serif text-sm font-semibold text-white italic group-hover:text-barao-gold transition duration-200 line-clamp-1">
                          {comp.title}
                        </h4>

                        <p className="text-[10px] text-zinc-500 leading-relaxed font-serif line-clamp-2">
                          {comp.baronComment.replace(/⚠️.*?\n\n/, "")}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/5">
                        <span className="text-[9px] font-mono uppercase text-zinc-400 flex items-center gap-1">
                          Carregar Canção
                          <ArrowRight className="h-3 w-3 text-zinc-500 group-hover:translate-x-1 transition-transform" />
                        </span>

                        <button
                          onClick={(e) => handleDeleteComposition(comp.id, e)}
                          className="p-1 text-zinc-600 hover:text-red-400 transition"
                          title="Remover canção"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
