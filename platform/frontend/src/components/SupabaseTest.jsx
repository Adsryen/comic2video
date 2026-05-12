import React, { useState, useEffect } from 'react';
import { supabase } from '../context/AuthContext';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Supabase Connection Test Page
 * Use this to verify your Supabase setup is working correctly
 * Access at: /test-supabase
 */
const SupabaseTest = () => {
  const [results, setResults] = useState({
    envVars: null,
    connection: null,
    auth: null,
    email: null,
  });
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState({});

  // Test 1: Check Environment Variables
  const testEnvVars = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const result = {
      status: url && key ? 'success' : 'error',
      message: url && key 
        ? 'Environment variables are correctly set' 
        : 'Missing environment variables',
      details: {
        url: url ? '✓ Present' : '✗ Missing',
        key: key ? '✓ Present' : '✗ Missing',
      }
    };
    
    setResults(prev => ({ ...prev, envVars: result }));
  };

  // Test 2: Check Supabase Connection
  const testConnection = async () => {
    setLoading(prev => ({ ...prev, connection: true }));
    try {
      const { data, error } = await supabase.auth.getSession();
      
      const result = {
        status: !error ? 'success' : 'error',
        message: !error 
          ? 'Successfully connected to Supabase' 
          : `Connection error: ${error.message}`,
        details: {
          session: data?.session ? 'Active session found' : 'No active session',
        }
      };
      
      setResults(prev => ({ ...prev, connection: result }));
    } catch (err) {
      setResults(prev => ({ 
        ...prev, 
        connection: { 
          status: 'error', 
          message: `Failed to connect: ${err.message}`,
          details: {}
        } 
      }));
    } finally {
      setLoading(prev => ({ ...prev, connection: false }));
    }
  };

  // Test 3: Check Auth Configuration
  const testAuthConfig = async () => {
    setLoading(prev => ({ ...prev, auth: true }));
    try {
      // Try to get user (will work if session exists)
      const { data: { user }, error } = await supabase.auth.getUser();
      
      const result = {
        status: !error ? 'success' : 'warning',
        message: user 
          ? `Logged in as: ${user.email}` 
          : 'Auth is configured (no user logged in)',
        details: {
          userId: user?.id || 'N/A',
          email: user?.email || 'Not logged in',
        }
      };
      
      setResults(prev => ({ ...prev, auth: result }));
    } catch (err) {
      setResults(prev => ({ 
        ...prev, 
        auth: { 
          status: 'error', 
          message: `Auth config error: ${err.message}`,
          details: {}
        } 
      }));
    } finally {
      setLoading(prev => ({ ...prev, auth: false }));
    }
  };

  // Test 4: Send Test Email
  const testEmail = async () => {
    if (!testEmail) {
      alert('Please enter an email address');
      return;
    }

    setLoading(prev => ({ ...prev, email: true }));
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email: testEmail.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
        }
      });

      if (error) throw error;

      const result = {
        status: 'success',
        message: `OTP sent to ${testEmail}! Check your email (and spam folder).`,
        details: {
          messageId: data?.message_id || 'N/A',
          note: 'Check your email inbox and spam folder'
        }
      };
      
      setResults(prev => ({ ...prev, email: result }));
    } catch (err) {
      let errorMsg = err.message;
      
      // Provide specific guidance based on error
      if (errorMsg.includes('rate limit')) {
        errorMsg = 'Rate limit exceeded. Supabase free tier allows 3 emails/hour. Wait and try again.';
      } else if (errorMsg.includes('Email not allowed')) {
        errorMsg = 'Email not authorized. Check Supabase Auth settings.';
      }

      setResults(prev => ({ 
        ...prev, 
        email: { 
          status: 'error', 
          message: errorMsg,
          details: {}
        } 
      }));
    } finally {
      setLoading(prev => ({ ...prev, email: false }));
    }
  };

  // Run initial tests on mount
  useEffect(() => {
    testEnvVars();
    testConnection();
    testAuthConfig();
  }, []);

  const StatusIcon = ({ status }) => {
    if (status === 'success') return <CheckCircle className="w-5 h-5 text-green-400" />;
    if (status === 'error') return <XCircle className="w-5 h-5 text-red-400" />;
    if (status === 'warning') return <AlertCircle className="w-5 h-5 text-yellow-400" />;
    return <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />;
  };

  const TestCard = ({ title, result, onRetest, loading: isLoading }) => (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {onRetest && (
          <button
            onClick={onRetest}
            disabled={isLoading}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-purple-300 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {result ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <StatusIcon status={result.status} />
            <p className="text-sm text-purple-200">{result.message}</p>
          </div>

          {Object.keys(result.details).length > 0 && (
            <div className="ml-8 space-y-1 text-xs text-purple-300/70">
              {Object.entries(result.details).map(([key, value]) => (
                <div key={key}>
                  <span className="font-medium">{key}:</span> {value}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
          <p className="text-sm text-purple-200">Testing...</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-gray-900 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Supabase Connection Test
          </h1>
          <p className="text-purple-200">
            Verify your Supabase setup is configured correctly
          </p>
        </div>

        <div className="space-y-4">
          <TestCard
            title="1. Environment Variables"
            result={results.envVars}
            onRetest={testEnvVars}
          />

          <TestCard
            title="2. Supabase Connection"
            result={results.connection}
            onRetest={testConnection}
            loading={loading.connection}
          />

          <TestCard
            title="3. Authentication Setup"
            result={results.auth}
            onRetest={testAuthConfig}
            loading={loading.auth}
          />

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              4. Test Email OTP
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <button
                onClick={testEmail}
                disabled={loading.email}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading.email ? 'Sending...' : 'Send Test OTP'}
              </button>

              {results.email && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <StatusIcon status={results.email.status} />
                    <p className="text-sm text-purple-200">{results.email.message}</p>
                  </div>

                  {Object.keys(results.email.details).length > 0 && (
                    <div className="ml-8 space-y-1 text-xs text-purple-300/70">
                      {Object.entries(results.email.details).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-medium">{key}:</span> {value}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 p-6 rounded-xl">
          <h4 className="font-semibold text-white mb-2">Common Issues:</h4>
          <ul className="space-y-2 text-sm text-purple-200">
            <li>• <strong>Rate Limit:</strong> Supabase free tier allows 3 emails/hour</li>
            <li>• <strong>No Email:</strong> Check spam folder and Supabase email settings</li>
            <li>• <strong>Connection Error:</strong> Verify URL and API key in .env</li>
            <li>• <strong>Auth Not Enabled:</strong> Enable Email Auth in Supabase Dashboard</li>
          </ul>
        </div>

        <div className="mt-6 text-center">
          <a
            href="https://supabase.com/dashboard/project/iljgvihujaeqnijktaqg"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-300 hover:text-white underline text-sm"
          >
            Open Supabase Dashboard →
          </a>
        </div>
      </div>
    </div>
  );
};

export default SupabaseTest;