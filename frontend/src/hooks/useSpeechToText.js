import { useState, useRef, useCallback, useEffect } from 'react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

/**
 * Web Speech API hook for speech-to-text (tr-TR).
 *
 * Returns { listening, supported, start, stop }
 * Fires onTranscript(text) with the best interim/final result.
 */
export function useSpeechToText({ lang = 'tr-TR', onTranscript } = {}) {
    const [listening, setListening] = useState(false);
    const recognitionRef = useRef(null);

    const supported = Boolean(SpeechRecognition);

    const stop = useCallback(() => {
        recognitionRef.current?.stop();
    }, []);

    const start = useCallback(() => {
        if (!supported) return;

        const recognition = new SpeechRecognition();
        recognition.lang = lang;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setListening(true);

        recognition.onresult = (e) => {
            const transcript = Array.from(e.results)
                .map((r) => r[0].transcript)
                .join('');
            onTranscript?.(transcript);
        };

        recognition.onend = () => setListening(false);
        recognition.onerror = () => setListening(false);

        recognitionRef.current = recognition;
        recognition.start();
    }, [supported, lang, onTranscript]);

    // Cleanup on unmount
    useEffect(() => () => recognitionRef.current?.abort(), []);

    return { listening, supported, start, stop };
}
