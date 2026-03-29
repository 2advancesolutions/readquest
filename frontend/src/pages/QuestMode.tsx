import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface QuestLevel {
  id: string;
  level_number: number;
  name: string;
  description: string;
  required_stories: number;
  min_accuracy_pct: number;
  min_quiz_pct: number;
  min_assignment_score: number;
  xp_reward: number;
  badge_slug?: string;
}

interface QuestProgress {
  student_id: string;
  current_level: number;
  level_name: string;
  stories_completed: number;
  stories_required: number;
  avg_accuracy: number;
  min_accuracy_required: number;
  avg_quiz_score: number;
  min_quiz_required: number;
  avg_assignment_score: number;
  min_assignment_required: number;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const LEVEL_ICONS = ['🌱', '📖', '🦅', '📄', '🚀', '🏆', '🌟', '👑'];

export default function QuestMode() {
  const navigate = useNavigate();
  const [levels, setLevels] = useState<QuestLevel[]>([]);
  const [progress, setProgress] = useState<QuestProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const studentId = localStorage.getItem('selectedStudentId') || '';

  useEffect(() => {
    const load = async () => {
      try {
        const [levelsRes, progressRes] = await Promise.all([
          fetch(`${API_BASE}/api/quest/levels`),
          fetch(`${API_BASE}/api/quest/progress/${studentId}`),
        ]);
        const [lvls, prog] = await Promise.all([levelsRes.json(), progressRes.json()]);
        setLevels(lvls);
        setProgress(prog);
      } catch (e) {
        console.error('Quest load failed', e);
      } finally {
        setLoading(false);
      }
    };
    if (studentId) load();
    else setLoading(false);
  }, [studentId]);

  const currentLevel = progress?.current_level || 1;

  const getLevelStatus = (levelNum: number) => {
    if (levelNum < currentLevel) return 'completed';
    if (levelNum === currentLevel) return 'active';
    return 'locked';
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0a28 0%, #1a0a3e 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
          <p>Loading your Quest…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0a28 0%, #1a0a3e 50%, #0d1a3e 100%)',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      color: 'white',
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '20px 24px',
        display: 'flex', alignItems: 'center', gap: '16px',
      }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '12px', padding: '8px 16px', color: 'white',
            cursor: 'pointer', fontSize: '14px',
          }}
        >
          ← Back
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800,
            background: 'linear-gradient(135deg, #c084fc, #818cf8)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            📜 Reading Quest
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
            Master levels to unlock new powers!
          </p>
        </div>
      </div>

      {/* Active level stats */}
      {progress && (
        <div style={{ padding: '24px', background: 'rgba(168,85,247,0.08)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '32px' }}>{LEVEL_ICONS[currentLevel - 1] || '📚'}</span>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                  Level {currentLevel}: {progress.level_name}
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                  Current Quest
                </p>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#c084fc' }}>
                  {progress.stories_completed}/{progress.stories_required}
                </p>
                <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>stories</p>
              </div>
            </div>

            {/* Metrics bars */}
            {[
              { label: 'Reading Accuracy', value: progress.avg_accuracy, required: progress.min_accuracy_required, color: '#a855f7' },
              { label: 'Quiz Score', value: progress.avg_quiz_score, required: progress.min_quiz_required, color: '#6366f1' },
              { label: 'Assignment Score', value: progress.avg_assignment_score, required: progress.min_assignment_required, color: '#ec4899' },
            ].map(metric => (
              <div key={metric.label} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{metric.label}</span>
                  <span style={{ fontSize: '12px', color: metric.value >= metric.required ? '#4ade80' : 'rgba(255,255,255,0.5)' }}>
                    {Math.round(metric.value)}% / {metric.required}% needed
                    {metric.value >= metric.required ? ' ✅' : ''}
                  </span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, (metric.value / metric.required) * 100)}%`,
                    background: `linear-gradient(90deg, ${metric.color}99, ${metric.color})`,
                    borderRadius: '3px',
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Level map */}
      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <h3 style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
          Quest Map
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {levels.map((level, i) => {
            const status = getLevelStatus(level.level_number);
            return (
              <div
                key={level.id}
                style={{
                  background: status === 'active'
                    ? 'rgba(168,85,247,0.15)'
                    : status === 'completed'
                    ? 'rgba(74,222,128,0.08)'
                    : 'rgba(255,255,255,0.03)',
                  borderRadius: '18px',
                  border: status === 'active'
                    ? '1px solid rgba(168,85,247,0.4)'
                    : status === 'completed'
                    ? '1px solid rgba(74,222,128,0.25)'
                    : '1px solid rgba(255,255,255,0.07)',
                  padding: '16px 20px',
                  opacity: status === 'locked' ? 0.5 : 1,
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                {/* Icon */}
                <div style={{
                  width: '48px', height: '48px',
                  background: status === 'completed' ? 'rgba(74,222,128,0.2)'
                    : status === 'active' ? 'rgba(168,85,247,0.3)'
                    : 'rgba(255,255,255,0.06)',
                  borderRadius: '14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px', flexShrink: 0,
                }}>
                  {status === 'completed' ? '✅' : status === 'locked' ? '🔒' : LEVEL_ICONS[i] || '📚'}
                </div>
                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{
                      margin: 0, fontSize: '15px', fontWeight: 700,
                      color: status === 'completed' ? '#4ade80'
                        : status === 'active' ? '#c084fc'
                        : 'rgba(255,255,255,0.7)',
                    }}>
                      Level {level.level_number}: {level.name}
                    </h4>
                    {status === 'active' && (
                      <span style={{
                        background: 'rgba(168,85,247,0.3)', color: '#c084fc',
                        borderRadius: '20px', padding: '2px 8px', fontSize: '10px', fontWeight: 700,
                      }}>
                        CURRENT
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    {level.description}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                    {level.required_stories} stories • {level.min_accuracy_pct}% accuracy • +{level.xp_reward} XP
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/generate')}
          style={{
            width: '100%',
            marginTop: '24px',
            padding: '16px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            border: 'none',
            color: 'white',
            fontSize: '16px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 8px 30px rgba(124,58,237,0.4)',
          }}
        >
          📚 Start a Quest Story
        </button>
      </div>
    </div>
  );
}
