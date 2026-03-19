import { useState, useRef, useCallback } from "react";

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [isSupported] = useState(
    () => !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    )
  );
  const recognitionRef = useRef<any>(null);
  const shouldStopRef = useRef(false);

  const buildRecognition = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalChunk += result[0].transcript;
        } else {
          interimChunk += result[0].transcript;
        }
      }
      if (finalChunk) {
        setTranscript(prev => prev ? prev + " " + finalChunk.trim() : finalChunk.trim());
        setInterimText("");
      } else if (interimChunk) {
        setInterimText(interimChunk);
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error === "no-speech") {
        // Relance automatique — l'utilisateur n'a pas encore parlé
        if (!shouldStopRef.current) {
          try { recognition.stop(); } catch {}
          // onend va relancer
        }
        return;
      }
      if (e.error !== "aborted") {
        console.warn("Speech recognition error:", e.error);
      }
    };

    recognition.onend = () => {
      setInterimText("");
      if (!shouldStopRef.current) {
        // Relance automatique (fin naturelle ou no-speech)
        try {
          recognition.start();
        } catch {
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    return recognition;
  }, []);

  const startListening = useCallback(() => {
    const recognition = buildRecognition();
    if (!recognition) return;
    shouldStopRef.current = false;
    setTranscript("");
    setInterimText("");
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }, [buildRecognition]);

  const stopListening = useCallback(() => {
    shouldStopRef.current = true;
    setInterimText("");
    try { recognitionRef.current?.stop(); } catch {}
    setIsListening(false);
  }, []);

  return { isListening, transcript, interimText, isSupported, startListening, stopListening };
};
