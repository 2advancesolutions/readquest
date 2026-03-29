import React, { useState } from 'react';

interface SocraticHintProps {
  hints: [string, string, string];  // 3 progressive hints
  onClose: () => void;
  context?: string;  // Optional short context (e.g. the question)
}

export const SocraticHint: React.FC<SocraticHintProps> = ({ hints, onClose, context }) => {
  const [revealed, setRevealed] = useState(0); // How many hints revealed: 0, 1, 2, 3

  const hintLabels = ['First Hint 💭', 'Bigger Clue 🔍', 'Almost There! 🎯'];
  const hintColors = [
    { bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.4)', text: '#818cf8' },
    { bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.4)', text: '#c084fc' },
    { bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.4)', text: '#f472b6' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'rgba(15, 10, 40, 0.98)',
        borderRadius: '24px',
        border: '1px solid rgba(168,85,247,0.3)',
        padding: '28px',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        animation: 'scaleIn 0.2s ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            width: '44px', height: '44px',
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px',
          }}>
            🦉
          </div>
          <div>
            <h3 style={{ margin: 0, color: 'white', fontSize: '16px', fontWeight: 700 }}>
              Sage's Hints
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
              Think it through step by step
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '20px',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Hints revealed so far */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {hints.slice(0, revealed).map((hint, i) => (
            <div
              key={i}
              style={{
                background: hintColors[i].bg,
                border: `1px solid ${hintColors[i].border}`,
                borderRadius: '14px',
                padding: '12px 16px',
                animation: 'slideDown 0.3s ease',
              }}
            >
              <p style={{
                margin: 0,
                fontSize: '12px',
                color: hintColors[i].text,
                fontWeight: 600,
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                {hintLabels[i]}
              </p>
              <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                {hint}
              </p>
            </div>
          ))}

          {revealed === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '20px',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '14px',
            }}>
              Tap the button below to get your first hint!
            </div>
          )}

          {revealed === 3 && (
            <div style={{
              background: 'rgba(74,222,128,0.1)',
              border: '1px solid rgba(74,222,128,0.3)',
              borderRadius: '14px',
              padding: '12px',
              textAlign: 'center',
            }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#4ade80' }}>
                🌟 You've got all the clues! Trust yourself — you know this!
              </p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {revealed < 3 ? (
            <button
              onClick={() => setRevealed(r => r + 1)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                border: 'none',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {revealed === 0 ? '💡 Show Hint 1' : `Show Hint ${revealed + 1}`}
            </button>
          ) : null}
          <button
            onClick={onClose}
            style={{
              flex: revealed === 3 ? 2 : 1,
              padding: '12px',
              borderRadius: '14px',
              background: revealed === 3
                ? 'linear-gradient(135deg, #4ade80, #16a34a)'
                : 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: revealed === 3 ? '#0f1117' : 'rgba(255,255,255,0.7)',
              fontSize: '14px',
              fontWeight: revealed === 3 ? 700 : 400,
              cursor: 'pointer',
            }}
          >
            {revealed === 3 ? "I've Got It! 🎉" : "I'll Try First"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes slideDown { from { transform: translateY(-8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default SocraticHint;
