import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Request interceptor — attach student_id from localStorage
api.interceptors.request.use((config) => {
  const studentId = localStorage.getItem('readquest_student_id');
  if (studentId) config.headers['X-Student-ID'] = studentId;
  return config;
});

export const studentsApi = {
  create: (name: string, grade: number) =>
    api.post('/students', { name, grade_level: grade }),
  get: (id: string) => api.get(`/students/${id}`),
};

export const storiesApi = {
  analyzeCharacter: (character: string) =>
    api.post('/stories/analyze-character', { character }),
  generate: (grade: number, theme: string, character_name: string, language = 'english', artStyle = 'cartoon') =>
    api.post('/stories/generate', { grade, theme, character_name, language, art_style: artStyle }),
  list: () => api.get('/stories'),
  get: (id: string) => api.get(`/stories/${id}`),
};

export const quizzesApi = {
  submit: (questionId: string, answer: string) =>
    api.post(`/quizzes/${questionId}/submit`, { answer }),
};

export const rewardsApi = {
  getXP: () => api.get('/rewards/xp'),
  getXPHistory: () => api.get('/rewards/xp/history'),
  getBadges: () => api.get('/rewards/badges'),
  getStreaks: () => api.get('/rewards/streaks'),
  getLeaderboard: () => api.get('/rewards/leaderboard'),
};

export const progressApi = {
  markPageRead: (storyId: string, pageNumber: number) =>
    api.post(`/stories/${storyId}/pages/${pageNumber}/read`),
  markBookComplete: (storyId: string) =>
    api.post(`/stories/${storyId}/complete`),
};

export default api;
