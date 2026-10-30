"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import { Mail, Lock, ArrowRight, Eye, EyeOff, Sparkles, UserCog, Building2, Hammer, User } from "lucide-react";
import type { AxiosError } from "axios";
import API from "@/lib/api";
import { getSafeReturnPath, getLoginRedirect } from "@/lib/redirect";
import { useAuth } from "@/context/AuthContext";
import GoogleAuthButton from "@/components/GoogleAuthButton";

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const inputVariants: Variants = {
  focused: { scale: 1.02, borderColor: "#ea580c" },
  blur: { scale: 1, borderColor: "#fbf3de" },
};

const ROLE_OPTIONS = [
  {
    role: "master-admin",
    label: "Master Admin",
    description: "Platform owner — manage all branches, staff & settings",
    icon: UserCog,
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    demoEmail: "admin@darzaani.com",
    demoPassword: "Admin123",
  },
  {
    role: "branch-manager",
    label: "Branch Manager",
    description: "Manage one branch — orders, tailors, inventory",
    icon: Building2,
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    demoEmail: "manager@darzaani.com",
    demoPassword: "Manager123",
  },
  {
    role: "tailor",
    label: "Tailor",
    description: "View your assigned work and update production stages",
    icon: Hammer,
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    demoEmail: "tailor@darzaani.com",
    demoPassword: "Tailor123",
  },
  {
    role: "customer",
    label: "Customer",
    description: "Place orders, track progress, view history",
    icon: User,
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    demoEmail: "customer@darzaani.com",
    demoPassword: "Customer123",
  },
] as const;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [returnPath, setReturnPath] = useState("/catalog");
  const [selectedRole, setSelectedRole] = useState<typeof ROLE_OPTIONS[number] | null>(ROLE_OPTIONS[3]); // Default to Customer
  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Read the browser URL after hydration so server and client start from the same state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReturnPath(getSafeReturnPath());
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await API.post("/users/login", {
        email: email.trim().toLowerCase(),
        password,
      });
      login(res.data.token, res.data.data.user);
      router.push(getLoginRedirect(res.data.data.user.role));
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      const errorMessage =
        error.response?.data?.message || "Invalid email or password";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Background Gradient Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="w-full max-w-md relative z-10"
      >
        {/* Brand Header */}
        <motion.div variants={fadeInUp} className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 mb-2"
          >
            <Sparkles className="w-6 h-6 text-orange-600" />
            <span className="text-xs uppercase tracking-[0.2em] font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-full">
              Welcome Back
            </span>
          </motion.div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
            Darzani
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Sign in to manage your custom orders & measurements
          </p>
        </motion.div>

        {/* Demo Role Selector */}
        <motion.div variants={fadeInUp} className="mb-6">
          <p className="text-center text-xs font-medium text-gray-500 mb-3">Quick Demo Access</p>
          <div className="grid grid-cols-2 gap-3">
            {ROLE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedRole?.role === option.role;
              return (
                <motion.button
                  key={option.role}
                  type="button"
                  onClick={() => {
                    setSelectedRole(option);
                    setEmail(option.demoEmail);
                    setPassword(option.demoPassword);
                    setError("");
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                    isSelected
                      ? `${option.border} ${option.bg} ring-2 ring-offset-2 ring-offset-white`
                      : "border-cream-200 bg-white hover:border-orange-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected ? `${option.text} bg-white` : `${option.text} ${option.bg}`
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${isSelected ? option.text : "text-gray-800"}`}>
                        {option.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{option.description}</p>
                    </div>
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
          {selectedRole && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 rounded-xl bg-cream-50 border border-cream-200 text-center"
            >
              <p className="text-xs text-gray-600">
                Demo credentials filled in. Select Sign In below
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Login Card */}
        <motion.div
          variants={fadeInUp}
          className="bg-white rounded-3xl shadow-xl shadow-orange-900/5 border border-cream-200 p-6 sm:p-8"
        >
          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <motion.div variants={fadeInUp} className="space-y-1.5">
              <label htmlFor="login-email" className="text-sm font-medium text-gray-700 ml-1">
                Email Address
              </label>
              <motion.div
                variants={inputVariants}
                whileFocus="focused"
                initial="blur"
                className="relative"
              >
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-cream-200 bg-cream-50 px-4 py-3 pl-12 text-sm outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20"
                  placeholder="you@example.com"
                />
              </motion.div>
            </motion.div>

            {/* Password Input */}
            <motion.div variants={fadeInUp} className="space-y-1.5">
              <div className="flex justify-between ml-1">
                <label htmlFor="login-password" className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-orange-700 hover:text-orange-800 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <motion.div
                variants={inputVariants}
                whileFocus="focused"
                initial="blur"
                className="relative"
              >
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (!e.target.value) setShowPassword(false);
                  }}
                  className="w-full rounded-xl border border-cream-200 bg-cream-50 px-4 py-3 pl-12 pr-12 text-sm outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  disabled={!password}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 transition-colors hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </motion.div>
            </motion.div>

            {/* Submit Button */}
            <motion.div variants={fadeInUp}>
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="group relative w-full rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-900/20 transition-all duration-200 hover:from-orange-500 hover:to-orange-600 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </div>
              </motion.button>
            </motion.div>
          </form>

          {/* Divider */}
          <motion.div
            variants={fadeInUp}
            className="relative my-6"
          >
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-cream-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-gray-400">or continue with</span>
            </div>
          </motion.div>

          {/* Google Auth */}
          <motion.div variants={fadeInUp}>
            <GoogleAuthButton buttonText="Sign in with Google" />
          </motion.div>

          {/* Sign Up Link */}
          <motion.p
            variants={fadeInUp}
            className="mt-6 text-center text-sm text-gray-500"
          >
            Don&apos;t have an account?{" "}
            <Link
              href={`/signup?redirect=${encodeURIComponent(returnPath)}`}
              className="font-semibold text-orange-700 hover:text-orange-800 transition-colors"
            >
              Create one
            </Link>
          </motion.p>
        </motion.div>

        {/* Decorative Elements */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-xs text-gray-400">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="text-orange-600 hover:underline">
              Terms of Service
            </Link>{" "}
            &{" "}
            <Link href="/privacy" className="text-orange-600 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
