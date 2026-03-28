import React, { useState, useEffect } from 'react';

interface VocabularyWord {
  id: string;
  word: string;
  definition: string;
  example_sentence: string;
  pronunciation_url?: string;
  grade_level: number;
  is_saved: boolean;
}

interface VocabularyPanelProps {
  word: string;        // The tapped word
  storyId: string;
  studentId: string;
  onClose: () => void;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const VocabularyPanel: React.FC<VocabularyPanelProps> = ({
  word,
  storyId,
  studentId,
  onClose,
}) => {
  const [wordData, setWordData] = useState<VocabularyWord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Try to find this word in the student's vocabulary bank
    const fetchWord = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/vocabulary/words/${studentId}`, {
          headers: { 'x-student-id': studentId },
        });
        if (res.ok) {
          const words: VocabularyWord[] = await res.json();
          const match = words.find(w => w.word.toLowerCase() === word.toLowerCase());
          if (match) {
            setWordData(match);
            setSaved(match.is_saved);
            setLoading(false);
            return;
          }
        }
      } catch { /* fall through to extraction */ }

      // Word not in bank yet — trigger extraction for this story
      try {
        const extractRes = await fetch(`${API_BASE}/api/vocabulary/extract/${storyId}`, {
          method: 'POST',
          headers: { 'x-student-id': studentId },
        });
        if (extractRes.ok) {
          const extracted = await extractRes.json();
          const match = (extracted.words || []).find(
            (w: VocabularyWord) => w.word.toLowerCase() === word.toLowerCase()
          );
          if (match) {
            setWordData({ ...match, id: match.id || word, is_saved: false });
            setLoading(false);
            return;
          }
        }
      } catch { /* fall through */ }

      // Fallback — show basic panel
      setWordData({
        id: word,
        word,
        definition: 'Look this word up to learn more!',
        example_sentence: '',
        grade_level: 1,
        is_saved: false,
      });
      setLoading(false);
    };

    fetchWord();
  }, [word, storyId, studentId]);

  const handleSave = async () => {
    if (!wordData?.id || saved) return;
    try {
      await fetch(`${API_BASE}/api/vocabulary/words/${wordData.id}/save`, {
        method: 'POST',
        headers: { 'x-student-id': studentId },
      });
      setSaved(true);
    } catch { /* fail silently */ }
  };

  const handlePronounce = async () => {
    if (!wordData || playingAudio) return;
    setPlayingAudio(true);
    try {
      const res = await fetch(`${API_BASE}/api/vocabulary/pronounce/${encodeURIComponent(wordData.word)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const audioSrc = `data:${data.mime_type};base64,${data.audio_base64}`;
      const audio = new Audio(audioSrc);
      audio.onended = () => setPlayingAudio(false);
      audio.play();
    } catch {
      setPlayingAudio(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(15, 10, 40, 0.97)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px 24px 0 0',
        border: '1px solid rgba(168,85,247,0.3)',
        padding: '24px',
        zIndex: 1000,
        animation: 'slideUp 0.3s ease',
        maxHeight: '60vh',
        overflowY: 'auto',
      }}
    >
      {/* Handle bar */}
      <div style={{
        width: '40px', height: '4px',
        background: 'rgba(255,255,255,0.2)',
        borderRadius: '2px',
        margin: '0 auto 20px',
      }} />

      {loading ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '20px' }}>
          ✨ Looking up this word…
        </div>
      ) : wordData ? (
        <>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div>
              <h2 style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #c084fc, #818cf8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.5px',
              }}>
                {wordData.word}
              </h2>
              <span style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}>
                Tier 2 Vocabulary
              </span>
            </div>

            {/* Pronunciation Button */}
            <button
              onClick={handlePronounce}
              style={{
                marginLeft: 'auto',
                background: playingAudio
                  ? 'rgba(168,85,247,0.4)'
                  : 'rgba(168,85,247,0.15)',
                border: '1px solid rgba(168,85,247,0.4)',
                borderRadius: '50%',
                width: '44px', height: '44px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              title="Hear pronunciation"
            >
              {playingAudio ? '🔊' : '🔈'}
            </button>
          </div>

          {/* Definition */}
          <div style={{
            background: 'rgba(168,85,247,0.1)',
            borderRadius: '14px',
            padding: '14px 16px',
            marginBottom: '12px',
            border: '1px solid rgba(168,85,247,0.2)',
          }}>
            <p style={{
              margin: 0,
              fontSize: '15px',
              color: 'rgba(255,255,255,0.9)',
              lineHeight: 1.6,
            }}>
              📖 {wordData.definition}
            </p>
          </div>

          {/* Example */}
          {wordData.example_sentence && (
            <div style={{
              background: 'rgba(99,102,241,0.1)',
              borderRadius: '14px',
              padding: '12px 16px',
              marginBottom: '16px',
              border: '1px solid rgba(99,102,241,0.2)',
            }}>
              <p style={{
                margin: 0,
                fontSize: '13px',
                color: 'rgba(255,255,255,0.7)',
                lineHeight: 1.6,
                fontStyle: 'italic',
              }}>
                ✏️ "{wordData.example_sentence}"
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleSave}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '14px',
                border: saved ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(168,85,247,0.4)',
                background: saved
                  ? 'rgba(74,222,128,0.15)'
                  : 'rgba(168,85,247,0.15)',
                color: saved ? '#4ade80' : '#c084fc',
                fontSize: '14px',
                fontWeight: 600,
                cursor: saved ? 'default' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {saved ? '✅ Saved to My Words!' : '⭐ Add to My Words'}
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '12px 20px',
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </>
      ) : (
        <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
          Word not found in vocabulary bank.
        </p>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default VocabularyPanel;
