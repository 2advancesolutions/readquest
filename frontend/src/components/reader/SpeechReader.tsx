import React, { useState, useRef, useCallback } from 'react';

interface WordError {
  word: string;
  spoken_word?: string;
  error_type: 'mispronounced' | 'skipped' | 'repeated';
  word_index: number;
}

interface SpeechReaderProps {
  pageText: string;
  storyId: string;
  pageNumber: number;
  studentId: string;
  onAnalysisComplete?: (result: {
    accuracy_pct: number;
    words_per_minute: number | null;
    word_errors: WordError[];
    feedback: string;
    session_id: string;
  }) => void;
  onWordErrors?: (errorIndices: Set<number>) => void;
}

type ReaderState = 'idle' | 'requesting' | 'listening' | 'analyzing' | 'done' | 'unsupported';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Detect Speech Recognition API (webkit prefix for iOS Safari / Chrome mobile)
const getSpeechRecognition = (): typeof SpeechRecognition | null => {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
};

export const SpeechReader: React.FC<SpeechReaderProps> = ({
  pageText,
  storyId,
  pageNumber,
  studentId,
  onAnalysisComplete,
  onWordErrors,
}) => {
  const [state, setState] = useState<ReaderState>(
    getSpeechRecognition() ? 'idle' : 'unsupported'
  );
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState('');

  const recognitionRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const transcriptRef = useRef('');

  // ── Request mic permission explicitly then start recognition ──────────────
  // On mobile (iOS Safari, Android Chrome) the browser requires:
  //   1. getUserMedia called from a user-gesture handler to trigger the
  //      permission prompt (if not yet granted)
  //   2. recognition.start() called synchronously in the same gesture
  const startListening = useCallback(async () => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setState('unsupported');
      return;
    }

    setError('');
    setState('requesting');

    // Step 1: Explicitly request mic permission — shows the browser prompt on mobile
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the tracks immediately — we just needed the permission grant.
      // SpeechRecognition will open its own mic session.
      stream.getTracks().forEach(t => t.stop());
    } catch (permErr: any) {
      const msg =
        permErr?.name === 'NotAllowedError'
          ? '🎤 Microphone access was denied. Please tap the lock icon in your browser and allow microphone access, then try again.'
          : `🎤 Could not access microphone: ${permErr?.message ?? permErr}`;
      setError(msg);
      setState('idle');
      return;
    }

    // Step 2: Create a fresh recognition instance every time (mobile best practice)
    const recognition = new SpeechRecognition();

    // iOS Safari does NOT support continuous=true (it stops after first pause).
    // Set continuous only on non-iOS; on iOS we collect what we get.
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    recognition.continuous = !isIOS;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    transcriptRef.current = '';
    setTranscript('');

    recognition.onresult = (event: any) => {
      let full = '';
      for (let i = 0; i < event.results.length; i++) {
        full += event.results[i][0].transcript + ' ';
      }
      transcriptRef.current = full.trim();
      setTranscript(full.trim());
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('🎤 Microphone blocked. Please allow microphone access in your browser settings and try again.');
        setState('idle');
      } else if (event.error === 'no-speech') {
        // no-speech is non-fatal on mobile — just keep waiting
      } else if (event.error === 'aborted') {
        // intentional stop — ignore
      } else {
        setError(`🎤 Microphone error: ${event.error}. Please try again.`);
        setState('idle');
      }
    };

    // On iOS, recognition ends automatically — trigger analyse when it does
    recognition.onend = () => {
      if (state === 'listening' || recognitionRef.current === recognition) {
        // Only auto-analyse if we haven't already stopped manually
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null;
          analyzeTranscript();
        }
      }
    };

    recognitionRef.current = recognition;
    startTimeRef.current = Date.now();

    try {
      recognition.start();
      setState('listening');
    } catch (startErr: any) {
      setError('Could not start microphone. Please try again.');
      setState('idle');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const analyzeTranscript = useCallback(async () => {
    const finalTranscript = transcriptRef.current;
    if (!finalTranscript.trim()) {
      setError('No speech detected. Please tap the mic and read aloud!');
      setState('idle');
      return;
    }

    setState('analyzing');
    const duration = (Date.now() - startTimeRef.current) / 1000;

    try {
      const response = await fetch(`${API_BASE}/api/fluency/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-student-id': studentId,
        },
        body: JSON.stringify({
          story_id: storyId,
          page_number: pageNumber,
          transcript: finalTranscript,
          source_text: pageText,
          duration_secs: duration,
        }),
      });

      if (!response.ok) throw new Error('Analysis failed');
      const result = await response.json();

      setAccuracy(result.accuracy_pct);
      setFeedback(result.feedback);
      setState('done');

      const errorIndices = new Set<number>(
        result.word_errors.map((e: WordError) => e.word_index)
      );
      onWordErrors?.(errorIndices);
      onAnalysisComplete?.(result);
    } catch {
      setError('Could not analyze your reading. Please try again!');
      setState('idle');
    }
  }, [pageText, storyId, pageNumber, studentId, onAnalysisComplete, onWordErrors]);

  const stopAndAnalyze = useCallback(() => {
    if (recognitionRef.current) {
      // Prevent onend from firing analyzeTranscript again
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      rec.onend = null;
      try { rec.stop(); } catch { /* already stopped */ }
    }
    analyzeTranscript();
  }, [analyzeTranscript]);

  const reset = useCallback(() => {
    setState('idle');
    setAccuracy(null);
    setFeedback('');
    setTranscript('');
    setError('');
    transcriptRef.current = '';
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
  }, []);

  if (state === 'unsupported') {
    return (
      <div style={containerStyle}>
        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
          🎤 Voice reading isn't supported in this browser.<br />
          Try Chrome or Safari on your phone.
        </p>
      </div>
    );
  }

  const isListening = state === 'listening';
  const isAnalyzing = state === 'analyzing';
  const isRequesting = state === 'requesting';

  return (
    <div style={containerStyle}>
      {/* Mic Button */}
      <div style={{ position: 'relative' }}>
        {isListening && (
          <>
            <div style={pulseStyle(0)} />
            <div style={pulseStyle(0.3)} />
          </>
        )}
        <button
          onClick={isListening ? stopAndAnalyze : startListening}
          disabled={isAnalyzing || isRequesting}
          style={btnStyle(state)}
          title={isListening ? 'Tap to stop and check your reading' : 'Tap to start reading aloud'}
        >
          {isAnalyzing || isRequesting ? '⏳' : isListening ? '⏹️' : '🎤'}
        </button>
      </div>

      {/* Status label */}
      <p style={labelStyle}>
        {state === 'idle'      && '🎤 Tap to read aloud'}
        {state === 'requesting'&& '🎤 Waiting for microphone…'}
        {state === 'listening' && '🔴 Listening… tap ⏹️ when done'}
        {state === 'analyzing' && '✨ Checking your reading…'}
        {state === 'done'      && `⭐ ${accuracy}% accuracy — great job!`}
      </p>

      {/* Live transcript preview */}
      {isListening && transcript && (
        <p style={transcriptStyle}>
          "{transcript.slice(-60)}"
        </p>
      )}

      {/* Feedback */}
      {state === 'done' && feedback && (
        <div style={feedbackBoxStyle}>
          <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.92)', lineHeight: 1.5 }}>
            {feedback}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p style={{ margin: 0, fontSize: '12px', color: '#f87171', textAlign: 'center', maxWidth: '240px', lineHeight: 1.4 }}>
          {error}
        </p>
      )}

      {/* Reset */}
      {state === 'done' && (
        <button onClick={reset} style={resetBtnStyle}>
          Try Again
        </button>
      )}

      <style>{`
        @keyframes srPulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50%       { transform: scale(1.18); opacity: 0.25; }
        }
      `}</style>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '12px',
  padding: '16px',
  background: 'rgba(255,255,255,0.05)',
  borderRadius: '20px',
  border: '1px solid rgba(255,255,255,0.1)',
};

const pulseStyle = (delay: number): React.CSSProperties => ({
  position: 'absolute',
  inset: delay === 0 ? '-8px' : '-16px',
  borderRadius: '50%',
  background: delay === 0 ? 'rgba(168,85,247,0.3)' : 'rgba(168,85,247,0.15)',
  animation: `srPulse 1s ease-in-out ${delay}s infinite`,
  pointerEvents: 'none',
});

const btnStyle = (state: ReaderState): React.CSSProperties => ({
  width: '72px',
  height: '72px',
  borderRadius: '50%',
  border: 'none',
  background:
    state === 'listening'
      ? 'linear-gradient(135deg, #ec4899, #a855f7)'
      : state === 'analyzing' || state === 'requesting'
      ? 'rgba(255,255,255,0.2)'
      : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
  cursor: state === 'analyzing' || state === 'requesting' ? 'wait' : 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '30px',
  boxShadow: '0 4px 24px rgba(139,92,246,0.45)',
  transition: 'all 0.3s ease',
  position: 'relative',
  // Larger touch target on mobile
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
});

const labelStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '13px',
  color: 'rgba(255,255,255,0.75)',
  textAlign: 'center',
  fontWeight: 600,
};

const transcriptStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '11px',
  color: 'rgba(255,255,255,0.4)',
  textAlign: 'center',
  fontStyle: 'italic',
  maxWidth: '220px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const feedbackBoxStyle: React.CSSProperties = {
  background: 'rgba(168,85,247,0.15)',
  borderRadius: '12px',
  padding: '10px 14px',
  maxWidth: '240px',
  textAlign: 'center',
  border: '1px solid rgba(168,85,247,0.3)',
};

const resetBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.2)',
  color: 'rgba(255,255,255,0.6)',
  borderRadius: '20px',
  padding: '6px 18px',
  fontSize: '12px',
  cursor: 'pointer',
  touchAction: 'manipulation',
};

export default SpeechReader;
