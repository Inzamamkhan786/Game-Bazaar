import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../api';
import toast from 'react-hot-toast';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await authAPI.forgotPassword(email);
      // Dev mode returns token in response
      if (res.data.data?.resetToken) setResetToken(res.data.data.resetToken);
      setSent(true);
      toast.success('Reset instructions sent!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="glass-card rounded-3xl p-8">
          <Link to="/login" className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <span className="font-display font-bold text-lg text-slate-900">Game<span className="text-blue-600">Bazaar</span></span>
          </Link>

          {!sent ? (
            <>
              <div className="text-3xl mb-3">🔐</div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Forgot Password?</h1>
              <p className="text-slate-500 text-sm mb-8">Enter your email to receive reset instructions</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Email Address</label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="you@example.com"
                  />
                </div>
                <button id="forgot-submit" type="submit" disabled={loading} className="w-full btn-primary justify-center py-3">
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="font-bold text-xl text-slate-900 mb-2">Check Your Email</h2>
              <p className="text-slate-500 text-sm mb-6">Reset instructions sent to <strong>{email}</strong></p>
              {resetToken && (
                <div className="bg-blue-50 rounded-xl p-3 mb-4 text-left">
                  <p className="text-xs text-blue-600 font-semibold mb-1">Dev Mode: Reset Token</p>
                  <p className="text-xs font-mono break-all text-blue-800">{resetToken}</p>
                </div>
              )}
              <Link to="/login" className="btn-primary justify-center">Back to Login</Link>
            </div>
          )}

          <p className="text-center text-sm text-slate-500 mt-6">
            Remember your password?{' '}
            <Link to="/login" className="text-blue-600 font-medium hover:text-blue-700">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
