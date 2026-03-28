import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface FluencySession {
  session_id: string;
  story_id: string;
  page_number: number;
  accuracy_pct: number;
  words_per_minute: number | null;
  feedback: string;
  recorded_at: string;
}

interface ChildSummary {
  student_id: string;
  name: string;
  grade_level: number;
  avatar_url?: string;
  fluency_summary: {
    session_count: number;
    avg_accuracy_pct: number | null;
    avg_wpm: number | null;
    recent_sessions: FluencySession[];
  };
  assignments: {
    id: string;
    title: string;
    status: string;
    assignment_type: string;
    created_at: string;
  }[];
  recent_reviews: {
    id: string;
    star_grade: number;
    comment?: string;
    reviewed_at: string;
  }[];
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const STAR_COLORS: Record<number, string> = {
  1: '#ef4444', 2: '#f97316', 3: '#fbbf24', 4: '#84cc16', 5: '#4ade80',
};

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ChildSummary | null>(null);
  const [reviewModal, setReviewModal] = useState<{ assignmentId: string; studentId: string } | null>(null);
  const [starGrade, setStarGrade] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const parentId = localStorage.getItem('parentId') || '';

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/parents/dashboard/${parentId}`);
        if (res.ok) {
          const data = await res.json();
          setChildren(data.children || []);
          if (data.children?.length > 0) setSelected(data.children[0]);
        }
      } catch { /* */ }
      setLoading(false);
    };
    if (parentId) load();
    else setLoading(false);
  }, [parentId]);

  const handleStarReview = async () => {
    if (!reviewModal || starGrade === 0) return;
    setSubmittingReview(true);
    try {
      await fetch(`${API_BASE}/api/parents/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_id: parentId,
          student_id: reviewModal.studentId,
          assignment_id: reviewModal.assignmentId,
          star_grade: starGrade,
          comment: comment.trim() || null,
        }),
      });
      setReviewModal(null);
      setStarGrade(0);
      setComment('');
    } catch { /* */ }
    setSubmittingReview(false);
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
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👨‍👩‍👧</div>
          <p>Loading dashboard…</p>
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
            borderRadius: '12px', padding: '8px 16px', color: 'white', cursor: 'pointer', fontSize: '14px',
          }}
        >
          ← Back
        </button>
        <div>
          <h1 style={{
            margin: 0, fontSize: '22px', fontWeight: 800,
            background: 'linear-gradient(135deg, #c084fc, #818cf8)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            👨‍👩‍👧 Parent Dashboard
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
            Stay in the loop with your child's reading
          </p>
        </div>
      </div>

      {children.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
          <h3 style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>No children found</h3>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
            Add a child profile first to see their progress here.
          </p>
          <button
            onClick={() => navigate('/add-kid')}
            style={{
              marginTop: '20px', padding: '12px 24px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              border: 'none', color: 'white', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            + Add Child
          </button>
        </div>
      ) : (
        <div style={{ padding: '24px', maxWidth: '640px', margin: '0 auto' }}>
          {/* Child selector */}
          {children.length > 1 && (
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', overflowX: 'auto' }}>
              {children.map(child => (
                <button
                  key={child.student_id}
                  onClick={() => setSelected(child)}
                  style={{
                    padding: '8px 20px', borderRadius: '20px', whiteSpace: 'nowrap',
                    background: selected?.student_id === child.student_id
                      ? 'linear-gradient(135deg, #7c3aed, #4f46e5)'
                      : 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                  }}
                >
                  {child.avatar_url ? child.avatar_url : '🧒'} {child.name}
                </button>
              ))}
            </div>
          )}

          {selected && (
            <>
              {/* Child header card */}
              <div style={{
                background: 'rgba(168,85,247,0.1)', borderRadius: '20px',
                border: '1px solid rgba(168,85,247,0.2)', padding: '20px', marginBottom: '20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px',
                  }}>
                    {selected.avatar_url || '🧒'}
                  </div>
                  <div>
                    <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 700 }}>{selected.name}</h2>
                    <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                      Grade {selected.grade_level} · {selected.fluency_summary.session_count} reading sessions
                    </p>
                  </div>
                </div>

                {/* Key metrics */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  {[
                    { label: 'Avg Accuracy', value: selected.fluency_summary.avg_accuracy_pct !== null ? `${selected.fluency_summary.avg_accuracy_pct}%` : '—', icon: '🎯' },
                    { label: 'Avg Speed', value: selected.fluency_summary.avg_wpm ? `${selected.fluency_summary.avg_wpm} WPM` : '—', icon: '⚡' },
                    { label: 'Assignments', value: `${selected.assignments.length}`, icon: '📝' },
                  ].map(m => (
                    <div key={m.label} style={{
                      flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '14px',
                      padding: '12px', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '18px', marginBottom: '4px' }}>{m.icon}</div>
                      <div style={{ fontSize: '16px', fontWeight: 700 }}>{m.value}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Sessions */}
              {selected.fluency_summary.recent_sessions.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{
                    fontSize: '14px', color: 'rgba(255,255,255,0.5)',
                    textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px',
                  }}>
                    Recent Reading Sessions
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selected.fluency_summary.recent_sessions.map(session => (
                      <div key={session.session_id} style={{
                        background: 'rgba(255,255,255,0.04)', borderRadius: '14px',
                        border: '1px solid rgba(255,255,255,0.08)', padding: '14px 16px',
                        display: 'flex', alignItems: 'center', gap: '14px',
                      }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '10px',
                          background: session.accuracy_pct >= 80 ? 'rgba(74,222,128,0.2)' : session.accuracy_pct >= 60 ? 'rgba(251,191,36,0.2)' : 'rgba(239,68,68,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '16px', fontWeight: 800,
                          color: session.accuracy_pct >= 80 ? '#4ade80' : session.accuracy_pct >= 60 ? '#fbbf24' : '#f87171',
                        }}>
                          {Math.round(session.accuracy_pct)}%
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: '0 0 2px', fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
                            Page {session.page_number}
                            {session.words_per_minute ? ` · ${session.words_per_minute} WPM` : ''}
                          </p>
                          <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                            {session.feedback.slice(0, 60)}…
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assignments to review */}
              {selected.assignments.filter(a => a.status === 'completed').length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{
                    fontSize: '14px', color: 'rgba(255,255,255,0.5)',
                    textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px',
                  }}>
                    ⭐ Ready to Star Grade
                  </h3>
                  {selected.assignments.filter(a => a.status === 'completed').map(a => (
                    <div key={a.id} style={{
                      background: 'rgba(251,191,36,0.08)', borderRadius: '14px',
                      border: '1px solid rgba(251,191,36,0.25)', padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px',
                    }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: 600 }}>{a.title}</p>
                        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                          Completed · Waiting for your review
                        </p>
                      </div>
                      <button
                        onClick={() => setReviewModal({ assignmentId: a.id, studentId: selected.student_id })}
                        style={{
                          padding: '8px 16px', borderRadius: '12px',
                          background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.4)',
                          color: '#fbbf24', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        ⭐ Grade It
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent reviews sent */}
              {selected.recent_reviews.length > 0 && (
                <div>
                  <h3 style={{
                    fontSize: '14px', color: 'rgba(255,255,255,0.5)',
                    textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px',
                  }}>
                    Your Recent Feedback
                  </h3>
                  {selected.recent_reviews.map(r => (
                    <div key={r.id} style={{
                      background: 'rgba(255,255,255,0.04)', borderRadius: '14px',
                      border: '1px solid rgba(255,255,255,0.08)', padding: '12px 16px',
                      marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px',
                    }}>
                      <div style={{ fontSize: '20px', color: STAR_COLORS[r.star_grade] || '#fbbf24' }}>
                        {'★'.repeat(r.star_grade)}{'☆'.repeat(5 - r.star_grade)}
                      </div>
                      <div>
                        {r.comment && (
                          <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                            "{r.comment}"
                          </p>
                        )}
                        <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                          {new Date(r.reviewed_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Star Grade Modal */}
      {reviewModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div style={{
            background: 'rgba(15,10,40,0.98)', borderRadius: '24px',
            border: '1px solid rgba(251,191,36,0.3)', padding: '28px',
            maxWidth: '360px', width: '100%',
          }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 700 }}>
              ⭐ Star Grade
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
              How did your child do? Your feedback motivates them!
            </p>

            {/* Stars */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '20px' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setStarGrade(star)}
                  style={{
                    fontSize: '32px', background: 'none', border: 'none', cursor: 'pointer',
                    color: star <= starGrade ? STAR_COLORS[star] : 'rgba(255,255,255,0.2)',
                    transition: 'all 0.15s',
                    transform: star <= starGrade ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Leave an encouraging note for your child (optional)…"
              style={{
                width: '100%', minHeight: '80px', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '12px', padding: '12px', color: 'white',
                fontSize: '13px', resize: 'vertical', outline: 'none', fontFamily: 'inherit',
                marginBottom: '16px',
              }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setReviewModal(null)}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '14px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleStarReview}
                disabled={starGrade === 0 || submittingReview}
                style={{
                  flex: 2, padding: '12px', borderRadius: '12px',
                  background: starGrade > 0 ? 'linear-gradient(135deg, #fbbf24, #f97316)' : 'rgba(255,255,255,0.1)',
                  border: 'none', color: starGrade > 0 ? '#0f1117' : 'rgba(255,255,255,0.3)',
                  fontWeight: 700, cursor: starGrade > 0 ? 'pointer' : 'not-allowed', fontSize: '14px',
                }}
              >
                {submittingReview ? 'Sending…' : 'Send Grade ⭐'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
