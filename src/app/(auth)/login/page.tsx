'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { TreePine, Mail, Lock, Sparkles, UserPlus, LogIn } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isSignUp) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Skip email confirmation
          emailRedirectTo: undefined,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Auto sign-in after signup (works when email confirmation is disabled)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      const requestedNext = searchParams.get('next');
      const safeNext =
        requestedNext &&
        requestedNext.startsWith('/') &&
        !requestedNext.startsWith('//')
          ? requestedNext
          : '/dashboard';

      router.push(`/onboarding?next=${encodeURIComponent(safeNext)}`);
      setLoading(false);
      return;
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
    }

    const requestedNext = searchParams.get('next');
    const nextPath =
      requestedNext &&
      requestedNext.startsWith('/') &&
      !requestedNext.startsWith('//')
        ? requestedNext
        : '/dashboard';
    router.push(nextPath);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] }}
        className="bg-white/90 backdrop-blur-xl p-8 md:p-10 rounded-3xl shadow-2xl max-w-md w-full border border-stone/50"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-moss to-leaf rounded-2xl flex items-center justify-center shadow-lg">
            <TreePine className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-semibold text-earth tracking-tight">
            Branches
          </h1>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-earth">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="text-bark/50 text-sm mt-1">
            {isSignUp
              ? 'Sign up to start building your family tree'
              : 'Sign in to continue to your trees'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-bark/30" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss text-earth placeholder:text-bark/30 transition-all"
              required
              autoFocus
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-bark/30" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              minLength={6}
              className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss text-earth placeholder:text-bark/30 transition-all"
              required
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-error text-sm text-center"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-moss to-leaf text-white py-3.5 rounded-xl font-medium shadow-lg shadow-moss/20 hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" />
                Create Account
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Sign In
              </>
            )}
          </motion.button>
        </form>

        {/* Toggle */}
        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
            className="text-sm text-bark/50 hover:text-moss transition-colors"
          >
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <span className="font-medium text-moss">
              {isSignUp ? 'Sign in' : 'Sign up'}
            </span>
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-1.5 mt-6 text-bark/30 text-xs">
          <Sparkles className="w-3 h-3" />
          <span>Your family story starts here</span>
        </div>
      </motion.div>
    </div>
  );
}
