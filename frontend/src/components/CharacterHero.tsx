import React, { useState, useEffect, useRef } from 'react';

// ─── Character roster ─────────────────────────────────────────────────────────
export const CHARACTERS = [
  {
    emoji: '🦉',
    name: 'Professor Hoot',
    title: 'The Wise Storyteller',
    desc: 'Ancient keeper of tales, guide to every young reader.',
    color: '#9B5EFF',
    glow: 'rgba(155,94,255,0.45)',
    accent: '#c09cff',
    bg: 'linear-gradient(145deg, #1a0a3e 0%, #2d1060 60%, #0b0c1f 100%)',
  },
  {
    emoji: '🐉',
    name: 'Draco the Bold',
    title: 'Guardian of Adventures',
    desc: 'Breathes life into epic quests waiting to be told.',
    color: '#10B981',
    glow: 'rgba(16,185,129,0.4)',
    accent: '#6ee7b7',
    bg: 'linear-gradient(145deg, #062114 0%, #0d3d26 60%, #0b0c1f 100%)',
  },
  {
    emoji: '🦋',
    name: 'Luna the Explorer',
    title: 'Wings of Curiosity',
    desc: 'Flutters through worlds of wonder and endless imagination.',
    color: '#EC4899',
    glow: 'rgba(236,72,153,0.4)',
    accent: '#f9a8d4',
    bg: 'linear-gradient(145deg, #300a1e 0%, #5c1038 60%, #0b0c1f 100%)',
  },
  {
    emoji: '🦊',
    name: 'Finn the Clever',
    title: 'Master of Mystery',
    desc: 'Outwits every puzzle hidden between the pages.',
    color: '#F97316',
    glow: 'rgba(249,115,22,0.4)',
    accent: '#fdba74',
    bg: 'linear-gradient(145deg, #2c1200 0%, #4a2200 60%, #0b0c1f 100%)',
  },
  {
    emoji: '🐬',
    name: 'Pearl the Swift',
    title: 'Spirit of the Sea',
    desc: 'Dives deep into ocean-floor stories only dreamers discover.',
    color: '#3B82F6',
    glow: 'rgba(59,130,246,0.4)',
    accent: '#93c5fd',
    bg: 'linear-gradient(145deg, #050e2a 0%, #0d2458 60%, #0b0c1f 100%)',
  },
  {
    emoji: '🦁',
    name: 'Rex the Brave',
    title: 'Champion of Words',
    desc: 'Roars with pride for every reader who dares to begin.',
    color: '#F59E0B',
    glow: 'rgba(245,158,11,0.4)',
    accent: '#fcd34d',
    bg: 'linear-gradient(145deg, #1f1000 0%, #3b1f00 60%, #0b0c1f 100%)',
  },
];

// Pick once per page-load session, stable across hot-reload
export const SESSION_IDX = Math.floor(Math.random() * CHARACTERS.length);

// ─── Component ────────────────────────────────────────────────────────────────
export default function CharacterHero() {
  const char = CHARACTERS[SESSION_IDX];
  const [visible, setVisible] = useState(false);
  const particlesRef = useRef<{ x: number; y: number; size: number; delay: number; dur: number }[]>([]);

  if (particlesRef.current.length === 0) {
    particlesRef.current = Array.from({ length: 20 }, (_, i) => ({
      x: (i * 17 + 7) % 97,
      y: (i * 23 + 3) % 91,
      size: (i % 3) + 1,
      delay: (i * 0.37) % 3,
      dur: 2.5 + (i % 3),
    }));
  }

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="auth-hero char-hero"
      style={{
        background: char.bg,
        '--char-color': char.color,
        '--char-glow': char.glow,
        '--char-accent': char.accent,
      } as React.CSSProperties}
    >
      {/* Ambient particles */}
      {particlesRef.current.map((p, i) => (
        <div
          key={i}
          className="char-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        />
      ))}

      {/* Glow orb */}
      <div className="char-glow-orb" />

      {/* Character card */}
      <div className={`char-card ${visible ? 'char-card--in' : ''}`}>
        <div className="char-emoji-wrap">
          <div className="char-emoji-ring" />
          <div className="char-emoji">{char.emoji}</div>
        </div>

        <div className="char-name" style={{ color: char.accent }}>{char.name}</div>
        <div className="char-title">{char.title}</div>
        <div className="char-desc">{char.desc}</div>

        {/* Dot selector */}
        <div className="char-dots">
          {CHARACTERS.map((_, i) => (
            <div
              key={i}
              className={`char-dot ${i === SESSION_IDX ? 'char-dot--active' : ''}`}
              style={i === SESSION_IDX ? { background: char.accent } : {}}
            />
          ))}
        </div>
      </div>

      {/* Brand */}
      <div className="char-brand">ReadQuest ✨</div>
    </div>
  );
}
