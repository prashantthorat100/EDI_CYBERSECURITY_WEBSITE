import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Must be at least 8 characters';
    else if (!/[A-Z]/.test(form.password)) e.password = 'Must contain at least one uppercase letter';
    else if (!/[0-9]/.test(form.password)) e.password = 'Must contain at least one number';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await register(form.name, form.email, form.password, form.confirm);
      toast.success(`Account created! Welcome, ${user.name}! 🎉`);
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.data?.errors?.length) {
        toast.error(err.response.data.errors[0].msg);
      } else {
        toast.error(err.response?.data?.error || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const strength = !form.password ? 0 : form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : /[A-Z]/.test(form.password) && /[0-9]/.test(form.password) ? 4 : 3;
  const strengthColors = ['', '#ff3366', '#ff8800', '#ffcc00', '#00ff88'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  return (
    <div className="glass-card p-8">
      <div className="text-center mb-8">
        <motion.div className="text-5xl mb-4" animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity }}>🔐</motion.div>
        <h1 className="text-2xl font-bold text-white">Create Account</h1>
        <p className="text-gray-500 text-sm mt-1">Join the cyber threat intelligence network</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Full Name" type="text" placeholder="John Doe"
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
        <Input label="Email Address" type="email" placeholder="you@example.com"
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
        <div>
          <Input label="Password" type={showPass ? 'text' : 'password'} placeholder="Min. 8 characters"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={errors.password}
            rightIcon={<button type="button" onClick={() => setShowPass(!showPass)} className="text-gray-400 hover:text-cyber-cyan text-xs font-medium transition-colors">{showPass ? 'HIDE' : 'SHOW'}</button>} />
          {form.password && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-1">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                    style={{ backgroundColor: i <= strength ? strengthColors[strength] : 'rgba(255,255,255,0.1)' }} />
                ))}
              </div>
              <p className="text-xs" style={{ color: strengthColors[strength] }}>{strengthLabels[strength]}</p>
            </div>
          )}
        </div>
        <Input label="Confirm Password" type="password" placeholder="Repeat password"
          value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} error={errors.confirm} />

        <Button type="submit" fullWidth loading={loading} className="h-12 text-base mt-2">
          🚀 Create Account
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-500 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-cyber-cyan hover:text-cyan-300 font-medium transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
