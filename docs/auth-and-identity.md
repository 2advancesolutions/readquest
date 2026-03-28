# Auth & Identity

## Authentication Architecture

```
┌──────────────────┐     ┌─────────────────┐     ┌───────────────┐
│  Supabase Auth   │────▶│  Frontend       │────▶│  Backend      │
│  (email/password)│     │  (Session token) │     │  (X-Student-ID│
│                  │     │                  │     │   header)     │
└──────────────────┘     └─────────────────┘     └───────────────┘
```

## Parent vs Student Identity

ReadQuest has a **two-level identity system:**

### Level 1: Parent (Supabase Auth)
- Parent signs up via email/password through Supabase Auth
- Parent UUID comes from `auth.users` table (managed by Supabase)
- Session persisted in localStorage under key `readquest-auth`
- The `parents` table stores `first_name`, `last_name` — `id` matches `auth.users.id`

### Level 2: Student (Application-Level)
- Parent creates child profiles via `/add-kid`
- Each child gets a separate `students` table row with its own UUID
- The selected child's UUID is stored in `localStorage` as `readquest_student_id`
- This UUID is sent as `X-Student-ID` header on every API call

---

## Identity Flow

```
Parent logs in (Supabase auth)
      │
      ▼
Parent selects a child on Dashboard
      │
      ▼
localStorage.setItem('readquest_student_id', child_uuid)
      │
      ▼
Every API call:
  Axios interceptor reads localStorage → X-Student-ID header
      │
      ▼
Backend router reads: Header('x-student-id')
      │
      ▼
All DB queries scoped to that student_id
```

---

## Axios Interceptor (`services/api.ts`)

```typescript
api.interceptors.request.use(async (config) => {
  // PRIORITY 1: If caller already set X-Student-ID, respect it
  if (config.headers['X-Student-ID']) return config;

  // PRIORITY 2: Selected child from localStorage
  const selectedStudentId = localStorage.getItem('readquest_student_id');
  if (selectedStudentId) {
    config.headers['X-Student-ID'] = selectedStudentId;
    return config;
  }

  // PRIORITY 3: Fall back to parent's Supabase UUID
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) config.headers['X-Student-ID'] = session.user.id;
  return config;
});
```

### Priority Order:
1. **Explicit header** — Already set by the caller (rare)
2. **Selected child** — `readquest_student_id` in localStorage (normal case)
3. **Parent UUID** — Supabase auth user ID (fallback if no child selected)

---

## Supabase Client Config

```typescript
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'readquest-auth',
    storage: window.localStorage,
  },
})
```

- Session survives page refreshes via `persistSession: true`
- Token auto-refreshes via `autoRefreshToken: true`
- Custom storage key `readquest-auth` (not the default `sb-*`)

---

## Auth State in React (`App.tsx`)

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  setSession(session)
  if (event === 'INITIAL_SESSION') setLoading(false)
})
```

Uses `onAuthStateChange` instead of `getSession()` to avoid login flash on page load. `INITIAL_SESSION` fires first with persisted session.

---

## Backend: FK Guard on Story Generation

When generating a story, the backend auto-creates missing `parent` and `student` rows:

```python
# stories.py router — POST /stories/generate
if student doesn't exist:
    create Parent(id=x_student_id, first_name="User", last_name="")
    create Student(id=x_student_id, parent_id=x_student_id, name="Student", grade_level=req.grade)
```

This prevents FK violations on fresh databases. The auto-created rows use the same UUID for both parent and student (they refer to the same Supabase auth user who hasn't created a child profile yet).

---

## CORS Configuration (`main.py`)

```python
_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://readquest-frontend-2532.s3-website-us-east-1.amazonaws.com",
]
# + FRONTEND_URL env var
# + regex: https://*.cloudfront.net, https://*.awsapprunner.com
```

---

## Common Pitfalls

1. **No child selected** → `X-Student-ID` falls back to parent UUID → stories created under parent ID instead of child ID → shows up for ALL children
2. **Guest user** → If no auth and no localStorage, `x_student_id` becomes `"guest"` — stories still work but can't be associated with a real user later
3. **Token expiry** → Supabase auto-refreshes, but if it fails (e.g. offline), the `getSession()` call in the interceptor returns null → API calls go out without `X-Student-ID`
4. **localStorage key** → Auth uses `readquest-auth`, student selection uses `readquest_student_id` — don't confuse them
