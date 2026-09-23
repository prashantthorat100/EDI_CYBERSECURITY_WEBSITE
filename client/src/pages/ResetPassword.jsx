import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.password) e.password = 'New password is required.';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters.';
    else if (!/[A-Z]/.test(form.password)) e.password = 'Password must contain at least one uppercase letter.';
    else if (!/[0-9]/.test(form.password)) e.password = 'Password must contain at least one number.';
    if (!form.confirmPassword) e.confirmPassword = 'Please confirm your password.';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error('Missing reset token. Please request a new link.');
      return;
    }
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      setDone(true);
      toast.success('Password reset successfully!');
    } catch (err) {
      if (err.response?.data?.errors?.length) {
        toast.error(err.response.data.errors[0].msg);
      } else {
        toast.error(err.response?.data?.error || 'Failed to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="glass-card p-8">
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Reset Link</h1>
          <p className="text-gray-500 text-sm mb-6">
            This reset link is missing a token. Please request a new password reset link.
          </p>
          <Link
            to="/forgot-password"
            className="text-cyber-cyan hover:text-cyan-300 font-medium transition-colors"
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="glass-card p-8">
        <div className="text-center">
          <motion.div
            className="text-5xl mb-4"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5 }}
          >
            ✅
          </motion.div>
          <h1 className="text-2xl font-bold text-white mb-2">Password Reset!</h1>
          <p className="text-gray-500 text-sm mb-6">
            Your password has been updated. You can now log in with your new password.
          </p>
          <Button onClick={() => navigate('/login')} fullWidth className="h-12">
            🔐 Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-8">
      <div className="text-center mb-8">
        <motion.div
          className="text-5xl mb-4"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          🔒
        </motion.div>
        <h1 className="text-2xl font-bold text-white">Set New Password</h1>
        <p className="text-gray-500 text-sm mt-2">
          Choose a strong password for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="New Password"
          type={showPass ? 'text' : 'password'}
          placeholder="••••••••"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={errors.password}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="text-gray-400 hover:text-cyber-cyan transition-colors text-xs font-medium"
            >
              {showPass ? 'HIDE' : 'SHOW'}
            </button>
          }
        />

        <Input
          label="Confirm New Password"
          type={showPass ? 'text' : 'password'}
          placeholder="••••••••"
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          error={errors.confirmPassword}
        />

        {/* Password strength hints */}
        <ul className="text-xs text-gray-500 space-y-1 pl-1">
          <li className={form.password.length >= 8 ? 'text-cyber-green' : ''}>
            {form.password.length >= 8 ? '✓' : '○'} At least 8 characters
          </li>
          <li className={/[A-Z]/.test(form.password) ? 'text-cyber-green' : ''}>
            {/[A-Z]/.test(form.password) ? '✓' : '○'} One uppercase letter
          </li>
          <li className={/[0-9]/.test(form.password) ? 'text-cyber-green' : ''}>
            {/[0-9]/.test(form.password) ? '✓' : '○'} One number
          </li>
        </ul>

        <Button type="submit" fullWidth loading={loading} className="h-12">
          🔒 Reset Password
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link to="/login" className="text-gray-500 hover:text-cyber-cyan text-sm transition-colors">
          ← Back to Login
        </Link>
      </div>
    </div>
  );
}
