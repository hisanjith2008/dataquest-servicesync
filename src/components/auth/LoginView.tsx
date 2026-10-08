import React, { useState } from 'react';
import {
  Lock,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  User,
  Mail,
  Phone,
  Briefcase,
  Building,
  Wrench,
  Eye,
  EyeOff,
  CheckCircle2,
  KeyRound,
  RotateCcw,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { useServiceSync } from '../../context/ServiceSyncContext';
import { UserRole, UserAccount } from '../../types';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

type AuthTab = 'signin' | 'register';

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { login, createAccount, accounts } = useServiceSync();

  // Active tab state
  const [activeTab, setActiveTab] = useState<AuthTab>('signin');

  // Sign In Form State (Only Employee ID & Password as requested)
  const [loginId, setLoginId] = useState<string>('EMP-ADM-01');
  const [password, setPassword] = useState<string>('admin123');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Registration Form State
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regRole, setRegRole] = useState<UserRole>('Technician');
  const [regEmployeeId, setRegEmployeeId] = useState<string>('EMP-TEC-103');
  const [regPhone, setRegPhone] = useState<string>('+91 98450 99881');
  const [regSpecialty, setRegSpecialty] = useState<string>('CNC Dynamic Balancing & Spindle Diagnostics');
  const [regCity, setRegCity] = useState<string>('Bengaluru');
  const [regPlantName, setRegPlantName] = useState<string>('Precision AutoTech Facility');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);

  // Feedback & Status States
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Verification Pending Screen State (for unverified technicians)
  const [pendingTechInfo, setPendingTechInfo] = useState<{
    id: string;
    name: string;
    message: string;
  } | null>(null);

  // Registration Success Screen State
  const [regSuccessInfo, setRegSuccessInfo] = useState<{
    id: string;
    name: string;
    role: UserRole;
    isTechnician: boolean;
  } | null>(null);

  // Auto-update suggested employee ID when role changes
  const handleRoleSelect = (role: UserRole) => {
    setRegRole(role);
    if (role === 'Technician') {
      setRegEmployeeId(`EMP-TEC-${Math.floor(103 + Math.random() * 20)}`);
    } else if (role === 'Customer') {
      setRegEmployeeId(`CUST-${regCity.slice(0, 3).toUpperCase()}-03`);
    } else {
      setRegEmployeeId(`EMP-ADM-0${Math.floor(2 + Math.random() * 5)}`);
    }
  };

  // Quick autofill buttons for evaluation ease
  const handleQuickFill = (id: string, pass: string) => {
    setLoginId(id);
    setPassword(pass);
    setError(null);
    setPendingTechInfo(null);
  };

  // Sign In Submit
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim()) {
      setError('Please enter your Employee ID or Login ID.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setPendingTechInfo(null);

    try {
      const res = await login(loginId.trim(), password);
      if (res.success) {
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } else if (res.requiresVerification) {
        setPendingTechInfo({
          id: loginId.trim(),
          name: res.pendingTechnicianName || 'Technician',
          message:
            res.error ||
            'Technician profile is awaiting verification by the System Administrator.',
        });
      } else {
        setError(res.error || 'Invalid credentials. Please verify your Employee ID and password.');
      }
    } catch {
      setError('Authentication service error. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create Account Submit
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!regName.trim()) {
      setError('Please provide your Full Name.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setError('Please enter a valid work email address (required for password reset).');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await createAccount({
        name: regName.trim(),
        email: regEmail.trim(),
        role: regRole,
        employeeId: regEmployeeId.trim() || undefined,
        password: regPassword,
        phone: regPhone.trim(),
        specialty: regRole === 'Technician' ? regSpecialty : undefined,
        city: regCity,
        organization:
          regRole === 'Customer'
            ? regPlantName.trim()
            : regRole === 'Technician'
            ? `ServiceSync Field Operations (${regCity} Hub)`
            : 'ServiceSync Central Operations',
        designation:
          regRole === 'Technician'
            ? regSpecialty
            : regRole === 'Customer'
            ? 'Plant Operations Lead'
            : 'Systems Specialist',
      });

      if (res.success && res.account) {
        setRegSuccessInfo({
          id: res.account.id,
          name: res.account.name,
          role: res.account.role,
          isTechnician: res.account.role === 'Technician',
        });
        // Pre-fill login credentials for convenience
        setLoginId(res.account.id);
        setPassword(regPassword);
      } else {
        setError(res.error || 'Failed to create account. Please check the provided information.');
      }
    } catch {
      setError('An error occurred during account creation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-slate-950 via-[#0a0f1d] to-[#0d1629] text-slate-100 font-sans selection:bg-blue-600 selection:text-white overflow-hidden">
      {/* Dynamic Background Ambient Gradients */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-sky-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Glassmorphic Container */}
      <div className="relative z-10 w-full max-w-lg mx-auto">
        {/* Company Header with Enriched Animated Logo */}
        <div className="flex flex-col items-center text-center mb-6 space-y-4">
          {/* Animated Big Logo */}
          <div className="relative flex items-center justify-center">
            {/* Outer Pulsing Glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/30 via-cyan-400/25 to-indigo-600/30 rounded-full blur-xl animate-pulse" />

            {/* Orbiting Rotating Dashed Ring */}
            <div className="absolute -inset-2.5 rounded-full border border-blue-400/40 border-dashed animate-spin-slow pointer-events-none" />

            {/* Pulsing Concentric Radar Ring */}
            <div className="absolute -inset-1 rounded-full border border-cyan-400/50 animate-pulse-ring pointer-events-none" />

            {/* Big Company Emblem */}
            <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 border border-blue-400/40 shadow-2xl shadow-blue-500/30 flex items-center justify-center text-white overflow-hidden group">
              {/* Shimmer light sweep */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

              {/* High-Tech Industrial Monogram */}
              <div className="flex items-center justify-center font-black text-2xl tracking-tight select-none">
                <span className="text-white drop-shadow-md">S</span>
                <span className="text-cyan-300 drop-shadow-md">S</span>
              </div>

              {/* Glowing Corner Indicator */}
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400 shadow-xs shadow-cyan-300 animate-pulse" />
            </div>
          </div>

          {/* Platform Title */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
              ServiceSync
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
              Industrial Equipment Servicing &amp; Telemetry Platform
            </p>
          </div>
        </div>

        {/* Central Card */}
        <div className="backdrop-blur-2xl bg-slate-900/85 border border-slate-700/60 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
          {/* Navigation Tab Bar */}
          {!pendingTechInfo && !regSuccessInfo && (
            <div className="grid grid-cols-2 p-1 bg-slate-950/60 border border-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signin');
                  setError(null);
                }}
                className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'signin'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setError(null);
                }}
                className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'register'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* 1. STATE: Technician Pending Verification Modal/Screen */}
          {pendingTechInfo && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                  <ShieldAlert className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                    Awaiting Admin Approval
                  </span>
                  <h3 className="text-base font-bold text-white mt-2">
                    Account Pending Verification
                  </h3>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    Technician account <strong className="text-white font-mono">{pendingTechInfo.id}</strong> ({pendingTechInfo.name}) has been registered but must be approved by the System Administrator before access to the servicing platform is granted.
                  </p>
                </div>
              </div>

              {/* Explanatory Box */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400 space-y-2">
                <div className="flex items-center gap-2 text-slate-200 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Admin Security Protocol</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  To ensure quality compliance (ISO 9001:2015), field technicians must have their technical accreditations vetted by administration before receiving automated dispatch tickets.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    handleQuickFill('EMP-ADM-01', 'admin123');
                    setActiveTab('signin');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Sign In as Admin to Approve ({pendingTechInfo.name})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPendingTechInfo(null);
                    setActiveTab('signin');
                  }}
                  className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            </div>
          )}

          {/* 2. STATE: Registration Successful Screen */}
          {regSuccessInfo && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    Registration Created
                  </span>
                  <h3 className="text-base font-bold text-white mt-2">
                    Welcome, {regSuccessInfo.name}!
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Your account has been registered with Employee ID:{' '}
                    <strong className="text-cyan-300 font-mono">{regSuccessInfo.id}</strong>.
                  </p>
                </div>
              </div>

              {regSuccessInfo.isTechnician ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-slate-300 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Admin Verification Required</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Because this is a Field Service Technician account, an Administrator must verify your credentials before you can log in and view active dispatches.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    You can test this verification right now by signing in as Admin to authorize your profile!
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400">
                  <p>Your workspace is ready. You can log in immediately using your Employee ID and password.</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2.5">
                {regSuccessInfo.isTechnician ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleQuickFill('EMP-ADM-01', 'admin123');
                      setRegSuccessInfo(null);
                      setActiveTab('signin');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Sign In as Admin to Authorize ({regSuccessInfo.id})</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setRegSuccessInfo(null);
                      setActiveTab('signin');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Proceed to Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setRegSuccessInfo(null);
                    setActiveTab('signin');
                  }}
                  className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  Test Signing In as New Technician
                </button>
              </div>
            </div>
          )}

          {/* 3. TAB: SIGN IN (Only Employee ID & Password) */}
          {!pendingTechInfo && !regSuccessInfo && activeTab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label
                  htmlFor="login-id"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Employee ID / Login ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="login-id"
                    type="text"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="e.g. EMP-ADM-01 or EMP-TEC-101"
                    required
                    className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error Message Banner */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              {/* Discreet, Clean 1-Click Quick Fill Pills */}
              <div className="pt-2">
                <div className="text-[10px] text-slate-400 font-medium mb-1.5 flex items-center justify-between">
                  <span>Quick demo credentials:</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickFill('EMP-ADM-01', 'admin123')}
                    className="p-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 font-mono text-center transition-colors cursor-pointer"
                  >
                    <span className="block font-bold text-blue-400">Admin</span>
                    <span className="text-[9px] text-slate-500">EMP-ADM-01</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('EMP-TEC-101', 'tech123')}
                    className="p-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 font-mono text-center transition-colors cursor-pointer"
                  >
                    <span className="block font-bold text-emerald-400">Technician</span>
                    <span className="text-[9px] text-slate-500">EMP-TEC-101</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('CUST-BLR-01', 'cust123')}
                    className="p-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 font-mono text-center transition-colors cursor-pointer"
                  >
                    <span className="block font-bold text-amber-400">Customer</span>
                    <span className="text-[9px] text-slate-500">CUST-BLR-01</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* 4. TAB: CREATE ACCOUNT */}
          {!pendingTechInfo && !regSuccessInfo && activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5 animate-in fade-in duration-150">
              {/* Role Selection Segment */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRoleSelect('Technician')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      regRole === 'Technician'
                        ? 'bg-blue-600/15 border-blue-500 text-white ring-1 ring-blue-500/50'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Wrench className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs font-bold">Field Technician</span>
                    </div>
                    <p className="text-[10px] text-amber-400 mt-0.5">
                      ★ Requires Admin verification
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleSelect('Customer')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      regRole === 'Customer'
                        ? 'bg-blue-600/15 border-blue-500 text-white ring-1 ring-blue-500/50'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs font-bold">Plant / Facility Rep</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Instant client portal access
                    </p>
                  </button>
                </div>
              </div>

              {/* Full Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Arjun Verma"
                      required
                      className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Email Address * (For recovery)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="arjun.verma@example.in"
                      required
                      className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Employee ID & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Employee / User ID *
                  </label>
                  <input
                    type="text"
                    value={regEmployeeId}
                    onChange={(e) => setRegEmployeeId(e.target.value)}
                    required
                    className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Mobile Phone
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+91 98000 00000"
                      className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Role-Specific Field */}
              {regRole === 'Technician' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Technical Specialization
                    </label>
                    <input
                      type="text"
                      value={regSpecialty}
                      onChange={(e) => setRegSpecialty(e.target.value)}
                      placeholder="e.g. Spindle Balancing, Optics"
                      className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Service Hub City
                    </label>
                    <select
                      value={regCity}
                      onChange={(e) => setRegCity(e.target.value)}
                      className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="Bengaluru">Bengaluru (Peenya Hub)</option>
                      <option value="Pune">Pune (Chakan Hub)</option>
                      <option value="Chennai">Chennai (Ambattur Hub)</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Plant / Company Facility Name
                  </label>
                  <input
                    type="text"
                    value={regPlantName}
                    onChange={(e) => setRegPlantName(e.target.value)}
                    placeholder="e.g. Precision Engineering Works"
                    className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Password & Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      required
                      className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Notice for Technicians */}
              {regRole === 'Technician' && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    New technician accounts must be verified and authorized by the System Administrator before you can access tickets and log in.
                  </span>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Creating Account...' : 'Complete Registration'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
