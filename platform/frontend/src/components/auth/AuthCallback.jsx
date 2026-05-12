// src/components/auth/AuthCallback.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        if (!isSupabaseConfigured) {
          setStatus('error');
          setMessage('Authentication is disabled because Supabase is not configured.');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        console.log('🔍 Callback URL:', window.location.href);
        
        // ✅ Wait for Supabase to process the hash fragment
        const { data: { session }, error } = await supabase.auth.getSession();

        console.log('🔍 Session:', session);
        console.log('🔍 Error:', error);

        if (error) {
          console.error('❌ Auth error:', error);
          setStatus('error');
          setMessage(error.message || 'Authentication failed');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        if (!session) {
          // ✅ Sometimes the session isn't immediately available
          // Listen for auth state change
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔍 Auth event:', event);
            
            if (event === 'SIGNED_IN' && session) {
              console.log('✅ Sign in successful');
              setStatus('success');
              setMessage('Authentication successful! Redirecting...');

              setTimeout(() => {
                const saved = sessionStorage.getItem("auth_redirect");
                sessionStorage.removeItem("auth_redirect");

                if (saved) {
                  const { pathname, search, state } = JSON.parse(saved);
                  navigate(`${pathname}${search || ""}`, { replace: true, state });
                } else {
                  navigate("/projects", { replace: true });
                }
              }, 1500);

              subscription.unsubscribe();
            } else if (event === 'SIGNED_OUT') {
              setStatus('error');
              setMessage('Authentication failed');
              setTimeout(() => navigate('/login'), 3000);
              subscription.unsubscribe();
            }
          });

          // Cleanup after 10 seconds if nothing happens
          setTimeout(() => {
            subscription.unsubscribe();
            if (status === 'loading') {
              setStatus('error');
              setMessage('Authentication timeout');
              setTimeout(() => navigate('/login'), 3000);
            }
          }, 10000);

          return;
        }

        // ✅ Session already exists
        setStatus('success');
        setMessage('Authentication successful! Redirecting...');

        setTimeout(() => {
          const saved = sessionStorage.getItem("auth_redirect");
          sessionStorage.removeItem("auth_redirect");

          if (saved) {
            const { pathname, search, state } = JSON.parse(saved);
            navigate(`${pathname}${search || ""}`, { replace: true, state });
          } else {
            navigate("/projects", { replace: true });
          }
        }, 1500);

      } catch (err) {
        console.error('❌ Callback error:', err);
        setStatus('error');
        setMessage('An unexpected error occurred');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="backdrop-blur-2xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl p-8 sm:p-10 max-w-md w-full">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 mb-4">
            {status === 'loading' && (
              <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="w-10 h-10 text-green-400" />
            )}
            {status === 'error' && (
              <XCircle className="w-10 h-10 text-red-400" />
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {status === 'loading' && 'Authenticating...'}
              {status === 'success' && 'Success!'}
              {status === 'error' && 'Authentication Failed'}
            </h2>
            <p className="text-purple-200">{message}</p>
          </div>

          {status === 'loading' && (
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 animate-pulse"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;