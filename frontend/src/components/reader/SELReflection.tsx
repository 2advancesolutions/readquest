import React, { useState } from 'react';
import { SocraticHint } from './SocraticHint';

interface ReflectionPrompt {
  question: string;
  hint_1: string;
  hint_2: string;
  hint_3: string;
}

interface SELReflectionProps {
  selTags: string[];
  reflectionPrompts: ReflectionPrompt[];
  characterGuide: string;
  storyTitle: string;
  onComplete: () => void;
}

export const SELReflection: React.FC<SELReflectionProps> = ({
  selTags,
  reflectionPrompts,
  characterGuide,
  storyTitle,
  onComplete,
}) => {
  const [currentQ, setCurrentQ] = useState(0);
  const [answer, setAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [phase, setPhase] = useState<'reflection' | 'guide'>('reflection');

  const total = reflectionPrompts.length;
  const prompt = reflectionPrompts[currentQ];

  const handleNext = () => {
    setAnswers(prev => [...prev, answer]);
    setAnswer('');
    setShowHint(false);
    if (currentQ < total - 1) {
      setCurrentQ(q => q + 1);
    } else {
      setPhase('guide');
    }
  };

  const tagColors: Record<string, string> = {
    bullying: '#f87171', empathy: '#60a5fa', kindness: '#4ade80',
    friendship: '#fb923c', conflict_resolution: '#a78bfa', perseverance: '#facc15',
    courage: '#f59e0b', fairness: '#34d399', inclusion: '#38bdf8',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0a28 0%, #1a0a3e 50%, #0d1a3e 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* SEL Tags */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '24px' }}>
        {selTags.map(tag => (
          <span key={tag} style={{
            background: `${tagColors[tag] || '#a78bfa'}22`,
            border: `1px solid ${tagColors[tag] || '#a78bfa'}66`,
            color: tagColors[tag] || '#a78bfa',
            borderRadius: '20px',
            padding: '4px 14px',
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'capitalize',
          }}>
            {tag.replace('_', ' ')}
          </span>
        ))}
      </div>

      {phase === 'reflection' && prompt ? (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '32px',
          maxWidth: '520px',
          width: '100%',
        }}>
          {/* Progress */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            {reflectionPrompts.map((_, i) => (
              <div key={i} style={{
                flex: 1, height: '4px', borderRadius: '2px',
                background: i <= currentQ ? '#a855f7' : 'rgba(255,255,255,0.15)',
                transition: 'all 0.3s',
              }} />
            ))}
          </div>

          {/* Sage the Owl avatar */}
          <div style={{
            width: '60px', height: '60px',
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '28px',
            margin: '0 auto 20px', boxShadow: '0 0 30px rgba(168,85,247,0.4)',
          }}>
            🦉
          </div>

          <h3 style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: '18px',
            fontWeight: 600,
            textAlign: 'center',
            lineHeight: 1.5,
            marginBottom: '20px',
          }}>
            {prompt.question}
          </h3>

          <textarea
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="Tell Sage your thoughts… there's no wrong answer! 💜"
            style={{
              width: '100%',
              minHeight: '100px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '14px',
              padding: '14px',
              color: 'white',
              fontSize: '14px',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.6,
              marginBottom: '16px',
              boxSizing: 'border-box',
            }}
          />

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowHint(true)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                background: 'rgba(168,85,247,0.15)',
                border: '1px solid rgba(168,85,247,0.3)',
                color: '#c084fc',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              💡 Need a hint?
            </button>
            <button
              onClick={handleNext}
              style={{
                flex: 2,
                padding: '12px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                border: 'none',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {currentQ < total - 1 ? 'Next Question →' : 'Finish Reflection 🌟'}
            </button>
          </div>
        </div>
      ) : (
        // Guide closing message
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '24px',
          border: '1px solid rgba(168,85,247,0.3)',
          padding: '32px',
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🦉</div>
          <p style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: '16px',
            lineHeight: 1.7,
            marginBottom: '24px',
          }}>
            {characterGuide}
          </p>
          <button
            onClick={onComplete}
            style={{
              padding: '14px 32px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              border: 'none',
              color: 'white',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Continue Reading 📚
          </button>
        </div>
      )}

      {/* Socratic Hint Modal */}
      {showHint && prompt && (
        <SocraticHint
          hints={[prompt.hint_1, prompt.hint_2, prompt.hint_3]}
          onClose={() => setShowHint(false)}
        />
      )}
    </div>
  );
};

export default SELReflection;
