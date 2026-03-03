import { useCallback, useEffect, useRef, useState } from 'react';

const SpeechRecognition =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    : undefined;

export function useDictation(onResult: (transcript: string) => void) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }
      if (transcript) {
        onResultRef.current(transcript);
      }
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, []);

  const toggle = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (listening) {
      recognition.stop();
    } else {
      recognition.start();
      setListening(true);
    }
  }, [listening]);

  return {
    listening,
    supported: !!SpeechRecognition,
    toggle,
  };
}
