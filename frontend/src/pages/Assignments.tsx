import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Task {
  type: string;
  prompt: string;
  options?: string[];
  correct_answer?: string;
  hint?: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  assignment_type: string;
  status: 'pending' | 'completed' | 'reviewed';
  difficulty_level: number;
  source: string;
  created_at: string;
}

interface AssignmentDetail extends Assignment {
  content: Task[];
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const TYPE_ICONS: Record<string, string> = {
  vocabulary: '📚', fluency: '🎤', comprehension: '🔍', mixed: '⭐',
};
const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', label: 'To Do' },
  completed: { bg: 'rgba(74,222,128,0.15)', color: '#4ade80', label: 'Done · Needs Review' },
  reviewed:  { bg: 'rgba(168,85,247,0.15)', color: '#c084fc', label: '⭐ Reviewed' },
};

export default function Assignments() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [active, setActive] = useState<AssignmentDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showHintIdx, setShowHintIdx] = useState<number | null>(null);

  const studentId = localStorage.getItem('selectedStudentId') || '';

  const loadAssignments = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/assignments/${studentId}`);
      if (res.ok) setAssignments(await res.json());
    } catch { /*  */ }
    setLoading(false);
  };

  useEffect(() => { if (studentId) loadAssignments(); else setLoading(false); }, [studentId]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/assignments/generate/${studentId}`, { method: 'POST' });
      if (res.ok) {
        await loadAssignments();
      }
    } catch { /* */ }
    setGenerating(false);
  };

  const openAssignment = async (id: string) => {
    const res = await fetch(`${API_BASE}/api/assignments/detail/${id}`);
    if (res.ok) {
      setActive(await res.json());
      setAnswers({});
      setSubmitted(false);
      setScore(null);
    }
  };

  const handleSubmit = async () => {
    if (!active) return;
    const res = await fetch(`${API_BASE}/api/assignments/${active.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-student-id': studentId },
      body: JSON.stringify({ answers }),
    });
    if (res.ok) {
      const data = await res.json();
      setScore(data.score_pct);
      setSubmitted(true);
      await loadAssignments();
    }
  };

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
          onClick={() => { if (active) { setActive(null); } else { navigate('/dashboard'); } }}
          style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '12px', padding: '8px 16px', color: 'white', cursor: 'pointer', fontSize: '14px',
          }}
        >
          ← {active ? 'Back' : 'Dashboard'}
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800,
            background: 'linear-gradient(135deg, #c084fc, #818cf8)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            📝 My Assignments
          </h1>
        </div>
        {!active && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              marginLeft: 'auto',
              padding: '10px 20px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              border: 'none', color: 'white', fontSize: '13px', fontWeight: 700,
              cursor: generating ? 'wait' : 'pointer',
              opacity: generating ? 0.7 : 1,
            }}
          >
            {generating ? '✨ Generating…' : '+ New Assignment'}
          </button>
        )}
      </div>

      {/* Assignment detail view */}
      {active ? (
        <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            background: 'rgba(168,85,247,0.1)', borderRadius: '20px',
            border: '1px solid rgba(168,85,247,0.2)', padding: '20px', marginBottom: '24px',
          }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 700 }}>{active.title}</h2>
            <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>{active.description}</p>
          </div>

          {active.content.map((task, idx) => (
            <div key={idx} style={{
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '18px', border: '1px solid rgba(255,255,255,0.1)',
              padding: '20px', marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{
                  background: 'rgba(168,85,247,0.2)', borderRadius: '8px',
                  padding: '2px 10px', fontSize: '11px', color: '#c084fc', fontWeight: 600,
                }}>
                  {(task.type || '').replace('_', ' ').toUpperCase()}
                </span>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Task {idx + 1}</span>
              </div>

              <p style={{ margin: '0 0 12px', fontSize: '15px', lineHeight: 1.6, color: 'rgba(255,255,255,0.9)' }}>
                {task.prompt}
              </p>

              {/* Multiple choice */}
              {task.options && task.type === 'multiple_choice' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {task.options.map((opt, oi) => (
                    <button
                      key={oi}
                      onClick={() => !submitted && setAnswers(a => ({ ...a, [idx]: opt }))}
                      style={{
                        padding: '10px 16px', borderRadius: '12px', textAlign: 'left',
                        cursor: submitted ? 'default' : 'pointer',
                        background: submitted
                          ? opt === task.correct_answer ? 'rgba(74,222,128,0.2)'
                            : answers[idx] === opt ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)'
                          : answers[idx] === opt ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)',
                        border: submitted
                          ? opt === task.correct_answer ? '1px solid rgba(74,222,128,0.5)'
                            : answers[idx] === opt ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.08)'
                          : answers[idx] === opt ? '1px solid rgba(168,85,247,0.5)' : '1px solid rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.85)', fontSize: '14px', transition: 'all 0.2s',
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Open answer */}
              {(!task.options || task.type !== 'multiple_choice') && (
                <textarea
                  value={answers[idx] || ''}
                  onChange={e => !submitted && setAnswers(a => ({ ...a, [idx]: e.target.value }))}
                  readOnly={submitted}
                  style={{
                    width: '100%', minHeight: '80px', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '12px', padding: '12px', color: 'white',
                    fontSize: '14px', resize: 'vertical', outline: 'none', fontFamily: 'inherit',
                  }}
                  placeholder="Write your answer here…"
                />
              )}

              {/* Hint */}
              {task.hint && !submitted && (
                <button
                  onClick={() => setShowHintIdx(showHintIdx === idx ? null : idx)}
                  style={{
                    background: 'transparent', border: 'none',
                    color: 'rgba(168,85,247,0.7)', fontSize: '12px', cursor: 'pointer',
                    marginTop: '8px', padding: 0,
                  }}
                >
                  {showHintIdx === idx ? '▲ Hide hint' : '💡 Show hint'}
                </button>
              )}
              {showHintIdx === idx && task.hint && (
                <p style={{
                  margin: '8px 0 0', fontSize: '13px', color: 'rgba(168,85,247,0.8)',
                  fontStyle: 'italic',
                }}>
                  {task.hint}
                </p>
              )}
            </div>
          ))}

          {/* Submit / Score */}
          {!submitted ? (
            <button
              onClick={handleSubmit}
              style={{
                width: '100%', padding: '16px', borderRadius: '18px',
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                border: 'none', color: 'white', fontSize: '16px', fontWeight: 700,
                cursor: 'pointer', marginTop: '8px',
              }}
            >
              Submit Answers 🚀
            </button>
          ) : (
            <div style={{
              background: score !== null && score >= 70 ? 'rgba(74,222,128,0.1)' : 'rgba(251,191,36,0.1)',
              borderRadius: '18px',
              border: `1px solid ${score !== null && score >= 70 ? 'rgba(74,222,128,0.3)' : 'rgba(251,191,36,0.3)'}`,
              padding: '24px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>
                {score !== null && score >= 70 ? '🎉' : '💪'}
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: 800 }}>
                {score !== null ? `${score}%` : '—'}
              </h3>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
                {score !== null && score >= 70
                  ? "Amazing work! Your parent will see this soon! ⭐"
                  : "Good effort! Keep practicing — you'll get better! 📚"}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Assignment list */
        <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Loading…</p>
          ) : assignments.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '48px 24px',
              background: 'rgba(255,255,255,0.03)', borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
              <h3 style={{ margin: '0 0 8px', color: 'rgba(255,255,255,0.7)' }}>No assignments yet!</h3>
              <p style={{ margin: '0 0 24px', fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
                Tap "+ New Assignment" to get personalized practice.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {assignments.map(a => {
                const badge = STATUS_BADGE[a.status] || STATUS_BADGE.pending;
                return (
                  <div
                    key={a.id}
                    onClick={() => openAssignment(a.id)}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: '18px', border: '1px solid rgba(255,255,255,0.1)',
                      padding: '16px 20px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '16px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{
                      width: '48px', height: '48px',
                      background: 'rgba(168,85,247,0.15)', borderRadius: '14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
                    }}>
                      {TYPE_ICONS[a.assignment_type] || '📝'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600 }}>{a.title}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          background: badge.bg, color: badge.color,
                          borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 600,
                        }}>
                          {badge.label}
                        </span>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                          Level {a.difficulty_level}
                        </span>
                      </div>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '18px' }}>›</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
