/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Native Web Audio API sound synthesizer for relaxing atmospheres.
class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private pianoNode: GainNode | null = null;
  private rainNode: GainNode | null = null;
  private fireNode: GainNode | null = null;

  // Sound source arrays for scheduling
  private isPianoPlaying = false;
  private isRainPlaying = false;
  private isFirePlaying = false;

  private pianoTimer: any = null;
  private fireTimer: any = null;
  private currentAudio: HTMLAudioElement | null = null;
  // Evita esperar o carregamento das vozes mais de uma vez por fala
  private voicesWaited = false;

  public initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch((err) => {
        console.warn("Failed to resume audio context:", err);
      });
    }
  }

  // Set up Piano Pad (Ambient chord of major/minor 7th chords that pulse smoothly)
  public startPiano(volume = 0.5) {
    this.initContext();
    if (!this.ctx) return;
    if (this.isPianoPlaying) return;

    this.isPianoPlaying = true;
    this.pianoNode = this.ctx.createGain();
    this.pianoNode.gain.setValueAtTime(0, this.ctx.currentTime);
    this.pianoNode.gain.linearRampToValueAtTime(volume * 0.15, this.ctx.currentTime + 3);
    this.pianoNode.connect(this.ctx.destination);

    // Dynamic chord generation loop (Ambient notes: C3 = 130.81, G3 = 196.00, C4 = 261.63, E4 = 329.63, B4 = 493.88 etc.)
    const chords = [
      [130.81, 196.00, 261.63, 329.63, 493.88], // Cmaj7
      [146.83, 220.00, 293.66, 349.23, 440.00], // Dm7
      [164.81, 246.94, 329.63, 392.00, 493.88], // Em7
      [174.61, 261.63, 349.23, 440.00, 523.25], // Fmaj7
    ];

    let chordIndex = 0;
    const playNextChord = () => {
      if (!this.isPianoPlaying || !this.ctx || !this.pianoNode) return;
      const now = this.ctx.currentTime;
      const notes = chords[chordIndex];

      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.pianoNode) return;
        
        // Soft oscillator
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();

        // Slow sine-wave with triangle mix
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        // Slow pulsing volume envelope
        oscGain.gain.setValueAtTime(0, now);
        // Stagger entrance of notes in the chord
        oscGain.gain.linearRampToValueAtTime((0.08 + Math.random() * 0.05) / notes.length, now + 1.5 + idx * 0.5);
        oscGain.gain.setValueAtTime((0.08 + Math.random() * 0.05) / notes.length, now + 6);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 9 + Math.random() * 2);

        osc.connect(oscGain);
        oscGain.connect(this.pianoNode);

        osc.start(now);
        osc.stop(now + 12);
      });

      chordIndex = (chordIndex + 1) % chords.length;
      this.pianoTimer = setTimeout(playNextChord, 8000);
    };

    playNextChord();
  }

  public stopPiano() {
    this.isPianoPlaying = false;
    if (this.pianoTimer) {
      clearTimeout(this.pianoTimer);
      this.pianoTimer = null;
    }
    if (this.pianoNode && this.ctx) {
      const now = this.ctx.currentTime;
      try {
        this.pianoNode.gain.cancelScheduledValues(now);
        this.pianoNode.gain.setValueAtTime(this.pianoNode.gain.value, now);
        this.pianoNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
        setTimeout(() => {
          this.pianoNode?.disconnect();
          this.pianoNode = null;
        }, 2000);
      } catch (e) {
        this.pianoNode = null;
      }
    }
  }

  public setPianoVolume(volume: number) {
    if (this.pianoNode && this.ctx) {
      this.pianoNode.gain.setValueAtTime(volume * 0.15, this.ctx.currentTime);
    }
  }

  // Set up Rain Sound (Filtered white noise generating a deep washing sea/rain effect)
  public startRain(volume = 0.5) {
    this.initContext();
    if (!this.ctx) return;
    if (this.isRainPlaying) return;

    this.isRainPlaying = true;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Generate brown/pinkish white noise
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Filter to make it brown (deeper pitch, less static, soothing like rain/ocean)
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Gain compensation
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Filter to suppress high-frequency hiss, leaving cozy rumble
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(550, this.ctx.currentTime);

    const bpf = this.ctx.createBiquadFilter();
    bpf.type = "peaking";
    bpf.frequency.setValueAtTime(200, this.ctx.currentTime);
    bpf.Q.setValueAtTime(1, this.ctx.currentTime);
    bpf.gain.setValueAtTime(3, this.ctx.currentTime);

    this.rainNode = this.ctx.createGain();
    this.rainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    this.rainNode.gain.linearRampToValueAtTime(volume * 0.8, this.ctx.currentTime + 2);

    noiseSource.connect(filter);
    filter.connect(bpf);
    bpf.connect(this.rainNode);
    this.rainNode.connect(this.ctx.destination);

    noiseSource.start();
    (this as any).rainSource = noiseSource;
  }

  public stopRain() {
    this.isRainPlaying = false;
    if (this.rainNode && this.ctx) {
      const now = this.ctx.currentTime;
      try {
        this.rainNode.gain.cancelScheduledValues(now);
        this.rainNode.gain.setValueAtTime(this.rainNode.gain.value, now);
        this.rainNode.gain.linearRampToValueAtTime(0, now + 1.5);
        setTimeout(() => {
          if ((this as any).rainSource) {
            try {
              (this as any).rainSource.stop();
            } catch (e) {}
            (this as any).rainSource = null;
          }
          this.rainNode?.disconnect();
          this.rainNode = null;
        }, 1800);
      } catch (e) {
        this.rainNode = null;
      }
    }
  }

  public setRainVolume(volume: number) {
    if (this.rainNode && this.ctx) {
      this.rainNode.gain.setValueAtTime(volume * 0.8, this.ctx.currentTime);
    }
  }

  // Set up Fireplace Cracking (Slow breathing pink rumble + random small high pass pop impulses)
  public startFire(volume = 0.5) {
    this.initContext();
    if (!this.ctx) return;
    if (this.isFirePlaying) return;

    this.isFirePlaying = true;
    this.fireNode = this.ctx.createGain();
    this.fireNode.gain.setValueAtTime(0, this.ctx.currentTime);
    this.fireNode.gain.linearRampToValueAtTime(volume * 0.5, this.ctx.currentTime + 1.5);
    this.fireNode.connect(this.ctx.destination);

    // 1. Deep rumble filter
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
       const white = Math.random() * 2 - 1;
       output[i] = (lastOut + 0.15 * white) / 1.15; // Filtered noise
       lastOut = output[i];
    }
    const rumbleSource = this.ctx.createBufferSource();
    rumbleSource.buffer = noiseBuffer;
    rumbleSource.loop = true;

    const rumbleFilter = this.ctx.createBiquadFilter();
    rumbleFilter.type = "lowpass";
    rumbleFilter.frequency.setValueAtTime(120, this.ctx.currentTime);

    const rumbleGain = this.ctx.createGain();
    rumbleGain.gain.setValueAtTime(0.4, this.ctx.currentTime);

    rumbleSource.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(this.fireNode);
    rumbleSource.start();
    (this as any).rumbleSource = rumbleSource;

    // 2. Crackling impulse generator
    const generateCrackle = () => {
      if (!this.isFirePlaying || !this.ctx || !this.fireNode) return;
      const now = this.ctx.currentTime;

      // Crackling sounds are very short impulses high-pass filtered
      const duration = 0.003 + Math.random() * 0.008;
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(800 + Math.random() * 1000, now);

      oscGain.gain.setValueAtTime(0, now);
      oscGain.gain.linearRampToValueAtTime(0.01 + Math.random() * 0.05, now + 0.001);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      const crackleFilter = this.ctx.createBiquadFilter();
      crackleFilter.type = "highpass";
      crackleFilter.frequency.setValueAtTime(1000, now);

      osc.connect(crackleFilter);
      crackleFilter.connect(oscGain);
      oscGain.connect(this.fireNode);

      osc.start(now);
      osc.stop(now + duration + 0.05);

      // Random crackle cadence (between 40ms and 450ms)
      this.fireTimer = setTimeout(generateCrackle, 40 + Math.random() * 410);
    };

    generateCrackle();
  }

  public stopFire() {
    this.isFirePlaying = false;
    if (this.fireTimer) {
      clearTimeout(this.fireTimer);
      this.fireTimer = null;
    }
    if (this.fireNode && this.ctx) {
      const now = this.ctx.currentTime;
      try {
        this.fireNode.gain.cancelScheduledValues(now);
        this.fireNode.gain.setValueAtTime(this.fireNode.gain.value, now);
        this.fireNode.gain.linearRampToValueAtTime(0, now + 1.5);
        setTimeout(() => {
          if ((this as any).rumbleSource) {
            try {
              (this as any).rumbleSource.stop();
            } catch (e) {}
            (this as any).rumbleSource = null;
          }
          this.fireNode?.disconnect();
          this.fireNode = null;
        }, 1800);
      } catch (e) {
        this.fireNode = null;
      }
    }
  }

  public setFireVolume(volume: number) {
    if (this.fireNode && this.ctx) {
      this.fireNode.gain.setValueAtTime(volume * 0.5, this.ctx.currentTime);
    }
  }

  /**
   * Escolhe a voz masculina em português do navegador.
   *
   * Os nomes variam por sistema (Windows, Android, iOS/macOS), e nenhum
   * navegador informa o gênero da voz — daí as listas explícitas. Também
   * evita vozes femininas conhecidas, que eram escolhidas por padrão e
   * faziam O Barão falar com voz de mulher.
   */
  private pickMaleVoice(): { voice: SpeechSynthesisVoice | null; isMale: boolean } {
    const voices = window.speechSynthesis.getVoices() || [];
    const ptVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith("pt"));
    if (ptVoices.length === 0) return { voice: null, isMale: false };

    // Prefere pt-BR sobre pt-PT
    const brFirst = [
      ...ptVoices.filter(v => v.lang.toLowerCase().replace("_", "-") === "pt-br"),
      ...ptVoices.filter(v => v.lang.toLowerCase().replace("_", "-") !== "pt-br")
    ];

    const MALE_NAMES = [
      "daniel", "ricardo", "felipe", "antonio", "antónio", "joão", "joao",
      "eddy", "reed", "rocko", "grandpa", "fernando", "bruno", "marcos",
      "paulo", "carlos", "diego", "júlio", "julio", "heitor", "lucas"
    ];
    const FEMALE_NAMES = [
      "maria", "helena", "luciana", "joana", "fernanda", "camila", "ana",
      "francisca", "catarina", "sandy", "shelley", "flo", "grandma",
      "vitoria", "vitória", "bella", "isabela", "leticia", "letícia"
    ];

    const isMaleName = (name: string) => {
      const n = name.toLowerCase();
      if (n.includes("male") && !n.includes("female")) return true;
      if (FEMALE_NAMES.some(f => n.includes(f))) return false;
      return MALE_NAMES.some(m => n.includes(m));
    };

    const male = brFirst.find(v => isMaleName(v.name));
    if (male) return { voice: male, isMale: true };

    // Sem voz masculina: usa a primeira em português (timbre é grave depois)
    const notFemale = brFirst.find(v => !FEMALE_NAMES.some(f => v.name.toLowerCase().includes(f)));
    return { voice: notFemale || brFirst[0], isMale: false };
  }

  // Easy method to perform Text-to-Speech in Brazilian Portuguese in the browser
  // Uses SpeechSynthesis UTTERANCE which reads O Barão's responses beautifully
  public speakText(text: string, onBoundary?: (charIndex: number) => void, onEnd?: () => void) {
    if (!window.speechSynthesis) return;

    // A lista de vozes carrega de forma assíncrona: na primeira chamada ela
    // costuma vir vazia e o navegador usaria a voz padrão (quase sempre
    // feminina). Espera o carregamento antes de falar.
    const voicesReady = (window.speechSynthesis.getVoices() || []).length > 0;
    if (!voicesReady && !this.voicesWaited) {
      this.voicesWaited = true;
      const speakWhenReady = () => {
        window.speechSynthesis.onvoiceschanged = null;
        this.speakText(text, onBoundary, onEnd);
      };
      window.speechSynthesis.onvoiceschanged = speakWhenReady;
      // Rede de segurança caso o evento não dispare
      setTimeout(() => {
        if (window.speechSynthesis.onvoiceschanged === speakWhenReady) speakWhenReady();
      }, 800);
      return;
    }
    this.voicesWaited = false;

    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    // Strip markdown formatting simple regex
    const cleanText = text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/#/g, "")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "pt-BR";

    const chosen = this.pickMaleVoice();
    if (chosen.voice) utterance.voice = chosen.voice;

    utterance.rate = 0.88; // Calm, slightly measured breathing cadence
    // Sem voz masculina disponível, o timbre grave disfarça a voz feminina
    utterance.pitch = chosen.isMale ? 0.85 : 0.6;

    if (onBoundary) {
      utterance.onboundary = (e) => {
        if (e.name === "word") {
          onBoundary(e.charIndex);
        }
      };
    }

    if (onEnd) {
      utterance.onend = onEnd;
    }

    window.speechSynthesis.speak(utterance);
  }

  // Plays a generated voice file (kie.ai/ElevenLabs) for O Barão's responses
  public playAudioUrl(url: string, onEnd?: () => void) {
    this.stopSpeaking();

    const audio = new Audio(url);
    this.currentAudio = audio;

    const finish = () => {
      if (this.currentAudio === audio) {
        this.currentAudio = null;
      }
      if (onEnd) onEnd();
    };
    audio.onended = finish;
    audio.onerror = finish;

    audio.play().catch(() => finish());
  }

  public stopSpeaking() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (this.currentAudio) {
      const audio = this.currentAudio;
      this.currentAudio = null;
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
    }
  }
}

export const synther = new AudioSynthesizer();
