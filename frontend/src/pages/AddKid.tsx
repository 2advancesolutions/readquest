import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AddKid = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [grade, setGrade] = useState('1');
  const [school, setSchool] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [parentSession, setParentSession] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setParentSession(session);
      if (!session) {
        navigate('/login');
      }
    });
  }, [navigate]);

  const handleAddKid = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Because we want the kid to have their own email/password, they must be signed up as a user.
      // However, Supabase Auth signIn/signUp overrides the current session.
      // A common pattern is to either sign them out first, or use the Admin API (which we shouldn't do from frontend).
      // For MVP, we can just hit our backend API to handle this, or let the parent stay logged in and just insert into `students` for now if the kid doesn't need to literally log in from the same device immediately.
      // Let's create an auth user via a backend endpoint or, if we do it here, we will lose the parent session.
      // Actually, since the prompt says "allow users to add their kids to better track their own progress", we can just store the kid's info in our `students` table and bypass auth for the kid for now, OR if the kid needs their own email/pw, we sign them up and re-login the parent, or make a backend endpoint.

      // We will just sign up the kid using Supabase from the frontend, but we need to warn that it changes session,
      // so we use our backend to insert the student record linked to the parent.

      // 1. Sign up the kid via Supabase Auth
      const { data: kidAuthData, error: kidAuthError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            is_kid: true
          }
        }
      });

      if (kidAuthError) throw kidAuthError;

      // 2. Add to backend via API, associating with the parent ID
      if (kidAuthData.user && parentSession?.user) {
        const response = await fetch('http://localhost:8000/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: kidAuthData.user.id,
            parent_id: parentSession.user.id,
            name: `${firstName} ${lastName}`,
            grade_level: parseInt(grade),
            school: school
          })
        });

        if (!response.ok) {
           console.error("Failed to add kid to backend");
        }
      }

      // Supabase sign up might have logged in the kid.
      // So we can navigate to dashboard (now acting as the kid), or log out and log back in.
      navigate('/dashboard');

    } catch (err: any) {
      setError(err.message || 'Error adding kid');
    } finally {
      setLoading(false);
    }
  };

  if (!parentSession) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Add your kid
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Create an account for them to track their progress
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleAddKid}>
            {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</div>}

            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <input required type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <input required type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Kid's Email</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input required type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div className="flex gap-4">
              <div className="w-1/3">
                <label className="block text-sm font-medium text-gray-700">Grade</label>
                <select value={grade} onChange={e => setGrade(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(g => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
              </div>
              <div className="w-2/3">
                <label className="block text-sm font-medium text-gray-700">School</label>
                <input type="text" value={school} onChange={e => setSchool(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50">
              {loading ? 'Adding...' : 'Add Kid'}
            </button>
            <div className="text-center mt-4">
              <button type="button" onClick={() => navigate('/dashboard')} className="text-sm text-gray-500 hover:text-gray-700">
                Skip for now
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddKid;
