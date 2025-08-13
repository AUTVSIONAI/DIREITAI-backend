import { useState, useEffect, useCallback } from 'react';

// Interface para configurações de voz
interface SpeechConfig {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

// Interface para reconhecimento de voz
interface SpeechRecognitionConfig {
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
}

// Hook para síntese de voz (Text-to-Speech)
export const useSpeechSynthesis = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSupported(true);
      
      const updateVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;

      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  const speak = useCallback((text: string, config: SpeechConfig = {}) => {
    if (!supported || !text.trim()) return;

    // Parar qualquer fala em andamento
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configurar voz (preferir português brasileiro)
    if (config.voice) {
      utterance.voice = config.voice;
    } else {
      const ptBrVoice = voices.find(voice => 
        voice.lang.includes('pt-BR') || voice.lang.includes('pt')
      );
      if (ptBrVoice) {
        utterance.voice = ptBrVoice;
      }
    }

    utterance.rate = config.rate || 0.9;
    utterance.pitch = config.pitch || 1;
    utterance.volume = config.volume || 1;
    utterance.lang = config.lang || 'pt-BR';

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [supported, voices]);

  const stop = useCallback(() => {
    if (supported) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, [supported]);

  const pause = useCallback(() => {
    if (supported) {
      window.speechSynthesis.pause();
    }
  }, [supported]);

  const resume = useCallback(() => {
    if (supported) {
      window.speechSynthesis.resume();
    }
  }, [supported]);

  return {
    speak,
    stop,
    pause,
    resume,
    speaking,
    supported,
    voices
  };
};

// Hook para reconhecimento de voz (Speech-to-Text)
export const useSpeechRecognition = () => {
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = 
        (window as any).SpeechRecognition || 
        (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        setSupported(true);
        const recognitionInstance = new SpeechRecognition();
        setRecognition(recognitionInstance);
      }
    }
  }, []);

  const startListening = useCallback((config: SpeechRecognitionConfig = {}) => {
    if (!supported || !recognition) return;

    recognition.continuous = config.continuous || false;
    recognition.interimResults = config.interimResults || true;
    recognition.lang = config.lang || 'pt-BR';

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }
      
      if (finalTranscript) {
        setTranscript(finalTranscript);
      }
    };

    recognition.start();
  }, [supported, recognition]);

  const stopListening = useCallback(() => {
    if (recognition) {
      recognition.stop();
    }
  }, [recognition]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    transcript,
    listening,
    supported,
    startListening,
    stopListening,
    resetTranscript
  };
};

// Hook combinado para funcionalidades completas de voz
export const useSpeech = () => {
  const speechSynthesis = useSpeechSynthesis();
  const speechRecognition = useSpeechRecognition();

  return {
    ...speechSynthesis,
    ...speechRecognition,
    speechSupported: speechSynthesis.supported,
    recognitionSupported: speechRecognition.supported
  };
};