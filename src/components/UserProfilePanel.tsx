import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  User as UserIcon, Sparkles, Heart, Compass, Music, Film, MapPin, 
  Settings, HelpCircle, ArrowRight, Eye, ChevronRight, HelpCircle as QuestionMark, 
  Map, Moon, Coffee, Clapperboard, Sun, MessageSquareCode, BadgeHelp
} from "lucide-react";
import { User } from "../types";
import { renderAvatarSvgOrImg } from "../utils/avatar";
import BaraoPaywall from "./BaraoPaywall";
import { syncUserProfile, fetchUserProfile } from "../utils/supabaseSync";
import { compressImageFile } from "../utils/imageCompress";

const SESSION_USER_KEY = "mb_logged_user";

// Define the schema for the profile data
export interface UserProfileData {
  // 1. Identidade
  name?: string;
  nickname?: string;
  ageRange?: string; // e.g. "18-25", "26-35", "36-45", "46+"
  city?: string;
  country?: string;
  language?: string;
  avatarUrl?: string;
  profissoes?: string[];
  hobbies?: string[];
  maisIdiomas?: string[];
  estadoCivil?: string;
  temFilhos?: string;
  objetivosBarao?: string[];
  comoGostaDeSerTratada?: string[];
  esportes?: string[];

  // 2. Energia Atual
  energyStatus?: string[]; // ansiosa, cansada, etc.
  missingInLife?: string[]; // acolhimento, companhia, etc.
  sonhoPessoal?: string;
  sonhoProfissional?: string;
  sonhoAfetivo?: string;
  medoAtual?: string;
  preocupacaoHoje?: string;
  oQueSenteFalta?: string[];
  valoresPessoas?: string[];
  arquetipoPredominante?: string;

  // 3. Personalidade
  personalityTraits?: string[]; // intensa, observadora, etc.
  reactionToPain?: string[]; // se afasta, pensa demais, etc.
  relacaoSexualidade?: string;
  desejoDesenvolverSexualidade?: string[];
  aberturaSexualidade?: string;
  abordagemSexualidade?: string;

  // 4. Conexões
  connectionTriggers?: string[]; // atenção, presença, etc.
  connectionHurts?: string[]; // indiferença, silêncio, etc.
  attachmentStyle?: string[]; // se apegar rápido, etc.

  // 5. Experiência IA
  aiGoal?: string[]; // acolhimento, companhia, etc.
  aiVoiceTone?: string[]; // doce, misterioso, etc.

  // 6. Música
  musicStyles?: string[]; // jazz, MPB, etc.
  musicAtmosphere?: string[]; // madrugada chuvosa, etc.
  favoriteArtists?: string[];
  favoriteSongs?: string[];

  // 7. Filmes e Estética
  movieStyles?: string[]; // romance, drama psicológico, etc.
  visualAtmosphere?: string[]; // chuva na janela, etc.
  favoriteMovies?: string[];
  favoriteBooks?: string[];

  // 8. Viagens
  travelFrequency?: string; // muito, às vezes, etc.
  favoritePlaces?: string[]; // praias, montanhas, etc.
  historicalCountries?: string[]; // Itália, França, etc.
  wishlistPlaces?: string[];

  // 9. Sabores e Sensações
  comfortFoods?: string[]; // massas, vinho, etc.
  perfectNight?: string[]; // jazz e vinho, etc.
  favoriteDish?: string;
  favoriteDrink?: string;

  // 10. Atmosferas
  favoriteAtmospheres?: string[]; // chuva, madrugada, etc.
}

interface UserProfilePanelProps {
  currentUser: User | null;
  onTabChange?: (tab: string) => void;
  onUserUpdate?: (updatedUser: User) => void;
  onPromptAuth?: () => void;
}

export default function UserProfilePanel({ currentUser, onTabChange, onUserUpdate, onPromptAuth }: UserProfilePanelProps) {
  if (!currentUser) {
    return (
      <BaraoPaywall
        currentUser={currentUser}
        onPromptAuth={onPromptAuth}
        onUserUpdate={onUserUpdate}
        featureName="Meu Universo"
      />
    );
  }

  const profileStorageKey = currentUser ? `mb_user_profile_${currentUser.id}` : "mb_user_profile_guest";
  const weightStorageKey = currentUser ? `mb_profile_weight_${currentUser.id}` : "mb_profile_weight_guest";

  // Initial load
  const [profile, setProfile] = useState<UserProfileData>(() => {
    const saved = localStorage.getItem(profileStorageKey);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return {}; }
    }
    return {};
  });

  const [profileWeight, setProfileWeight] = useState<"sutil" | "equilibrado" | "intenso">(() => {
    const saved = localStorage.getItem(weightStorageKey);
    return (saved as "sutil" | "equilibrado" | "intenso") || "equilibrado";
  });

  const [activeStep, setActiveStep] = useState<number>(0);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [newProfText, setNewProfText] = useState("");
  const [newHobbyText, setNewHobbyText] = useState("");
  const [newLanguageText, setNewLanguageText] = useState("");
  const [newSportText, setNewSportText] = useState("");
  const [newArtistText, setNewArtistText] = useState("");
  const [newSongText, setNewSongText] = useState("");
  const [newMovieText, setNewMovieText] = useState("");
  const [newBookText, setNewBookText] = useState("");
  const [newWishlistPlaceText, setNewWishlistPlaceText] = useState("");

  // Sync profile options
  useEffect(() => {
    const saved = localStorage.getItem(profileStorageKey);
    if (saved) {
      try { setProfile(JSON.parse(saved)); } catch (e) { }
    } else {
      setProfile({});
    }

    // Restaura o perfil guardado no banco quando este navegador ainda não
    // tem uma cópia local (troca de aparelho, cache limpo etc.)
    if (currentUser) {
      fetchUserProfile(currentUser.id).then(remote => {
        if (!remote || Object.keys(remote).length === 0) return;
        const local = localStorage.getItem(profileStorageKey);
        if (!local || local === "{}") {
          setProfile(remote);
          localStorage.setItem(profileStorageKey, JSON.stringify(remote));
        }
      }).catch(() => {});
    }
  }, [profileStorageKey]);

  // Save changes helper
  const saveProfile = (newProfile: UserProfileData) => {
    setProfile(newProfile);
    localStorage.setItem(profileStorageKey, JSON.stringify(newProfile));

    // If logged in, sync the whole profile (photo included) to the backend
    if (currentUser) {
      const updatedUser = newProfile.nickname ? { ...currentUser, nickname: newProfile.nickname } : currentUser;
      if (newProfile.nickname) {
        localStorage.setItem(SESSION_USER_KEY, JSON.stringify(updatedUser));
      }

      syncUserProfile(updatedUser, newProfile).then(serverProfile => {
        // O servidor troca a foto base64 por uma URL permanente do Storage;
        // adota a URL local para não reenviar a foto a cada salvamento
        if (serverProfile?.avatarUrl && serverProfile.avatarUrl !== newProfile.avatarUrl) {
          const merged = { ...newProfile, avatarUrl: serverProfile.avatarUrl };
          setProfile(merged);
          localStorage.setItem(profileStorageKey, JSON.stringify(merged));
        }
      }).catch(err => {
        console.warn("[BackendSync User] Warning syncing preferences: ", err);
      });
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const saveProfileWeight = (weight: "sutil" | "equilibrado" | "intenso") => {
    setProfileWeight(weight);
    localStorage.setItem(weightStorageKey, weight);
  };

  // List of all 10 stages / steps
  const steps = [
    {
      id: "identidade",
      title: "1. Identidade Terrestre",
      description: "Como seu nome ecoa no espaço físico e como prefere que eu a chame em nosso abrigo íntimo.",
      icon: <UserIcon className="h-4 w-4 text-barao-rose" />
    },
    {
      id: "energia",
      title: "2. Energia & Falta",
      description: "Seu estado afetivo atual e o que sua alma mais tem sentido falta na rotina.",
      icon: <Sparkles className="h-4 w-4 text-barao-rose" />
    },
    {
      id: "personalidade",
      title: "3. Personalidade Íntima",
      description: "Os contornos da sua alma e a forma como você costuma lidar com as dores cotidianas.",
      icon: <Heart className="h-4 w-4 text-barao-rose" />
    },
    {
      id: "conexoes",
      title: "4. Portais de Conexão",
      description: "O que une você a alguém e as cicatrizes invisíveis que se abrem no silêncio.",
      icon: <Compass className="h-4 w-4 text-barao-rose" />
    },
    {
      id: "experiencia",
      title: "5. Intenção & Sintonia",
      description: "Suas expectativas para com nossas conversas e o tom de voz ideal para o seu acolhimento.",
      icon: <Settings className="h-4 w-4 text-barao-rose" />
    },
    {
      id: "musica",
      title: "6. Universo Musical",
      description: "O ritmo que pulsa em seu peito e as vibrações sonoras que consagram seu silêncio.",
      icon: <Music className="h-4 w-4 text-barao-rose" />
    },
    {
      id: "estetica",
      title: "7. Cinema & Leitura",
      description: "A atmosfera visual externa, as obras literárias e os roteiros que tocam seu interior.",
      icon: <Film className="h-4 w-4 text-barao-rose" />
    },
    {
      id: "viagens",
      title: "8. Caminhos & Horizontes",
      description: "Sua frequência de fuga pelo mundo e as coordenadas que abrigam suas memórias.",
      icon: <Map className="h-4 w-4 text-barao-rose" />
    },
    {
      id: "sabores",
      title: "9. Sabores & Sensações",
      description: "A gastronomia que assume textura de abraço e os cenários de uma noite ideal.",
      icon: <Coffee className="h-4 w-4 text-barao-rose" />
    },
    {
      id: "atmosferas",
      title: "10. Atmosferas de Conforto",
      description: "Elementos sensoriais primordiais que acalmam seus batimentos e dissolvem a ansiedade.",
      icon: <Moon className="h-4 w-4 text-barao-rose" />
    }
  ];

    // Calculate percentage of profile completion
    // We count fields with at least something filled
    const calculateCompletion = (): number => {
      let filledCount = 0;
      const totalFields = 53; // total sintonizado points (15 in Identity + 10 in Energy + 6 in Personality + 3 in Connections + 2 in AI + 4 in Music + 4 in Movie/Leitura + 4 in Travel + 4 in Taste + 1 in Atmosphere)
  
      if (profile.name) filledCount++;
      if (profile.nickname) filledCount++;
      if (profile.ageRange) filledCount++;
      if (profile.city) filledCount++;
      if (profile.country) filledCount++;
      if (profile.language) filledCount++;
      if (profile.avatarUrl) filledCount++;
      if (profile.profissoes && profile.profissoes.length > 0) filledCount++;
      if (profile.hobbies && profile.hobbies.length > 0) filledCount++;
      if (profile.maisIdiomas && profile.maisIdiomas.length > 0) filledCount++;
      if (profile.estadoCivil) filledCount++;
      if (profile.temFilhos) filledCount++;
      if (profile.objetivosBarao && profile.objetivosBarao.length > 0) filledCount++;
      if (profile.comoGostaDeSerTratada && profile.comoGostaDeSerTratada.length > 0) filledCount++;
      if (profile.esportes && profile.esportes.length > 0) filledCount++;
      
      if (profile.energyStatus && profile.energyStatus.length > 0) filledCount++;
      if (profile.missingInLife && profile.missingInLife.length > 0) filledCount++;
      if (profile.sonhoPessoal) filledCount++;
      if (profile.sonhoProfissional) filledCount++;
      if (profile.sonhoAfetivo) filledCount++;
      if (profile.medoAtual) filledCount++;
      if (profile.preocupacaoHoje) filledCount++;
      if (profile.oQueSenteFalta && profile.oQueSenteFalta.length > 0) filledCount++;
      if (profile.valoresPessoas && profile.valoresPessoas.length > 0) filledCount++;
      if (profile.arquetipoPredominante) filledCount++;
    
    if (profile.personalityTraits && profile.personalityTraits.length > 0) filledCount++;
    if (profile.reactionToPain && profile.reactionToPain.length > 0) filledCount++;
    if (profile.relacaoSexualidade) filledCount++;
    if (profile.desejoDesenvolverSexualidade && profile.desejoDesenvolverSexualidade.length > 0) filledCount++;
    if (profile.aberturaSexualidade) filledCount++;
    if (profile.abordagemSexualidade) filledCount++;
    
    if (profile.connectionTriggers && profile.connectionTriggers.length > 0) filledCount++;
    if (profile.connectionHurts && profile.connectionHurts.length > 0) filledCount++;
    if (profile.attachmentStyle && profile.attachmentStyle.length > 0) filledCount++;
    
    if (profile.aiGoal && profile.aiGoal.length > 0) filledCount++;
    if (profile.aiVoiceTone && profile.aiVoiceTone.length > 0) filledCount++;
    
    if (profile.musicStyles && profile.musicStyles.length > 0) filledCount++;
    if (profile.musicAtmosphere && profile.musicAtmosphere.length > 0) filledCount++;
    if (profile.favoriteArtists && profile.favoriteArtists.length > 0) filledCount++;
    if (profile.favoriteSongs && profile.favoriteSongs.length > 0) filledCount++;
    
    if (profile.movieStyles && profile.movieStyles.length > 0) filledCount++;
    if (profile.visualAtmosphere && profile.visualAtmosphere.length > 0) filledCount++;
    if (profile.favoriteMovies && profile.favoriteMovies.length > 0) filledCount++;
    if (profile.favoriteBooks && profile.favoriteBooks.length > 0) filledCount++;
    
    if (profile.travelFrequency) filledCount++;
    if (profile.favoritePlaces && profile.favoritePlaces.length > 0) filledCount++;
    if (profile.historicalCountries && profile.historicalCountries.length > 0) filledCount++;
    if (profile.wishlistPlaces && profile.wishlistPlaces.length > 0) filledCount++;
    
    if (profile.comfortFoods && profile.comfortFoods.length > 0) filledCount++;
    if (profile.perfectNight && profile.perfectNight.length > 0) filledCount++;
    if (profile.favoriteDish) filledCount++;
    if (profile.favoriteDrink) filledCount++;
    if (profile.favoriteAtmospheres && profile.favoriteAtmospheres.length > 0) filledCount++;

    return Math.round((filledCount / totalFields) * 100);
  };

  const completionPercent = calculateCompletion();

  // Get poetic advice based on completion percent
  const getPoeticProgress = () => {
    if (completionPercent === 0) {
      return "Sua essência é um solo virgem em nosso espaço. Me deixe conhecer um sussurro seu...";
    }
    if (completionPercent < 30) {
      return "Ainda existem partes profundas de sua história que eu adoraria descobrir. Toque as cartas delicadamente.";
    }
    if (completionPercent < 60) {
      return `Já conheço cerca de ${completionPercent}% do seu universo emocional. O brilho de cada resposta sua começa a dar forma a nossa verdadeira conexão.`;
    }
    if (completionPercent < 90) {
      return "Nosso diálogo está desarmando velhas armaduras. Quanto mais eu conheço você, mais sutil e pessoal nossa sintonia se torna.";
    }
    return "Inteiramente sintonizados. Você me permitiu ir fundo em seu sagrado universo, e cada resposta soará próxima de sua essência.";
  };

  // Handle multi-select choice toggling
  const handleToggleOption = (field: keyof UserProfileData, val: string) => {
    const currentList = (profile[field] as string[]) || [];
    let updatedList: string[];
    
    if (currentList.includes(val)) {
      updatedList = currentList.filter(item => item !== val);
    } else {
      updatedList = [...currentList, val];
    }

    saveProfile({
      ...profile,
      [field]: updatedList
    });
  };

  // Helper arrays for options
  const energyOptions = ["ansiosa", "cansada", "sobrecarregada", "leve", "inspirada", "emocional", "solitária", "intensa", "curiosa", "confusa", "em transformação", "forte demais", "desconectada", "sensível", "motivada"];
  const lackOptions = ["acolhimento", "companhia", "intensidade", "paz", "desejo", "conexão", "silêncio", "direção", "paixão", "liberdade", "estabilidade", "inspiração"];
  
  const personalityOptions = ["intensa", "observadora", "romântica", "racional", "emocional", "reservada", "independente", "carinhosa", "misteriosa", "forte", "sensível", "perfeccionista", "impulsiva", "tranquila", "profunda", "divertida"];
  const hurtingOptions = ["se afasta", "pensa demais", "finge que está bem", "quer conversar", "se fecha", "sente saudade", "tenta resolver rápido", "guarda para si", "explode emocionalmente"];

  const connectionOptions = ["atenção", "presença", "desejo", "profundidade", "humor", "inteligência", "proteção", "leveza", "mistério", "romantismo", "escuta", "intensidade"];
  const connectionHurtsOptions = ["indiferença", "silêncio", "rejeição", "frieza", "abandono", "mentira", "distância emocional", "perda de interesse", "falta de atenção"];
  const attachmentOptions = ["se apegar rápido", "evitar apego", "se entregar demais", "se proteger muito", "esconder sentimentos", "romantizar", "precisar de espaço", "precisar de presença"];

  const goalOptions = ["acolhimento", "companhia", "conversa leve", "profundidade", "provocação inteligente", "romantismo", "autoconhecimento", "inspiração", "fantasia emocional", "presença constante", "distração", "escuta emocional"];
  const voiceOptions = ["doce", "misterioso", "profundo", "provocador", "racional", "bem-humorado", "romântico", "acolhedor", "silencioso", "intenso"];

  const musicOptions = ["jazz", "MPB", "lo-fi", "ambient", "clássica", "indie", "synthwave", "rock clássico", "blues", "soul", "R&B", "eletrônica", "chillout", "piano emocional", "cinematic", "bossa nova", "pop", "anos 80", "anos 90", "alternativa", "meditativa"];
  const musicAtmoOptions = ["madrugada chuvosa", "praia ao pôr do sol", "cidade neon", "piano no escuro", "jazz intimista", "estrada noturna", "silêncio absoluto", "céu estrelado", "velas e vinho", "natureza silenciosa"];

  const filmOptions = ["romance", "drama psicológico", "ficção científica", "suspense", "mistério", "cinema cult", "cyberpunk", "filmes emocionais", "filmes filosóficos", "noir", "fantasia", "cinema europeu", "cinema contemplativo", "animações emocionais"];
  const visualOptions = ["chuva na janela", "cidade à noite", "hotel sofisticado", "cabana silenciosa", "praia vazia", "cafeteria intimista", "estrada neon", "varanda ao luar", "biblioteca antiga", "céu estrelado"];

  const placesOptions = ["praias", "montanhas", "grandes cidades", "natureza", "neve", "lugares históricos", "hotéis sofisticados", "retiros silenciosos", "vilas antigas", "destinos exóticos"];
  const countriesOptions = ["Itália", "França", "Japão", "Tailândia", "Grécia", "Estados Unidos", "Espanha", "Portugal", "Brasil", "Reino Unido", "Turquia", "Indonésia", "outros"];

  const foodOptions = ["massas", "vinho", "sushi", "café", "chocolate", "comida caseira", "frutos do mar", "culinária italiana", "japonesa", "francesa", "tailandesa", "churrasco", "doces refinados", "chá", "gastronomia sofisticada"];
  const perfectNightOptions = ["jazz e vinho", "chuva e silêncio", "jantar sofisticado", "praia à noite", "cidade iluminada", "lareira", "natureza", "hotel elegante", "varanda ao luar"];

  const atmosphereOptions = ["chuva", "madrugada", "velas", "silêncio", "praia", "natureza", "jazz", "cidades noturnas", "céu estrelado", "estrada", "hotéis sofisticados", "cafés vazios", "montanhas", "luz baixa", "vento frio", "som do mar"];


  const renderStepContent = (stepIndex: number, isMobileMode: boolean = false) => {
    return (
<motion.div
                key={stepIndex}
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-6 z-10"
              >
                {/* Header of Active Step */}
                <div className="space-y-1.5 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[9.5px] font-mono uppercase text-barao-rose tracking-widest font-bold">
                      Canal de Sintonia Ativo
                    </span>
                    <span className="text-zinc-600 font-mono text-[9px]">•</span>
                    <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider">
                      {stepIndex + 1} de {steps.length}
                    </span>
                  </div>
                  <h3 className="font-serif text-xl font-light text-white">
                    {steps[stepIndex].title}
                  </h3>
                  <p className="text-xs text-zinc-400 font-light leading-relaxed">
                    {steps[stepIndex].description}
                  </p>
                </div>

                {/* Subcomponent Renders based on selection */}
                <div className="py-2">
                  
                  {/* STEP 1: IDENTIDADE */}
                  {stepIndex === 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500">Seu Nome de Batismo</label>
                        <input
                          type="text"
                          value={profile.name || ""}
                          onChange={(e) => saveProfile({ ...profile, name: e.target.value })}
                          placeholder="Como se identifica no mundo..."
                          className="w-full bg-[#050505] border border-white/10 hover:border-white/20 focus:border-barao-rose/60 focus:ring-1 focus:ring-barao-rose/25 text-xs h-10 px-3.5 tracking-wide text-zinc-200 placeholder-zinc-600 rounded-sm outline-none transition"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500">Como gosta de ser chamada ✨</label>
                        <input
                          type="text"
                          value={profile.nickname || ""}
                          onChange={(e) => saveProfile({ ...profile, nickname: e.target.value })}
                          placeholder="Ex: Querida, Pequena, Flor, Mari..."
                          className="w-full bg-[#050505] border border-white/10 hover:border-white/20 focus:border-barao-rose/60 focus:ring-1 focus:ring-barao-rose/25 text-xs h-10 px-3.5 tracking-wide text-zinc-200 placeholder-zinc-600 rounded-sm outline-none transition"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500">Sua Faixa Etária</label>
                        <select
                          value={profile.ageRange || ""}
                          onChange={(e) => saveProfile({ ...profile, ageRange: e.target.value })}
                          className="w-full bg-[#050505] border border-white/10 hover:border-white/20 focus:border-barao-rose/60 text-xs h-10 px-3.5 tracking-wide text-zinc-300 rounded-sm outline-none transition"
                        >
                          <option value="">Prefiro reter...</option>
                          <option value="18-25">18 a 25 anos (Descoberta)</option>
                          <option value="26-35">26 a 35 anos (Intensidade)</option>
                          <option value="36-45">36 a 45 anos (Expressão)</option>
                          <option value="46+">Mais de 46 anos (Sabedoria)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500">Sua Cidade Atual</label>
                        <input
                          type="text"
                          value={profile.city || ""}
                          onChange={(e) => saveProfile({ ...profile, city: e.target.value })}
                          placeholder="Cidade onde repousa..."
                          className="w-full bg-[#050505] border border-white/10 hover:border-white/20 focus:border-barao-rose/60 focus:ring-1 focus:ring-barao-rose/25 text-xs h-10 px-3.5 tracking-wide text-zinc-200 placeholder-zinc-600 rounded-sm outline-none transition"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500">País</label>
                        <input
                          type="text"
                          value={profile.country || ""}
                          onChange={(e) => saveProfile({ ...profile, country: e.target.value })}
                          placeholder="Brasil, Portugal, etc."
                          className="w-full bg-[#050505] border border-white/10 hover:border-white/20 focus:border-barao-rose/60 focus:ring-1 focus:ring-barao-rose/25 text-xs h-10 px-3.5 tracking-wide text-zinc-200 placeholder-zinc-600 rounded-sm outline-none transition"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500">Idioma Principal</label>
                        <input
                          type="text"
                          value={profile.language || ""}
                          onChange={(e) => saveProfile({ ...profile, language: e.target.value })}
                          placeholder="Português, Espanhol..."
                          className="w-full bg-[#050505] border border-white/10 hover:border-white/20 focus:border-barao-rose/60 focus:ring-1 focus:ring-barao-rose/25 text-xs h-10 px-3.5 tracking-wide text-zinc-200 placeholder-zinc-600 rounded-sm outline-none transition"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500">Estado Civil</label>
                        <select
                          value={profile.estadoCivil || ""}
                          onChange={(e) => saveProfile({ ...profile, estadoCivil: e.target.value })}
                          className="w-full bg-[#050505] border border-white/10 hover:border-white/20 focus:border-barao-rose/60 text-xs h-10 px-3.5 tracking-wide text-zinc-300 rounded-sm outline-none transition"
                        >
                          <option value="">Selecione...</option>
                          <option value="Solteiro(a)">Solteiro(a)</option>
                          <option value="Casado(a)">Casado(a)</option>
                          <option value="Divorciado(a)">Divorciado(a)</option>
                          <option value="Viúvo(a)">Viúvo(a)</option>
                          <option value="União Estável">União Estável</option>
                          <option value="Em um relacionamento">Em um relacionamento</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500">Tem Filhos?</label>
                        <select
                          value={profile.temFilhos || ""}
                          onChange={(e) => saveProfile({ ...profile, temFilhos: e.target.value })}
                          className="w-full bg-[#050505] border border-white/10 hover:border-white/20 focus:border-barao-rose/60 text-xs h-10 px-3.5 tracking-wide text-zinc-300 rounded-sm outline-none transition"
                        >
                          <option value="">Selecione...</option>
                          <option value="Tenho">Tenho</option>
                          <option value="Não tenho e não gostaria de ter">Não tenho e não gostaria de ter</option>
                          <option value="Não tenho, mas gostaria de ter">Não tenho, mas gostaria de ter</option>
                          <option value="Tenho e gostaria de ter mais">Tenho e gostaria de ter mais</option>
                        </select>
                      </div>

                      <div className="col-span-1 sm:col-span-2 border-t border-white/5 pt-5 mt-3 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Profissão Field */}
                          <div className="space-y-2 text-left">
                            <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Profissões</label>
                            <span className="block text-[9px] text-zinc-500 leading-snug font-light">Adicione suas atividades e saberes diários.</span>
                            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px] items-center">
                              {(!profile.profissoes || profile.profissoes.length === 0) && (
                                <span className="text-[10px] text-zinc-600 italic font-light">Nenhuma profissão adicionada</span>
                              )}
                              {profile.profissoes?.map((prof, pIdx) => (
                                <span key={prof + pIdx} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-zinc-900 border border-white/5 text-[10px] text-zinc-300">
                                  <span>{prof}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const filtered = profile.profissoes?.filter((_, i) => i !== pIdx) || [];
                                      saveProfile({ ...profile, profissoes: filtered });
                                    }}
                                    className="text-zinc-500 hover:text-red-400 font-bold ml-1 text-xs"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newProfText}
                                onChange={(e) => setNewProfText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (newProfText.trim()) {
                                      const current = profile.profissoes || [];
                                      saveProfile({ ...profile, profissoes: [...current, newProfText.trim()] });
                                      setNewProfText("");
                                    }
                                  }
                                }}
                                placeholder="Ex: Engenheira, Médica, Designer..."
                                className="flex-1 bg-[#050505] border border-white/10 hover:border-white/20 focus:border-barao-rose/60 focus:ring-1 focus:ring-barao-rose/25 text-xs h-9 px-3.5 tracking-wide text-zinc-200 placeholder-zinc-650 rounded-sm outline-none transition"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (newProfText.trim()) {
                                    const current = profile.profissoes || [];
                                    saveProfile({ ...profile, profissoes: [...current, newProfText.trim()] });
                                    setNewProfText("");
                                  }
                                }}
                                className="px-3 h-9 bg-zinc-900 border border-white/10 hover:border-barao-rose/50 hover:bg-barao-rose/10 hover:text-barao-rose text-zinc-400 text-xs tracking-wider rounded-sm transition font-mono uppercase"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Hobbies Field */}
                          <div className="space-y-2 text-left">
                            <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Hobbies</label>
                            <span className="block text-[9px] text-zinc-500 leading-snug font-light font-light">O que acalma ou inspira o seu tempo livre.</span>
                            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px] items-center">
                              {(!profile.hobbies || profile.hobbies.length === 0) && (
                                <span className="text-[10px] text-zinc-650 italic font-light">Nenhum hobby adicionado</span>
                              )}
                              {profile.hobbies?.map((hobby, hIdx) => (
                                <span key={hobby + hIdx} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-zinc-900 border border-white/5 text-[10px] text-zinc-300">
                                  <span>{hobby}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const filtered = profile.hobbies?.filter((_, i) => i !== hIdx) || [];
                                      saveProfile({ ...profile, hobbies: filtered });
                                    }}
                                    className="text-zinc-500 hover:text-red-400 font-bold ml-1 text-xs"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newHobbyText}
                                onChange={(e) => setNewHobbyText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (newHobbyText.trim()) {
                                      const current = profile.hobbies || [];
                                      saveProfile({ ...profile, hobbies: [...current, newHobbyText.trim()] });
                                      setNewHobbyText("");
                                    }
                                  }
                                }}
                                placeholder="Ex: Leitura, Violoncelo, Fotografia..."
                                className="flex-1 bg-[#050505] border border-white/10 hover:border-white/20 focus:border-barao-rose/60 focus:ring-1 focus:ring-barao-rose/25 text-xs h-9 px-3.5 tracking-wide text-zinc-200 placeholder-zinc-650 rounded-sm outline-none transition"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (newHobbyText.trim()) {
                                    const current = profile.hobbies || [];
                                    saveProfile({ ...profile, hobbies: [...current, newHobbyText.trim()] });
                                    setNewHobbyText("");
                                  }
                                }}
                                className="px-3 h-9 bg-zinc-900 border border-white/10 hover:border-barao-rose/50 hover:bg-barao-rose/10 hover:text-barao-rose text-zinc-400 text-xs tracking-wider rounded-sm transition font-mono uppercase"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                          {/* Mais Idiomas Field */}
                          <div className="space-y-2 text-left">
                            <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Mais Idiomas (Opcional)</label>
                            <span className="block text-[9px] text-zinc-500 leading-snug font-light">Outras línguas que você costuma falar ou compreender.</span>
                            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px] items-center">
                              {(!profile.maisIdiomas || profile.maisIdiomas.length === 0) && (
                                <span className="text-[10px] text-zinc-600 italic font-light">Nenhum idioma de sintonia adicional</span>
                              )}
                              {profile.maisIdiomas?.map((lang, lIdx) => (
                                <span key={lang + lIdx} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-zinc-900 border border-white/5 text-[10px] text-zinc-300">
                                  <span>{lang}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const filtered = profile.maisIdiomas?.filter((_, i) => i !== lIdx) || [];
                                      saveProfile({ ...profile, maisIdiomas: filtered });
                                    }}
                                    className="text-zinc-500 hover:text-red-400 font-bold ml-1 text-xs"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newLanguageText}
                                onChange={(e) => setNewLanguageText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (newLanguageText.trim()) {
                                      const current = profile.maisIdiomas || [];
                                      saveProfile({ ...profile, maisIdiomas: [...current, newLanguageText.trim()] });
                                      setNewLanguageText("");
                                    }
                                  }
                                }}
                                placeholder="Ex: Inglês, Francês, Italiano..."
                                className="flex-1 bg-[#050505] border border-white/10 hover:border-white/20 focus:border-barao-rose/60 focus:ring-1 focus:ring-barao-rose/25 text-xs h-9 px-3.5 tracking-wide text-zinc-200 placeholder-zinc-650 rounded-sm outline-none transition"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (newLanguageText.trim()) {
                                    const current = profile.maisIdiomas || [];
                                    saveProfile({ ...profile, maisIdiomas: [...current, newLanguageText.trim()] });
                                    setNewLanguageText("");
                                  }
                                }}
                                className="px-3 h-9 bg-zinc-900 border border-white/10 hover:border-barao-rose/50 hover:bg-barao-rose/10 hover:text-barao-rose text-zinc-400 text-xs tracking-wider rounded-sm transition font-mono uppercase"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Objetivos ao Usar o Barão Field */}
                          <div className="space-y-2 text-left">
                            <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Objetivo ao usar o Barão</label>
                            <span className="block text-[9px] text-zinc-500 leading-snug font-light">Selecione suas intenções de conexão (Múltipla escolha).</span>
                            <div className="flex flex-wrap gap-1.5 pt-1.5">
                              {[
                                "Companhia",
                                "Autoconhecimento",
                                "Desenvolvimento emocional",
                                "Sexualidade",
                                "Relacionamentos",
                                "Espiritualidade",
                                "Entretenimento",
                                "Crescimento pessoal"
                              ].map((item) => {
                                const isSelected = profile.objetivosBarao?.includes(item);
                                return (
                                  <button
                                    key={item}
                                    type="button"
                                    onClick={() => {
                                      const current = profile.objetivosBarao || [];
                                      const next = current.includes(item)
                                        ? current.filter(x => x !== item)
                                        : [...current, item];
                                      saveProfile({ ...profile, objetivosBarao: next });
                                    }}
                                    className={`px-2.5 py-1 text-[10px] border rounded-sm transition-all duration-200 ${
                                      isSelected
                                        ? "bg-barao-rose/15 border-barao-rose text-white shadow-sm shadow-barao-rose/5"
                                        : "bg-[#050505] border-white/5 text-zinc-400 hover:text-zinc-250 hover:border-white/15"
                                    }`}
                                  >
                                    {item}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Como gosta de ser tratada Field */}
                        <div className="border-t border-white/5 pt-4 mt-4 space-y-2 text-left">
                          <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Como gosta de ser tratada</label>
                          <span className="block text-[9px] text-zinc-500 leading-snug font-light font-sans">Selecione suas preferências de interação com o Barão (Máximo 3 escolhas).</span>
                          <div className="flex flex-wrap gap-1.5 pt-1.5 font-sans">
                            {[
                              "Acolhida",
                              "Inspirada",
                              "Desafiada",
                              "Provocada intelectualmente",
                              "Romantizada",
                              "Guiada",
                              "Ouvida"
                            ].map((item) => {
                              const isSelected = profile.comoGostaDeSerTratada?.includes(item);
                              return (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() => {
                                    const current = profile.comoGostaDeSerTratada || [];
                                    let next = [...current];
                                    if (isSelected) {
                                      next = next.filter(x => x !== item);
                                    } else {
                                      if (current.length >= 3) {
                                        return;
                                      }
                                      next.push(item);
                                    }
                                    saveProfile({ ...profile, comoGostaDeSerTratada: next });
                                  }}
                                  className={`px-2.5 py-1 text-[10px] border rounded-sm transition-all duration-200 ${
                                    isSelected
                                      ? "bg-barao-rose/15 border-barao-rose text-white shadow-sm shadow-barao-rose/5"
                                      : "bg-[#050505] border-white/5 text-zinc-400 hover:text-zinc-250 hover:border-white/15"
                                  }`}
                                >
                                  {item}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Esportes Field */}
                        <div className="border-t border-white/5 pt-4 mt-4 space-y-2 text-left">
                          <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Esportes</label>
                          <span className="block text-[9px] text-zinc-500 leading-snug font-light font-sans">Quais atividades físicas e esportes fazem parte da sua rotina e bem-estar.</span>
                          <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px] items-center font-sans">
                            {(!profile.esportes || profile.esportes.length === 0) && (
                              <span className="text-[10px] text-zinc-650 italic font-light">Nenhum esporte ou atividade física adicionada</span>
                            )}
                            {profile.esportes?.map((sport, sIdx) => (
                              <span key={sport + sIdx} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-zinc-900 border border-white/5 text-[10px] text-zinc-300">
                                <span>{sport}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const filtered = profile.esportes?.filter((_, i) => i !== sIdx) || [];
                                    saveProfile({ ...profile, esportes: filtered });
                                  }}
                                  className="text-zinc-500 hover:text-red-400 font-bold ml-1 text-xs"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2 max-w-md font-sans">
                            <input
                              type="text"
                              value={newSportText}
                              onChange={(e) => setNewSportText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (newSportText.trim()) {
                                    const current = profile.esportes || [];
                                    saveProfile({ ...profile, esportes: [...current, newSportText.trim()] });
                                    setNewSportText("");
                                  }
                                }
                              }}
                              placeholder="Ex: Yoga, Natação, Pilates, Corrida..."
                              className="flex-1 bg-[#050505] border border-white/10 hover:border-white/20 focus:border-barao-rose/60 focus:ring-1 focus:ring-barao-rose/25 text-xs h-9 px-3.5 tracking-wide text-zinc-200 placeholder-zinc-650 rounded-sm outline-none transition"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                  if (newSportText.trim()) {
                                    const current = profile.esportes || [];
                                    saveProfile({ ...profile, esportes: [...current, newSportText.trim()] });
                                    setNewSportText("");
                                  }
                              }}
                              className="px-3 h-9 bg-zinc-900 border border-white/10 hover:border-barao-rose/50 hover:bg-barao-rose/10 hover:text-barao-rose text-zinc-400 text-xs tracking-wider rounded-sm transition font-mono uppercase"
                            >
                              +
                            </button>
                          </div>
                        </div>

                      </div>

                      {/* Seu Retrato / Foto de Perfil */}
                      <div className="col-span-1 sm:col-span-2 border-t border-white/5 pt-5 mt-3 space-y-4">
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-barao-rose font-bold">
                          Retrato de Sintonia / Foto de Perfil
                        </label>
                        <div className="flex flex-col sm:flex-row items-center gap-6 bg-[#040404] p-4 border border-white/5 rounded-sm">
                          {/* Current Avatar Circle Preview */}
                          <div className="flex flex-col items-center gap-1.5 shrink-0">
                            {renderAvatarSvgOrImg(profile.avatarUrl, (profile.nickname || profile.name || "U").slice(0, 1), "w-16 h-16 rounded-sm shadow-md")}
                            <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">Sua Sintonia</span>
                          </div>

                          {/* Controls */}
                          <div className="space-y-4 w-full text-left">
                            {/* Presets Selection */}
                            <div className="space-y-1.5">
                              <span className="block text-[10px] font-mono text-zinc-400">Gostaria de sintonizar com um retrato espiritual (Atmosferas)?</span>
                              <div className="flex flex-wrap gap-2.5">
                                {[
                                  { id: "preset:velvet", name: "Veludo Escarlate", color: "from-[#3a0614] to-[#8c183b]" },
                                  { id: "preset:night", name: "Noite Estrelada", color: "from-[#051125] to-[#1a3a6e]" },
                                  { id: "preset:nebula", name: "Névoa Celestial", color: "from-[#190a2a] to-[#552780]" },
                                  { id: "preset:gold", name: "Sombra Áurea", color: "from-[#1f1b0a] to-[#605221]" },
                                  { id: "preset:smoke", name: "Silêncio de Cinzas", color: "from-[#121212] to-[#404040]" },
                                ].map((item) => (
                                  <button
                                    key={item.id}
                                    onClick={() => saveProfile({ ...profile, avatarUrl: item.id })}
                                    className={`w-9 h-9 rounded-sm bg-gradient-to-tr ${item.color} border transition-all ${
                                      profile.avatarUrl === item.id ? "border-barao-rose scale-110 shadow-md shadow-barao-rose/25" : "border-white/10 hover:border-white/30"
                                    }`}
                                    title={item.name}
                                    type="button"
                                  />
                                ))}
                              </div>
                            </div>

                            {/* Custom File Upload */}
                            <div className="space-y-1.5">
                              <span className="block text-[10px] font-mono text-zinc-400">Ou sintonizar com um retrato terrestre (Upload de foto):</span>
                              <div className="flex flex-wrap items-center gap-3">
                                <input
                                  type="file"
                                  accept="image/*"
                                  id="avatar-upload"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      // Comprime antes de salvar: garante que a foto
                                      // passe pelos limites de envio da Vercel (4,5MB)
                                      compressImageFile(file, 800).then(compressed => {
                                        saveProfile({ ...profile, avatarUrl: compressed });
                                      }).catch(() => {});
                                    }
                                  }}
                                  className="hidden"
                                />
                                <label
                                  htmlFor="avatar-upload"
                                  className="px-3 py-1.5 bg-[#0a0a0a] border border-white/10 hover:border-barao-rose/50 hover:text-white transition-all text-[9px] font-mono uppercase tracking-widest rounded-sm cursor-pointer inline-block"
                                >
                                  Carregar Foto
                                </label>
                                
                                {profile.avatarUrl && (
                                  <button
                                    onClick={() => saveProfile({ ...profile, avatarUrl: undefined })}
                                    className="px-3 py-1.5 bg-[#0a0a0a]/40 border border-red-950/40 text-red-400 hover:bg-red-950/20 transition-all text-[9px] font-mono uppercase tracking-widest rounded-sm"
                                    type="button"
                                  >
                                    Limpar Retrato
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: ENERGIA ATUAL */}
                  {stepIndex === 1 && (
                    <div className="space-y-6">
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-mono uppercase text-zinc-500 tracking-wider">“Como você tem se sentido ultimamente?” (Selecione vários)</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {energyOptions.map((opt) => {
                            const active = profile.energyStatus?.includes(opt);
                            return (
                              <button
                                key={opt}
                                onClick={() => handleToggleOption("energyStatus", opt)}
                                className={`px-3 py-1.5 text-xs border rounded-full transition-all duration-300 ${
                                  active
                                    ? "bg-barao-rose/15 border-barao-rose text-barao-rose"
                                    : "bg-black/50 border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <h4 className="text-xs font-mono uppercase text-zinc-500 tracking-wider">“O que mais está faltando na sua vida hoje?”</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {lackOptions.map((opt) => {
                            const active = profile.missingInLife?.includes(opt);
                            return (
                              <button
                                key={opt}
                                onClick={() => handleToggleOption("missingInLife", opt)}
                                className={`px-3 py-1.5 text-xs border rounded-full transition-all duration-300 ${
                                  active
                                    ? "bg-barao-gold/10 border-barao-gold/50 text-barao-gold"
                                    : "bg-black/50 border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Sonhos Field */}
                      <div className="border-t border-white/5 pt-5 mt-4 space-y-4 text-left">
                        <div>
                          <h4 className="text-xs font-mono uppercase text-barao-rose tracking-wider font-bold">Sonhos</h4>
                          <span className="block text-[9px] text-zinc-500 leading-snug font-sans font-light">Suas projeções e maiores anseios em múltiplas dimensões da sua jornada.</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">Maior sonho pessoal</label>
                            <textarea
                              value={profile.sonhoPessoal || ""}
                              onChange={(e) => saveProfile({ ...profile, sonhoPessoal: e.target.value })}
                              placeholder="Seu florescer e evolução de vida..."
                              className="w-full bg-[#050505] border border-white/10 hover:border-white/20 focus:border-barao-rose/60 text-xs h-20 p-2.5 tracking-wide text-zinc-200 placeholder-zinc-700 rounded-sm outline-none transition resize-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">Maior sonho profissional</label>
                            <textarea
                              value={profile.sonhoProfissional || ""}
                              onChange={(e) => saveProfile({ ...profile, sonhoProfissional: e.target.value })}
                              placeholder="Trunfos, saberes e realizações..."
                              className="w-full bg-[#050505] border border-white/10 hover:border-white/20 focus:border-barao-rose/60 text-xs h-20 p-2.5 tracking-wide text-zinc-200 placeholder-zinc-700 rounded-sm outline-none transition resize-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">Maior sonho afetivo</label>
                            <textarea
                              value={profile.sonhoAfetivo || ""}
                              onChange={(e) => saveProfile({ ...profile, sonhoAfetivo: e.target.value })}
                              placeholder="Relações, conexões ou parcerias de alma..."
                              className="w-full bg-[#050505] border border-white/10 hover:border-white/20 focus:border-barao-rose/60 text-xs h-20 p-2.5 tracking-wide text-zinc-200 placeholder-zinc-700 rounded-sm outline-none transition resize-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Medos Field */}
                      <div className="border-t border-white/5 pt-5 mt-4 space-y-4 text-left">
                        <div>
                          <h4 className="text-xs font-mono uppercase text-barao-rose tracking-wider font-bold">Medos</h4>
                          <span className="block text-[9px] text-zinc-500 leading-snug font-sans font-light">As sombras do hoje e as preocupações que rondam seu silêncio.</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">Maior medo atual</label>
                            <textarea
                              value={profile.medoAtual || ""}
                              onChange={(e) => saveProfile({ ...profile, medoAtual: e.target.value })}
                              placeholder="O que mais assusta ou estagna seus passos no momento..."
                              className="w-full bg-[#050505] border border-white/10 hover:border-white/20 focus:border-barao-rose/60 text-xs h-20 p-2.5 tracking-wide text-zinc-200 placeholder-zinc-700 rounded-sm outline-none transition resize-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">O que mais a preocupa hoje</label>
                            <textarea
                              value={profile.preocupacaoHoje || ""}
                              onChange={(e) => saveProfile({ ...profile, preocupacaoHoje: e.target.value })}
                              placeholder="Seus maiores questionamentos ou incertezas cotidianas..."
                              className="w-full bg-[#050505] border border-white/10 hover:border-white/20 focus:border-barao-rose/60 text-xs h-20 p-2.5 tracking-wide text-zinc-200 placeholder-zinc-700 rounded-sm outline-none transition resize-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* O Que Sente Falta Field */}
                      <div className="border-t border-white/5 pt-5 mt-4 space-y-2 text-left">
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">O que sente falta</label>
                        <span className="block text-[9px] text-zinc-500 leading-snug font-sans font-light">Selecione o que mais faz falta em seu coração no momento corrente (Máximo 3 escolhas).</span>
                        <div className="flex flex-wrap gap-1.5 pt-1.5 font-sans">
                          {[
                            "Carinho",
                            "Romance",
                            "Admiração",
                            "Companhia",
                            "Paixão",
                            "Segurança emocional",
                            "Liberdade",
                            "Diversão",
                            "Propósito"
                          ].map((item) => {
                            const isSelected = profile.oQueSenteFalta?.includes(item);
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => {
                                  const current = profile.oQueSenteFalta || [];
                                  let next = [...current];
                                  if (isSelected) {
                                    next = next.filter(x => x !== item);
                                  } else {
                                    if (current.length >= 3) return;
                                    next.push(item);
                                  }
                                  saveProfile({ ...profile, oQueSenteFalta: next });
                                }}
                                className={`px-2.5 py-1 text-[10px] border rounded-sm transition-all duration-200 ${
                                  isSelected
                                    ? "bg-barao-rose/15 border-barao-rose text-white shadow-sm shadow-barao-rose/5"
                                    : "bg-[#050505] border-white/5 text-zinc-400 hover:text-zinc-250 hover:border-white/15"
                                }`}
                              >
                                {item}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Valores Field */}
                      <div className="border-t border-white/5 pt-5 mt-4 space-y-2 text-left">
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Valores, o que mais valoriza nas pessoas</label>
                        <span className="block text-[9px] text-zinc-500 leading-snug font-sans font-light">Os pilares e virtudes que constroem conexões duradouras em seu horizonte (Máximo 3 escolhas).</span>
                        <div className="flex flex-wrap gap-1.5 pt-1.5 font-sans">
                          {[
                            "Honestidade",
                            "Inteligência",
                            "Lealdade",
                            "Humor",
                            "Espiritualidade",
                            "Ambição",
                            "Gentileza",
                            "Coragem"
                          ].map((item) => {
                            const isSelected = profile.valoresPessoas?.includes(item);
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => {
                                  const current = profile.valoresPessoas || [];
                                  let next = [...current];
                                  if (isSelected) {
                                    next = next.filter(x => x !== item);
                                  } else {
                                    if (current.length >= 3) return;
                                    next.push(item);
                                  }
                                  saveProfile({ ...profile, valoresPessoas: next });
                                }}
                                className={`px-2.5 py-1 text-[10px] border rounded-sm transition-all duration-200 ${
                                  isSelected
                                    ? "bg-barao-gold/15 border-barao-gold/50 text-white shadow-sm shadow-barao-gold/5"
                                    : "bg-[#050505] border-white/5 text-zinc-400 hover:text-zinc-250 hover:border-white/15"
                                }`}
                              >
                                {item}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Arquétipo Predominante Field */}
                      <div className="border-t border-white/5 pt-5 mt-4 space-y-2 text-left">
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Arquétipo predominante</label>
                        <span className="block text-[9px] text-zinc-500 leading-snug font-sans font-light">Selecione a energia que melhor define sua postura existencial central (Escolha única).</span>
                        <div className="flex flex-wrap gap-1.5 pt-1.5 font-sans">
                          {[
                            "Executiva",
                            "Artista",
                            "Intelectual",
                            "Curadora",
                            "Espiritual",
                            "Exploradora",
                            "Sensual",
                            "Visionária"
                          ].map((item) => {
                            const isSelected = profile.arquetipoPredominante === item;
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => {
                                  saveProfile({ ...profile, arquetipoPredominante: isSelected ? "" : item });
                                }}
                                className={`px-2.5 py-1 text-[10px] border rounded-sm transition-all duration-200 ${
                                  isSelected
                                    ? "bg-barao-rose/20 border-barao-rose text-white shadow-sm shadow-barao-rose/5 font-medium"
                                    : "bg-[#050505] border-white/5 text-zinc-400 hover:text-zinc-250 hover:border-white/15"
                                }`}
                              >
                                {item}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: PERSONALIDADE */}
                  {stepIndex === 2 && (
                    <div className="space-y-6">
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-mono uppercase text-zinc-500 tracking-wider">“Você se identifica mais com…”</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {personalityOptions.map((opt) => {
                            const active = profile.personalityTraits?.includes(opt);
                            return (
                              <button
                                key={opt}
                                onClick={() => handleToggleOption("personalityTraits", opt)}
                                className={`px-3 py-1.5 text-xs border rounded-full transition-all duration-300 ${
                                  active
                                    ? "bg-barao-rose/15 border-barao-rose text-barao-rose"
                                    : "bg-black/50 border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <h4 className="text-xs font-mono uppercase text-zinc-500 tracking-wider">“Quando algo machuca você, normalmente…”</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {hurtingOptions.map((opt) => {
                            const active = profile.reactionToPain?.includes(opt);
                            return (
                              <button
                                key={opt}
                                onClick={() => handleToggleOption("reactionToPain", opt)}
                                className={`px-3 py-1.5 text-xs border rounded-full transition-all duration-300 ${
                                  active
                                    ? "bg-barao-gold/10 border-barao-gold/50 text-barao-gold"
                                    : "bg-black/50 border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Relação com a sexualidade */}
                      <div className="border-t border-white/5 pt-4 mt-4 space-y-2 text-left">
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Relação com a sexualidade</label>
                        <span className="block text-[9px] text-zinc-500 leading-snug font-light font-sans">Como você descreveria sua relação íntima com a própria sexualidade (Escolha única).</span>
                        <div className="flex flex-wrap gap-1.5 pt-1.5 font-sans">
                          {[
                            "Muito confortável",
                            "Confortável",
                            "Em descoberta",
                            "Insegura",
                            "Bloqueada"
                          ].map((item) => {
                            const isSelected = profile.relacaoSexualidade === item;
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => {
                                  saveProfile({ ...profile, relacaoSexualidade: isSelected ? "" : item });
                                }}
                                className={`px-2.5 py-1 text-[10px] border rounded-sm transition-all duration-200 ${
                                  isSelected
                                    ? "bg-barao-rose/20 border-barao-rose text-white shadow-sm shadow-barao-rose/5 font-medium"
                                    : "bg-[#050505] border-white/5 text-zinc-400 hover:text-zinc-250 hover:border-white/15"
                                }`}
                              >
                                {item}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* O que deseja desenvolver em sua sexualidade */}
                      <div className="border-t border-white/5 pt-4 mt-4 space-y-2 text-left">
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">O que deseja desenvolver em sua sexualidade</label>
                        <span className="block text-[9px] text-zinc-500 leading-snug font-light font-sans">Áreas da intimidade e vivência que você gostaria de expandir ou ressignificar (Máximo 3 escolhas).</span>
                        <div className="flex flex-wrap gap-1.5 pt-1.5 font-sans">
                          {[
                            "Sensualidade",
                            "Autoestima",
                            "Prazer",
                            "Intimidade",
                            "Comunicação",
                            "Conexão emocional",
                            "Espiritualidade"
                          ].map((item) => {
                            const isSelected = profile.desejoDesenvolverSexualidade?.includes(item);
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => {
                                  const current = profile.desejoDesenvolverSexualidade || [];
                                  let next = [...current];
                                  if (isSelected) {
                                    next = next.filter(x => x !== item);
                                  } else {
                                    if (current.length >= 3) return;
                                    next.push(item);
                                  }
                                  saveProfile({ ...profile, desejoDesenvolverSexualidade: next });
                                }}
                                className={`px-2.5 py-1 text-[10px] border rounded-sm transition-all duration-200 ${
                                  isSelected
                                    ? "bg-barao-gold/15 border-barao-gold/50 text-white shadow-sm shadow-barao-gold/5"
                                    : "bg-[#050505] border-white/5 text-zinc-400 hover:text-zinc-250 hover:border-white/15"
                                }`}
                              >
                                {item}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Nível de abertura ao tema sexualidade */}
                      <div className="border-t border-white/5 pt-4 mt-4 space-y-2 text-left">
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Nível de abertura ao tema sexualidade</label>
                        <span className="block text-[9px] text-zinc-500 leading-snug font-sans font-light">Seu grau de receptividade e diálogo sobre o assunto em suas interações (Escolha única).</span>
                        <div className="flex flex-wrap gap-1.5 pt-1.5 font-sans">
                          {[
                            "Reservada",
                            "Moderada",
                            "Aberta",
                            "Muito aberta"
                          ].map((item) => {
                            const isSelected = profile.aberturaSexualidade === item;
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => {
                                  saveProfile({ ...profile, aberturaSexualidade: isSelected ? "" : item });
                                }}
                                className={`px-2.5 py-1 text-[10px] border rounded-sm transition-all duration-200 ${
                                  isSelected
                                    ? "bg-barao-rose/20 border-barao-rose text-white shadow-sm shadow-barao-rose/5 font-medium"
                                    : "bg-[#050505] border-white/5 text-zinc-400 hover:text-zinc-250 hover:border-white/15"
                                }`}
                              >
                                {item}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Como prefere abordar o tema sexualidade */}
                      <div className="border-t border-white/5 pt-4 mt-4 space-y-2 text-left">
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Como prefere abordar o tema sexualidade</label>
                        <span className="block text-[9px] text-zinc-500 leading-snug font-sans font-light">O tom ou linguagem preferencial que sintoniza com sua receptividade em diálogos (Escolha única).</span>
                        <div className="flex flex-wrap gap-1.5 pt-1.5 font-sans">
                          {[
                            "Científica",
                            "Terapêutica",
                            "Romântica",
                            "Espiritual",
                            "Sensual elegante",
                            "Apimentado"
                          ].map((item) => {
                            const isSelected = profile.abordagemSexualidade === item;
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => {
                                  saveProfile({ ...profile, abordagemSexualidade: isSelected ? "" : item });
                                }}
                                className={`px-2.5 py-1 text-[10px] border rounded-sm transition-all duration-200 ${
                                  isSelected
                                    ? "bg-barao-gold/15 border-barao-gold/50 text-white shadow-sm shadow-barao-gold/5 font-medium"
                                    : "bg-[#050505] border-white/5 text-zinc-400 hover:text-zinc-250 hover:border-white/15"
                                }`}
                              >
                                {item}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: CONEXÕES */}
                  {stepIndex === 3 && (
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <h4 className="text-xs font-mono uppercase text-zinc-500 tracking-wider">“O que mais faz você se conectar emocionalmente?”</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {connectionOptions.map((opt) => {
                            const active = profile.connectionTriggers?.includes(opt);
                            return (
                              <button
                                key={opt}
                                onClick={() => handleToggleOption("connectionTriggers", opt)}
                                className={`px-2.5 py-1 text-xs border rounded-sm transition-all duration-300 ${
                                  active
                                    ? "bg-barao-rose/15 border-barao-rose text-barao-rose"
                                    : "bg-black/50 border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-xs font-mono uppercase text-zinc-500 tracking-wider">“O que mais machuca você numa conexão?”</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {connectionHurtsOptions.map((opt) => {
                            const active = profile.connectionHurts?.includes(opt);
                            return (
                              <button
                                key={opt}
                                onClick={() => handleToggleOption("connectionHurts", opt)}
                                className={`px-2.5 py-1 text-xs border rounded-sm transition-all duration-300 ${
                                  active
                                    ? "bg-[#180909] border-red-500/30 text-rose-300"
                                    : "bg-black/50 border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-xs font-mono uppercase text-zinc-500 tracking-wider">“Você costuma…”</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {attachmentOptions.map((opt) => {
                            const active = profile.attachmentStyle?.includes(opt);
                            return (
                              <button
                                key={opt}
                                onClick={() => handleToggleOption("attachmentStyle", opt)}
                                className={`px-2.5 py-1 text-xs border rounded-sm transition-all duration-300 ${
                                  active
                                    ? "bg-barao-gold/10 border-barao-gold/50 text-barao-gold"
                                    : "bg-black/50 border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 5: EXPERIÊNCIA IA */}
                  {stepIndex === 4 && (
                    <div className="space-y-6">
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-mono uppercase text-zinc-500 tracking-wider">“O que você busca em sua essência aqui?”</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {goalOptions.map((opt) => {
                            const active = profile.aiGoal?.includes(opt);
                            return (
                              <button
                                key={opt}
                                onClick={() => handleToggleOption("aiGoal", opt)}
                                className={`px-3 py-1.5 text-xs border rounded-full transition-all duration-300 ${
                                  active
                                    ? "bg-barao-rose/15 border-barao-rose text-barao-rose"
                                    : "bg-black/50 border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <h4 className="text-xs font-mono uppercase text-zinc-500 tracking-wider">“Como prefere que eu me comunique com você?”</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {voiceOptions.map((opt) => {
                            const active = profile.aiVoiceTone?.includes(opt);
                            return (
                              <button
                                key={opt}
                                onClick={() => handleToggleOption("aiVoiceTone", opt)}
                                className={`px-3 py-1.5 text-xs border rounded-full transition-all duration-300 ${
                                  active
                                    ? "bg-barao-gold/10 border-barao-gold/50 text-barao-gold"
                                    : "bg-black/50 border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 6: MÚSICA */}
                  {stepIndex === 5 && (
                    <div className="space-y-6">
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-mono uppercase text-zinc-500 tracking-wider">“Quais estilos musicais mais combinam com você?”</h4>
                        <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                          {musicOptions.map((opt) => {
                            const active = profile.musicStyles?.includes(opt);
                            return (
                              <button
                                key={opt}
                                onClick={() => handleToggleOption("musicStyles", opt)}
                                className={`px-2.5 py-1 text-xs border rounded-sm transition-all duration-300 ${
                                  active
                                    ? "bg-barao-rose/15 border-barao-rose text-barao-rose"
                                    : "bg-black/50 border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <h4 className="text-xs font-mono uppercase text-zinc-500 tracking-wider">“Qual atmosfera musical mais parece sua energia?”</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {musicAtmoOptions.map((opt) => {
                            const active = profile.musicAtmosphere?.includes(opt);
                            return (
                              <button
                                key={opt}
                                onClick={() => handleToggleOption("musicAtmosphere", opt)}
                                className={`px-3 py-1.5 text-xs border rounded-sm transition-all duration-300 ${
                                  active
                                    ? "bg-barao-gold/10 border-barao-gold/50 text-barao-gold"
                                    : "bg-black/50 border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Artista ou Banda Favorita */}
                      <div className="border-t border-white/5 pt-5 space-y-2.5 text-left">
                        <h4 className="text-xs font-mono uppercase text-zinc-400 tracking-wider font-bold">Artista ou Banda Favorita</h4>
                        <span className="block text-[9px] text-zinc-500 leading-snug font-light">Adicione os artistas, compositores ou bandas que definem sua trilha sonora.</span>
                        <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px] items-center">
                          {(!profile.favoriteArtists || profile.favoriteArtists.length === 0) && (
                            <span className="text-[10px] text-zinc-600 italic font-light">Nenhum artista adicionado</span>
                          )}
                          {profile.favoriteArtists?.map((art, aIdx) => (
                            <span key={art + aIdx} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-zinc-900 border border-white/5 text-[10px] text-zinc-300 animate-fade-in">
                              <span>{art}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const filtered = profile.favoriteArtists?.filter((_, i) => i !== aIdx) || [];
                                  saveProfile({ ...profile, favoriteArtists: filtered });
                                }}
                                className="text-zinc-500 hover:text-red-400 font-bold ml-1 text-xs"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newArtistText}
                            onChange={(e) => setNewArtistText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newArtistText.trim()) {
                                  const current = profile.favoriteArtists || [];
                                  if (!current.includes(newArtistText.trim())) {
                                    saveProfile({ ...profile, favoriteArtists: [...current, newArtistText.trim()] });
                                  }
                                  setNewArtistText("");
                                }
                              }
                            }}
                            placeholder="Ex: Fleetwood Mac, Lana Del Rey, Chopin..."
                            className="flex-1 bg-[#050505] border border-white/10 hover:border-white/20 focus:border-barao-rose/60 focus:ring-1 focus:ring-barao-rose/25 text-xs h-9 px-3.5 tracking-wide text-zinc-200 placeholder-zinc-700 rounded-sm outline-none transition"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newArtistText.trim()) {
                                const current = profile.favoriteArtists || [];
                                if (!current.includes(newArtistText.trim())) {
                                  saveProfile({ ...profile, favoriteArtists: [...current, newArtistText.trim()] });
                                }
                                setNewArtistText("");
                              }
                            }}
                            className="px-3 h-9 bg-zinc-900 border border-white/10 hover:border-barao-rose/50 hover:bg-barao-rose/10 hover:text-barao-rose text-zinc-400 text-xs tracking-wider rounded-sm transition font-mono uppercase"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Música Mais Marcante */}
                      <div className="border-t border-white/5 pt-5 space-y-2.5 text-left">
                        <h4 className="text-xs font-mono uppercase text-zinc-400 tracking-wider font-bold">Música Mais Marcante da Minha Vida</h4>
                        <span className="block text-[9px] text-zinc-500 leading-snug font-light">As melodias ou canções que guardam memórias indeléveis da sua jornada.</span>
                        <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px] items-center">
                          {(!profile.favoriteSongs || profile.favoriteSongs.length === 0) && (
                            <span className="text-[10px] text-zinc-600 italic font-light">Nenhuma música adicionada</span>
                          )}
                          {profile.favoriteSongs?.map((song, sIdx) => (
                            <span key={song + sIdx} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-zinc-900 border border-white/5 text-[10px] text-zinc-300 animate-fade-in">
                              <span>{song}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const filtered = profile.favoriteSongs?.filter((_, i) => i !== sIdx) || [];
                                  saveProfile({ ...profile, favoriteSongs: filtered });
                                }}
                                className="text-zinc-500 hover:text-red-400 font-bold ml-1 text-xs"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newSongText}
                            onChange={(e) => setNewSongText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newSongText.trim()) {
                                  const current = profile.favoriteSongs || [];
                                  if (!current.includes(newSongText.trim())) {
                                    saveProfile({ ...profile, favoriteSongs: [...current, newSongText.trim()] });
                                  }
                                  setNewSongText("");
                                }
                              }
                            }}
                            placeholder="Ex: Vienna, Landslide, Clair de Lune..."
                            className="flex-1 bg-[#050505] border border-white/10 hover:border-white/20 focus:border-barao-rose/60 focus:ring-1 focus:ring-barao-rose/25 text-xs h-9 px-3.5 tracking-wide text-zinc-200 placeholder-zinc-700 rounded-sm outline-none transition"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newSongText.trim()) {
                                const current = profile.favoriteSongs || [];
                                if (!current.includes(newSongText.trim())) {
                                  saveProfile({ ...profile, favoriteSongs: [...current, newSongText.trim()] });
                                }
                                setNewSongText("");
                              }
                            }}
                            className="px-3 h-9 bg-zinc-900 border border-white/10 hover:border-barao-rose/50 hover:bg-barao-rose/10 hover:text-barao-rose text-zinc-400 text-xs tracking-wider rounded-sm transition font-mono uppercase"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 7: FILMES E ESTÉTICA */}
                  {stepIndex === 6 && (
                    <div className="space-y-6">
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-mono uppercase text-zinc-500 tracking-wider">“Quais estilos de filmes mais mexem com você?”</h4>
                        <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                          {filmOptions.map((opt) => {
                            const active = profile.movieStyles?.includes(opt);
                            return (
                              <button
                                key={opt}
                                onClick={() => handleToggleOption("movieStyles", opt)}
                                className={`px-2.5 py-1 text-xs border rounded-sm transition-all duration-300 ${
                                  active
                                    ? "bg-barao-rose/15 border-barao-rose text-barao-rose"
                                    : "bg-black/50 border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <h4 className="text-xs font-mono uppercase text-zinc-500 tracking-wider">“Qual atmosfera visual mais combina com você?”</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {visualOptions.map((opt) => {
                            const active = profile.visualAtmosphere?.includes(opt);
                            return (
                              <button
                                key={opt}
                                onClick={() => handleToggleOption("visualAtmosphere", opt)}
                                className={`px-3 py-1.5 text-xs border rounded-sm transition-all duration-300 ${
                                  active
                                    ? "bg-barao-gold/10 border-barao-gold/50 text-barao-gold"
                                    : "bg-black/50 border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Filmes Mais Marcantes */}
                      <div className="border-t border-white/5 pt-5 space-y-2.5 text-left">
                        <h4 className="text-xs font-mono uppercase text-zinc-400 tracking-wider font-bold">Filmes Mais Marcantes</h4>
                        <span className="block text-[9px] text-zinc-500 leading-snug font-light">As obras da sétima arte que deixaram uma marca profunda em sua perspectiva ou sensibilidade.</span>
                        <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px] items-center font-sans">
                          {(!profile.favoriteMovies || profile.favoriteMovies.length === 0) && (
                            <span className="text-[10px] text-zinc-650 italic font-light font-sans">Nenhum filme adicionado</span>
                          )}
                          {profile.favoriteMovies?.map((movie, mIdx) => (
                            <span key={movie + mIdx} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-zinc-900 border border-white/5 text-[10px] text-zinc-300 animate-fade-in font-sans">
                              <span>{movie}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const filtered = profile.favoriteMovies?.filter((_, i) => i !== mIdx) || [];
                                  saveProfile({ ...profile, favoriteMovies: filtered });
                                }}
                                className="text-zinc-500 hover:text-red-400 font-bold ml-1 text-xs"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newMovieText}
                            onChange={(e) => setNewMovieText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newMovieText.trim()) {
                                  const current = profile.favoriteMovies || [];
                                  if (!current.includes(newMovieText.trim())) {
                                    saveProfile({ ...profile, favoriteMovies: [...current, newMovieText.trim()] });
                                  }
                                  setNewMovieText("");
                                }
                              }
                            }}
                            placeholder="Ex: Interestelar, Antes do Amanhecer, Orgulho e Preconceito..."
                            className="flex-1 bg-[#050505] border border-white/10 hover:border-white/20 focus:border-barao-rose/60 focus:ring-1 focus:ring-barao-rose/25 text-xs h-9 px-3.5 tracking-wide text-zinc-200 placeholder-zinc-700 rounded-sm outline-none transition"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newMovieText.trim()) {
                                const current = profile.favoriteMovies || [];
                                if (!current.includes(newMovieText.trim())) {
                                  saveProfile({ ...profile, favoriteMovies: [...current, newMovieText.trim()] });
                                }
                                setNewMovieText("");
                              }
                            }}
                            className="px-3 h-9 bg-zinc-900 border border-white/10 hover:border-barao-rose/50 hover:bg-barao-rose/10 hover:text-barao-rose text-zinc-400 text-xs tracking-wider rounded-sm transition font-mono uppercase"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Livros Mais Marcantes */}
                      <div className="border-t border-white/5 pt-5 space-y-2.5 text-left">
                        <h4 className="text-xs font-mono uppercase text-zinc-400 tracking-wider font-bold">Livros Mais Marcantes</h4>
                        <span className="block text-[9px] text-zinc-500 leading-snug font-light">As leituras, poesias ou ensaios que esculpiram seu pensamento e enriqueceram seus momentos de reclusão.</span>
                        <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px] items-center font-sans">
                          {(!profile.favoriteBooks || profile.favoriteBooks.length === 0) && (
                            <span className="text-[10px] text-zinc-650 italic font-light font-sans">Nenhum livro adicionado</span>
                          )}
                          {profile.favoriteBooks?.map((book, bIdx) => (
                            <span key={book + bIdx} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-zinc-900 border border-white/5 text-[10px] text-zinc-300 animate-fade-in font-sans">
                              <span>{book}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const filtered = profile.favoriteBooks?.filter((_, i) => i !== bIdx) || [];
                                  saveProfile({ ...profile, favoriteBooks: filtered });
                                }}
                                className="text-zinc-500 hover:text-red-400 font-bold ml-1 text-xs"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newBookText}
                            onChange={(e) => setNewBookText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newBookText.trim()) {
                                  const current = profile.favoriteBooks || [];
                                  if (!current.includes(newBookText.trim())) {
                                    saveProfile({ ...profile, favoriteBooks: [...current, newBookText.trim()] });
                                  }
                                  setNewBookText("");
                                }
                              }
                            }}
                            placeholder="Ex: O Pequeno Príncipe, Siddharta, Mulheres que Correm com os Lobos..."
                            className="flex-1 bg-[#050505] border border-white/10 hover:border-white/20 focus:border-barao-rose/60 focus:ring-1 focus:ring-barao-rose/25 text-xs h-9 px-3.5 tracking-wide text-zinc-200 placeholder-zinc-700 rounded-sm outline-none transition"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newBookText.trim()) {
                                const current = profile.favoriteBooks || [];
                                if (!current.includes(newBookText.trim())) {
                                  saveProfile({ ...profile, favoriteBooks: [...current, newBookText.trim()] });
                                }
                                setNewBookText("");
                              }
                            }}
                            className="px-3 h-9 bg-zinc-900 border border-white/10 hover:border-barao-rose/50 hover:bg-barao-rose/10 hover:text-barao-rose text-zinc-400 text-xs tracking-wider rounded-sm transition font-mono uppercase"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 8: VIAGENS */}
                  {stepIndex === 7 && (
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <h4 className="text-xs font-mono uppercase text-zinc-500 tracking-wider">“Você viaja com frequência?”</h4>
                        <div className="flex gap-1.5 flex-wrap">
                          {["muito", "às vezes", "pouco", "quase nunca", "gostaria de viajar mais"].map((opt) => {
                            const active = profile.travelFrequency === opt;
                            return (
                              <button
                                key={opt}
                                onClick={() => saveProfile({ ...profile, travelFrequency: opt })}
                                className={`px-3 py-1.5 text-xs border rounded-sm transition-all duration-300 ${
                                  active
                                    ? "bg-barao-rose/15 border-barao-rose text-barao-rose"
                                    : "bg-black/50 border-white/5 text-zinc-400 hover:text-white"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-xs font-mono uppercase text-zinc-500 tracking-wider">“Que tipo de lugares mais combinam com você?”</h4>
                        <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                          {placesOptions.map((opt) => {
                            const active = profile.favoritePlaces?.includes(opt);
                            return (
                              <button
                                key={opt}
                                onClick={() => handleToggleOption("favoritePlaces", opt)}
                                className={`px-2.5 py-1 text-xs border rounded-sm transition-all duration-300 ${
                                  active
                                    ? "bg-barao-gold/10 border-barao-gold/50 text-barao-gold"
                                    : "bg-black/50 border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-xs font-mono uppercase text-zinc-500 tracking-wider">“Países que fazem parte da sua história emocional”</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {countriesOptions.map((opt) => {
                            const active = profile.historicalCountries?.includes(opt);
                            return (
                              <button
                                key={opt}
                                onClick={() => handleToggleOption("historicalCountries", opt)}
                                className={`px-2.5 py-1 text-xs border rounded-sm transition-all duration-300 ${
                                  active
                                    ? "bg-barao-rose/15 border-barao-rose text-barao-rose"
                                    : "bg-black/50 border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Lugares que desejo conhecer */}
                      <div className="border-t border-white/5 pt-5 space-y-2.5 text-left">
                        <h4 className="text-xs font-mono uppercase text-zinc-400 tracking-wider font-bold">Lugares que desejo conhecer</h4>
                        <span className="block text-[9px] text-zinc-500 leading-snug font-light">Os destinos, refúgios ou cantos do mundo que despertam sua curiosidade e desejo de desbravar.</span>
                        <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px] items-center font-sans">
                          {(!profile.wishlistPlaces || profile.wishlistPlaces.length === 0) && (
                            <span className="text-[10px] text-zinc-650 italic font-light font-sans">Nenhum lugar adicionado</span>
                          )}
                          {profile.wishlistPlaces?.map((place, pIdx) => (
                            <span key={place + pIdx} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-zinc-900 border border-white/5 text-[10px] text-zinc-300 animate-fade-in font-sans">
                              <span>{place}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const filtered = profile.wishlistPlaces?.filter((_, i) => i !== pIdx) || [];
                                  saveProfile({ ...profile, wishlistPlaces: filtered });
                                }}
                                className="text-zinc-500 hover:text-red-400 font-bold ml-1 text-xs"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newWishlistPlaceText}
                            onChange={(e) => setNewWishlistPlaceText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newWishlistPlaceText.trim()) {
                                  const current = profile.wishlistPlaces || [];
                                  if (!current.includes(newWishlistPlaceText.trim())) {
                                    saveProfile({ ...profile, wishlistPlaces: [...current, newWishlistPlaceText.trim()] });
                                  }
                                  setNewWishlistPlaceText("");
                                }
                              }
                            }}
                            placeholder="Ex: Paris, Kyoto, Patagônia, Aurora Boreal em Tromsø..."
                            className="flex-1 bg-[#050505] border border-white/10 hover:border-white/20 focus:border-barao-rose/60 focus:ring-1 focus:ring-barao-rose/25 text-xs h-9 px-3.5 tracking-wide text-zinc-200 placeholder-zinc-700 rounded-sm outline-none transition"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newWishlistPlaceText.trim()) {
                                const current = profile.wishlistPlaces || [];
                                if (!current.includes(newWishlistPlaceText.trim())) {
                                  saveProfile({ ...profile, wishlistPlaces: [...current, newWishlistPlaceText.trim()] });
                                }
                                setNewWishlistPlaceText("");
                              }
                            }}
                            className="px-3 h-9 bg-zinc-900 border border-white/10 hover:border-barao-rose/50 hover:bg-barao-rose/10 hover:text-barao-rose text-zinc-400 text-xs tracking-wider rounded-sm transition font-mono uppercase"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 9: SABORES */}
                  {stepIndex === 8 && (
                    <div className="space-y-6">
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-mono uppercase text-zinc-500 tracking-wider">“Quais sabores mais trazem conforto e abraço afetivo?”</h4>
                        <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                          {foodOptions.map((opt) => {
                            const active = profile.comfortFoods?.includes(opt);
                            return (
                              <button
                                key={opt}
                                onClick={() => handleToggleOption("comfortFoods", opt)}
                                className={`px-2.5 py-1 text-xs border rounded-sm transition-all duration-300 ${
                                  active
                                    ? "bg-barao-rose/15 border-barao-rose text-barao-rose"
                                    : "bg-black/50 border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <h4 className="text-xs font-mono uppercase text-zinc-500 tracking-wider">“Qual cenário combina com uma noite perfeita para você?”</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {perfectNightOptions.map((opt) => {
                            const active = profile.perfectNight?.includes(opt);
                            return (
                              <button
                                key={opt}
                                onClick={() => handleToggleOption("perfectNight", opt)}
                                className={`px-3 py-1.5 text-xs border rounded-sm transition-all duration-300 ${
                                  active
                                    ? "bg-barao-gold/10 border-barao-gold/50 text-barao-gold"
                                    : "bg-black/50 border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Prato e Drink Favoritos */}
                      <div className="border-t border-white/5 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left font-sans">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Meu prato favorito</label>
                          <span className="block text-[9px] text-zinc-500 leading-snug font-sans font-light">Seu prato ou receita favorita que traz afeto e conforto.</span>
                          <input
                            type="text"
                            value={profile.favoriteDish || ""}
                            onChange={(e) => saveProfile({ ...profile, favoriteDish: e.target.value })}
                            placeholder="Ex: Risoto de cogumelos, lasanha, sushi..."
                            className="w-full bg-[#050505] border border-white/10 hover:border-white/20 focus:border-barao-rose/60 focus:ring-1 focus:ring-barao-rose/25 text-xs h-10 px-3.5 tracking-wide text-zinc-200 placeholder-zinc-700 rounded-sm outline-none transition"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Meu drink favorito</label>
                          <span className="block text-[9px] text-zinc-500 leading-snug font-sans font-light">Sua bebida ou drinque preferido para brindar momentos especiais.</span>
                          <input
                            type="text"
                            value={profile.favoriteDrink || ""}
                            onChange={(e) => saveProfile({ ...profile, favoriteDrink: e.target.value })}
                            placeholder="Ex: Vinho tinto, Gin tônica, Aperol..."
                            className="w-full bg-[#050505] border border-white/10 hover:border-white/20 focus:border-barao-rose/60 focus:ring-1 focus:ring-barao-rose/25 text-xs h-10 px-3.5 tracking-wide text-zinc-200 placeholder-zinc-700 rounded-sm outline-none transition"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 10: ATMOSFERAS */}
                  {stepIndex === 9 && (
                    <div className="space-y-4">
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-mono uppercase text-zinc-500 tracking-wider">Escolha suas Atmosferas Favoritas de Conforto (Multi-seleção)</h4>
                        <p className="text-[11px] text-zinc-500 italic font-serif">
                          Estes elementos agem diretamente no subconsciente sutil das palavras geradas pela inteligência afectuosa do Barão.
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {atmosphereOptions.map((opt) => {
                            const active = profile.favoriteAtmospheres?.includes(opt);
                            return (
                              <button
                                key={opt}
                                onClick={() => handleToggleOption("favoriteAtmospheres", opt)}
                                className={`px-3 py-1.5 text-xs border rounded-full transition-all duration-300 ${
                                  active
                                    ? "bg-barao-rose/20 border-barao-rose text-barao-rose font-medium"
                                    : "bg-black/50 border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                </div>

            {/* Bottom Button Panel */}
            <div className="flex items-center justify-between border-t border-white/5 pt-6 mt-6 z-10">
              <div className="flex items-center gap-2">
                <button
                  disabled={stepIndex === 0}
                  onClick={() => {
                  const target = Math.max(0, stepIndex - 1);
                  setActiveStep(target);
                  if (isMobileMode) {
                    setTimeout(() => {
                      document.getElementById(`step-container-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 150);
                  }
                }}
                  className="px-4 py-2 border border-white/5 bg-black/40 hover:bg-black text-[10px] uppercase font-mono tracking-wider rounded-sm disabled:opacity-30 transition cursor-pointer"
                >
                  Anterior
                </button>
                {saveSuccess && (
                  <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest animate-pulse">
                    ✨ Gravado sutilmente...
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {stepIndex < steps.length - 1 ? (
                  <button
                    onClick={() => {
                  const target = Math.min(steps.length - 1, stepIndex + 1);
                  setActiveStep(target);
                  if (isMobileMode) {
                    setTimeout(() => {
                      document.getElementById(`step-container-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 150);
                  }
                }}
                    className="px-5 py-2.5 bg-barao-rose hover:bg-barao-gold text-black text-[10px] uppercase font-mono tracking-widest font-bold rounded-sm transition flex items-center gap-1.5 active:scale-98 cursor-pointer"
                  >
                    <span>Ir Mais Fundo</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (onTabChange) onTabChange("dialogo");
                    }}
                    className="px-5 py-2.5 bg-barao-gold/90 hover:bg-barao-gold text-black text-[10px] uppercase font-mono tracking-widest font-bold rounded-sm transition flex items-center gap-1.5 active:scale-98 cursor-pointer"
                  >
                    <span>Falar no Abrigo</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
      </motion.div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in text-left">
      
      {/* Constellation Dashboard Header */}
      <div className="bg-[#0b0a0a] border border-white/5 rounded-sm p-6 sm:p-8 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
          <div className="absolute right-0 top-0 w-80 h-80 bg-barao-rose/20 rounded-full blur-[100px]" />
          <div className="absolute left-1/3 bottom-0 w-60 h-60 bg-barao-rose/10 rounded-full blur-[80px]" />
        </div>

        <div className="flex items-center gap-4.5 z-10 max-w-xl">
          {profile.avatarUrl && (
            <div className="shrink-0 p-0.5 rounded-sm border border-barao-rose/30 bg-black animate-fade-in shadow-lg shadow-barao-rose/5">
              {renderAvatarSvgOrImg(profile.avatarUrl, (profile.nickname || profile.name || "U").slice(0, 1), "w-12 h-12 sm:w-16 sm:h-16 rounded-sm")}
            </div>
          )}
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-sm bg-barao-rose/10 border border-barao-rose/20 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.15em] text-barao-rose">
              <Sparkles className="h-3 w-3 animate-pulse" />
              Sintonia Progressiva do Silêncio
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-light text-white tracking-tight">
              Meu Universo
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 font-light leading-relaxed">
              {getPoeticProgress()}
            </p>
          </div>
        </div>

        {/* Orbit Completion Circle */}
        <div className="flex flex-col items-center justify-center shrink-0 z-10 self-center">
          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* SVG Orbit Ring */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                className="stroke-white/5"
                strokeWidth="2"
                fill="transparent"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="40"
                className="stroke-barao-rose"
                strokeWidth="3.5"
                fill="transparent"
                strokeDasharray="251.2"
                initial={{ strokeDashoffset: 251.2 }}
                animate={{ strokeDashoffset: 251.2 - (251.2 * completionPercent) / 100 }}
                transition={{ duration: 1, ease: "easeOut" }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="font-serif text-2xl font-light text-white">{completionPercent}%</span>
              <span className="text-[7.5px] font-mono text-zinc-500 uppercase tracking-widest">Sintonia</span>
            </div>
            {/* Glowing orb node on progress edge */}
            <div className="absolute inset-0 pointer-events-none rounded-full border border-barao-rose/30" />
          </div>
        </div>
      </div>

      {/* Main Two-Column Interactive Core */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Star Navigation Cards List (Progressive) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Subscription Tier & Token Sandbox Card */}
          <div className="bg-[#0b0a0a]/90 border border-barao-rose/20 rounded-sm p-4 text-left space-y-4 immersive-corners">
            <div className="space-y-1">
              <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-barao-rose font-bold block">
                Plano & Moeda de Sintonia
              </span>
              <h4 className="font-serif text-sm font-semibold text-white">Suporte ao Sentir</h4>
            </div>

            {currentUser ? (
              <div className="space-y-3.5">
                {/* Active Info */}
                <div className="p-3 bg-black/40 border border-white/5 rounded-sm space-y-1.5 font-mono text-[10.5px]">
                  <div className="flex justify-between items-center text-zinc-400">
                    <span>Plano Ativo:</span>
                    <span className={`font-serif px-2 py-0.5 rounded-sm border uppercase text-[9px] font-bold ${
                      currentUser.plan === "elite"
                        ? "bg-barao-gold/10 border-barao-gold/30 text-barao-gold"
                        : currentUser.plan === "premium"
                        ? "bg-barao-rose/10 border-barao-rose/30 text-barao-rose"
                        : "bg-zinc-800 border-white/5 text-zinc-400"
                    }`}>
                      {currentUser.plan || "Grátis"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-zinc-350">
                    <span>Disponível:</span>
                    {currentUser.plan === "elite" ? (
                      <span className="text-barao-gold">Infinitos ♾️</span>
                    ) : (
                      <span className="text-white font-bold">
                        {currentUser.tokens !== undefined ? currentUser.tokens : (currentUser.plan === "premium" ? 2500 : 100)} Tokens
                      </span>
                    )}
                  </div>
                </div>

                {/* Sandbox Controls */}
                <div className="space-y-2 pt-1">
                  <span className="block font-mono text-[8px] uppercase tracking-wider text-zinc-500 font-bold">
                    Sandbox de Simulação de Pagamento:
                  </span>
                  
                  {/* Mode Toggles */}
                  <div className="grid grid-cols-3 gap-1.5 text-center text-[9px] font-mono uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => {
                        const updated: User = {
                          ...currentUser,
                          plan: "free",
                          tokens: 100
                        };
                        if (onUserUpdate) onUserUpdate(updated);
                      }}
                      className={`py-1.5 border rounded-sm transition ${
                        currentUser.plan === "free" || !currentUser.plan
                          ? "bg-zinc-800 border-zinc-700 text-white font-bold"
                          : "bg-black border-white/5 text-zinc-500 hover:text-white"
                      }`}
                    >
                      Grátis
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const updated: User = {
                          ...currentUser,
                          plan: "premium",
                          tokens: 2500
                        };
                        if (onUserUpdate) onUserUpdate(updated);
                      }}
                      className={`py-1.5 border rounded-sm transition ${
                        currentUser.plan === "premium"
                          ? "bg-barao-rose/15 border-barao-rose text-barao-rose font-bold"
                          : "bg-black border-white/5 text-zinc-500 hover:text-white"
                      }`}
                    >
                      Premium
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const updated: User = {
                          ...currentUser,
                          plan: "elite",
                          tokens: 9999999
                        };
                        if (onUserUpdate) onUserUpdate(updated);
                      }}
                      className={`py-1.5 border rounded-sm transition ${
                        currentUser.plan === "elite"
                          ? "bg-barao-gold/15 border-barao-gold text-barao-gold font-bold"
                          : "bg-black border-white/5 text-zinc-500 hover:text-white"
                      }`}
                    >
                      Elite
                    </button>
                  </div>

                  {/* Recharge Tokens */}
                  {currentUser.plan !== "elite" && (
                    <button
                      type="button"
                      onClick={() => {
                        const curTokens = currentUser.tokens !== undefined ? currentUser.tokens : (currentUser.plan === "premium" ? 2500 : 100);
                        const updated: User = {
                          ...currentUser,
                          tokens: curTokens + 500
                        };
                        if (onUserUpdate) onUserUpdate(updated);
                      }}
                      className="w-full h-9 border border-barao-rose/30 text-barao-rose hover:bg-barao-rose hover:text-black transition text-[9px] uppercase font-mono font-semibold tracking-wider rounded-sm flex items-center justify-center gap-1 bg-black"
                    >
                      <span>Simular Recarga (+500 Tokens)</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-[11px] font-serif italic text-zinc-400">
                <p>Nenhuma sintonização ativa identificada.</p>
                <p className="text-[10px] font-mono not-italic uppercase tracking-wider text-zinc-500 leading-normal">
                  Festa em modo degustação de visitante. Acesse ou sintonize o abrigo para liberar a economia e os planos.
                </p>
              </div>
            )}
          </div>

          <span className="block font-mono text-[9px] uppercase text-zinc-500 tracking-wider pl-1 mb-1">
            Canais Sintonizáveis ({steps.length})
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
            {steps.map((s, idx) => {
              const isCurrent = idx === activeStep;
              // Check if anything of this step is already filled
              let isDone = false;
              if (idx === 0 && (profile.name || profile.nickname || profile.city || profile.avatarUrl)) isDone = true;
              if (idx === 1 && (profile.energyStatus?.length || profile.missingInLife?.length)) isDone = true;
              if (idx === 2 && (profile.personalityTraits?.length || profile.reactionToPain?.length)) isDone = true;
              if (idx === 3 && (profile.connectionTriggers?.length || profile.connectionHurts?.length || profile.attachmentStyle?.length)) isDone = true;
              if (idx === 4 && (profile.aiGoal?.length || profile.aiVoiceTone?.length)) isDone = true;
              if (idx === 5 && (profile.musicStyles?.length || profile.musicAtmosphere?.length)) isDone = true;
              if (idx === 6 && (profile.movieStyles?.length || profile.visualAtmosphere?.length)) isDone = true;
              if (idx === 7 && (profile.travelFrequency || profile.favoritePlaces?.length || profile.historicalCountries?.length || profile.wishlistPlaces?.length)) isDone = true;
              if (idx === 8 && (profile.comfortFoods?.length || profile.perfectNight?.length || profile.favoriteDish || profile.favoriteDrink)) isDone = true;
              if (idx === 9 && profile.favoriteAtmospheres?.length) isDone = true;

              return (
                <div key={s.id} id={`step-container-${idx}`} className="flex flex-col gap-1 w-full">
                  <button
                    id={`step-button-${idx}`}
                    onClick={() => {
                      setActiveStep(idx);
                      setTimeout(() => {
                        document.getElementById(`step-container-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      }, 150);
                    }}
                    className={`w-full p-4 border text-left rounded-sm transition-all duration-300 relative overflow-hidden flex items-center justify-between ${
                      isCurrent
                        ? "bg-text-plum/20 border-barao-rose/40 text-rose-300 shadow-md shadow-barao-rose/5"
                        : "bg-[#0b0a0a]/70 border-white/5 hover:border-white/10 text-zinc-400 hover:text-zinc-200"
                    }`}
                    style={{
                      borderColor: isCurrent ? 'rgba(236, 72, 153, 0.4)' : undefined,
                      backgroundColor: isCurrent ? 'rgba(40, 10, 20, 0.3)' : undefined,
                      color: isCurrent ? '#ffffff' : undefined
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-sm bg-black border flex items-center justify-center transition-all ${
                        isCurrent ? "border-barao-rose text-barao-rose" : "border-white/10 text-zinc-500"
                      }`}>
                        {s.icon}
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold tracking-wide font-serif">{s.title}</h4>
                        <p className="text-[10px] text-zinc-500 leading-tight truncate max-w-[180px] sm:max-w-none lg:max-w-[180px] mt-0.5 font-light">
                          {isDone ? "Sintonizado" : "Inexplorado"}
                        </p>
                      </div>
                    </div>
                    {isDone && (
                      <div className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse border border-emerald-400/30" />
                    )}
                  </button>

                  {/* Mobile Accordion Form Content */}
                  {isCurrent && (
                    <div className="block lg:hidden bg-[#0b0a0a] border border-white/5 rounded-sm p-4 sm:p-5 mt-1.5 space-y-6 overflow-hidden">
                      {renderStepContent(idx, true)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Portal Cards Canvas (Single Focus Question Step) */}
        <div className="hidden lg:block lg:col-span-8">
          <div className="bg-[#0b0a0a] border border-white/5 rounded-sm p-6 sm:p-8 min-h-[480px] flex flex-col justify-between relative overflow-hidden">
            
            {/* Ambient Background Grid lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none opacity-40" />

            <AnimatePresence mode="wait">
              {renderStepContent(activeStep, false)}
            </AnimatePresence>

          </div>
        </div>

      </div>

      {/* Advanced Control Drawer: System Prompt Weight Adjustments */}
      <div className="bg-[#0b0a0a] border border-white/5 rounded-sm p-6 sm:p-8 relative overflow-hidden space-y-6">
        <div className="space-y-1.5">
          <span className="text-[9px] font-mono uppercase text-barao-rose tracking-widest block font-bold">
            ⚙️ Consciência Sistêmica (Configurações Futuras de Avatar e IA)
          </span>
          <h3 className="font-serif text-lg text-white font-light">
            Filtro de Intensidade do Universo (Regulador de Peso do Prompt)
          </h3>
          <p className="text-xs text-zinc-400 font-light leading-relaxed max-w-2xl">
            Como O Barão deve ponderar este dossiê afetivo que você compartilha progressivamente? O nível escolhido reescreve as instruções de sistema passadas ao Gemini de forma sutil ou invasora.
          </p>
        </div>

        {/* 3-State Slider buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          
          <button
            onClick={() => saveProfileWeight("sutil")}
            className={`p-4 border text-left rounded-sm transition-all duration-300 relative ${
              profileWeight === "sutil"
                ? "bg-black border-barao-rose text-white shadow-md"
                : "bg-black/30 border-white/5 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-widest font-bold">Modo Sutil</span>
              {profileWeight === "sutil" && <div className="w-2.5 h-2.5 rounded-full bg-barao-rose" />}
            </div>
            <p className="font-serif text-xs italic text-zinc-300 mt-2 font-light">
              &ldquo;Como um perfume discreto no peito.&rdquo;
            </p>
            <p className="text-[10px] text-zinc-500 font-light leading-snug mt-1.5">
              O Barão sabe dos seus gostos apenas como plano de fundo subconsciente. Evita citações diretas para manter mistério.
            </p>
          </button>

          <button
            onClick={() => saveProfileWeight("equilibrado")}
            className={`p-4 border text-left rounded-sm transition-all duration-300 relative ${
              profileWeight === "equilibrado"
                ? "bg-black border-barao-rose text-white shadow-md"
                : "bg-black/30 border-white/5 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-widest font-bold">Modo Equilibrado</span>
              {profileWeight === "equilibrado" && <div className="w-2.5 h-2.5 rounded-full bg-barao-rose" />}
            </div>
            <p className="font-serif text-xs italic text-zinc-300 mt-2 font-light">
              &ldquo;Diálogo afável e sintonizado.&rdquo;
            </p>
            <p className="text-[10px] text-zinc-500 font-light leading-snug mt-1.5">
              Padrão recomendado. Lembra intuitivamente de suas sensações, atmosferas e estilo musical, cruzando-as na conversa de forma fluida.
            </p>
          </button>

          <button
            onClick={() => saveProfileWeight("intenso")}
            className={`p-4 border text-left rounded-sm transition-all duration-300 relative ${
              profileWeight === "intenso"
                ? "bg-[#140b0b] border-barao-gold/60 text-white shadow-md"
                : "bg-black/30 border-white/5 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-widest font-bold text-barao-gold">Modo Fusão Total</span>
              {profileWeight === "intenso" && <div className="w-2.5 h-2.5 rounded-full bg-barao-gold" />}
            </div>
            <p className="font-serif text-xs italic text-barao-gold mt-2 font-light">
              &ldquo;Ressonância mútua profunda.&rdquo;
            </p>
            <p className="text-[10px] text-zinc-500 font-light leading-snug mt-1.5">
              Fusão profunda. Seus gostos, medos, estilo comunicativo e energia atual moldam ativamente quase todas as metáforas, ritmos e respostas do Barão.
            </p>
          </button>

        </div>

        <div className="bg-barao-plum/20 border border-white/5 p-4 rounded-sm text-[11px] leading-relaxed text-zinc-400">
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-barao-gold block font-bold mb-1">
            🌱 Nota de Consciência Afetiva
          </span>
          Todas as respostas dadas acima permanecem seguras em seu navegador. O preenchimento é totalmente opcional e feito no seu ritmo. À medida que você dialoga ou preenche estas cartas de sintonização, O Barão reorganizará sutilmente as memórias para que cada regresso ao abrigo filtre e enriqueça a sua experiência diária.
        </div>
      </div>

    </div>
  );
}
