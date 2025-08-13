import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Settings } from 'lucide-react';
import { useSpeech } from '../../hooks/useSpeech';

const VoiceControls = ({ 
  onTranscript, 
  autoSpeak = true, 
  lastMessage = '',
  className = '' 
}) => {
  const {
    speak,
    stop: stopSpeaking,
    speaking,
    speechSupported,
    transcript,
    listening,
    recognitionSupported,
    startListening,
    stopListening,
    resetTranscript,
    voices
  } = useSpeech();

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [speechRate, setSpeechRate] = useState(0.9);
  const [speechVolume, setSpeechVolume] = useState(1);

  // Configurar voz padrão (português brasileiro)
  useEffect(() => {
    if (voices.length > 0 && !selectedVoice) {
      const ptBrVoice = voices.find(voice => 
        voice.lang.includes('pt-BR') || 
        (voice.lang.includes('pt') && voice.name.toLowerCase().includes('brasil'))
      ) || voices.find(voice => voice.lang.includes('pt'));
      
      if (ptBrVoice) {
        setSelectedVoice(ptBrVoice);
      }
    }
  }, [voices, selectedVoice]);

  // Auto-falar quando receber nova mensagem da IA
  useEffect(() => {
    if (autoSpeak && voiceEnabled && lastMessage && speechSupported) {
      // Limpar markdown e formatação
      const cleanText = lastMessage
        .replace(/\*\*(.*?)\*\*/g, '$1') // negrito
        .replace(/\*(.*?)\*/g, '$1') // itálico
        .replace(/`(.*?)`/g, '$1') // código inline
        .replace(/```[\s\S]*?```/g, '[código]') // blocos de código
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
        .replace(/#{1,6}\s/g, '') // headers
        .replace(/\n+/g, '. ') // quebras de linha
        .trim();

      if (cleanText) {
        speak(cleanText, {
          voice: selectedVoice,
          rate: speechRate,
          volume: speechVolume
        });
      }
    }
  }, [lastMessage, autoSpeak, voiceEnabled, speechSupported, speak, selectedVoice, speechRate, speechVolume]);

  // Processar transcrição
  useEffect(() => {
    if (transcript && onTranscript) {
      onTranscript(transcript);
      resetTranscript();
    }
  }, [transcript, onTranscript, resetTranscript]);

  const handleMicClick = () => {
    if (listening) {
      stopListening();
    } else {
      startListening({
        continuous: false,
        interimResults: true,
        lang: 'pt-BR'
      });
    }
  };

  const handleVolumeClick = () => {
    if (speaking) {
      stopSpeaking();
    }
    setVoiceEnabled(!voiceEnabled);
  };

  if (!speechSupported && !recognitionSupported) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Controle de Microfone */}
      {recognitionSupported && (
        <button
          onClick={handleMicClick}
          disabled={speaking}
          className={`p-2 rounded-full transition-all duration-200 ${
            listening
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={listening ? 'Parar gravação' : 'Iniciar gravação de voz'}
        >
          {listening ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </button>
      )}

      {/* Controle de Volume/Fala */}
      {speechSupported && (
        <button
          onClick={handleVolumeClick}
          className={`p-2 rounded-full transition-all duration-200 ${
            voiceEnabled
              ? speaking
                ? 'bg-blue-500 text-white animate-pulse'
                : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-400'
          }`}
          title={voiceEnabled ? 'Desativar voz' : 'Ativar voz'}
        >
          {voiceEnabled ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
        </button>
      )}

      {/* Configurações de Voz */}
      {speechSupported && (
        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            title="Configurações de voz"
          >
            <Settings className="h-4 w-4" />
          </button>

          {showSettings && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Configurações de Voz
              </h3>
              
              {/* Seleção de Voz */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Voz
                </label>
                <select
                  value={selectedVoice?.name || ''}
                  onChange={(e) => {
                    const voice = voices.find(v => v.name === e.target.value);
                    setSelectedVoice(voice);
                  }}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {voices
                    .filter(voice => voice.lang.includes('pt') || voice.lang.includes('en'))
                    .map((voice) => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))
                  }
                </select>
              </div>

              {/* Velocidade */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Velocidade: {speechRate.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={speechRate}
                  onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Volume */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Volume: {Math.round(speechVolume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={speechVolume}
                  onChange={(e) => setSpeechVolume(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Teste */}
              <button
                onClick={() => speak('Olá, patriota! Esta é a voz da DireitaIA.', {
                  voice: selectedVoice,
                  rate: speechRate,
                  volume: speechVolume
                })}
                className="w-full text-xs bg-blue-500 text-white py-1 px-2 rounded hover:bg-blue-600 transition-colors"
              >
                Testar Voz
              </button>
            </div>
          )}
        </div>
      )}

      {/* Indicador de Status */}
      {(listening || speaking) && (
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          {listening && (
            <span className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1"></div>
              Ouvindo...
            </span>
          )}
          {speaking && (
            <span className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-1"></div>
              Falando...
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default VoiceControls;