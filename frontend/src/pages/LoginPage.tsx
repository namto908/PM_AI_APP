import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '@/api/client';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await client.post('/auth/login', { 
        identifier: identifier.trim(), 
        password 
      });
      const me = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      setAuth(data.access_token, me.data);

      // Restore workspace — always re-sync after login
      try {
        const ws = await client.get('/auth/workspaces', {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        if (ws.data.length > 0) setActiveWorkspace(ws.data[0].id);
      } catch {
        // AppShell will handle
      }

      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-on-surface mb-1">
          TaskOps <span className="text-primary">AI</span>
        </h1>
        <p className="text-sm text-on-surface-variant mb-6">Sign in to your account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Email or Username</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm bg-surface-container text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm bg-surface-container text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:brightness-110 disabled:opacity-50 text-on-primary-fixed text-sm font-medium rounded-lg py-2 transition-all shadow-md shadow-primary/10"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-on-surface-variant">
          No account?{' '}
          <a href="/register" className="text-primary hover:underline font-bold">Register</a>
        </p>
      </div>
    </div>
  );
}
