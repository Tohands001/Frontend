import React, { useState } from 'react';
import { UserRole } from '../types';
import { Icons } from '../constants';

interface LoginProps {
  onLogin: (username: string, password?: string) => boolean;
}

type LoginMode = 'SELECT_ROLE' | 'ENTER_CREDENTIALS';

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<LoginMode>('SELECT_ROLE');
  const [selectedRole, setSelectedRole] = useState<{ role: UserRole; label: string; username: string; desc: string; color: string; shadow: string } | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roles = [
    {
      role: UserRole.ADMIN,
      label: 'System Admin',
      username: 'admin',
      desc: 'Full platform control, user provisioning, and global overrides.',
      color: 'bg-indigo-600',
      shadow: 'shadow-indigo-600/20'
    },
    {
      role: UserRole.MODERATOR,
      label: 'Production Lead',
      username: 'mod01',
      desc: 'Moderator access for planning and production floor oversight.',
      color: 'bg-slate-800',
      shadow: 'shadow-slate-800/20'
    },
    {
      role: UserRole.USER,
      label: 'Station Operator',
      username: 'user01',
      desc: 'Production execution user for assigned stations and projects.',
      color: 'bg-emerald-600',
      shadow: 'shadow-emerald-600/20'
    }
  ];

  const handleSelectRole = (roleConfig: any) => {
    setSelectedRole(roleConfig);
    // DO NOT prefill for Operator
    if (roleConfig.role === UserRole.USER) {
      setUsername('');
    } else {
      setUsername(roleConfig.username);
    }
    setMode('ENTER_CREDENTIALS');
    setError(null);
    setShowPassword(false);
  };

  const handleBack = () => {
    setMode('SELECT_ROLE');
    setSelectedRole(null);
    setUsername('');
    setPassword('');
    setError(null);
    setShowPassword(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = onLogin(username, password) as any;
    if (!result.success) {
      setError(result.message || "Invalid credentials for the selected role.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 font-sans selection:bg-indigo-100">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-block p-4 bg-white rounded-3xl shadow-xl shadow-slate-200/50 mb-6 border border-slate-100">
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic">TMLWM</h1>
          </div>
          <p className="text-slate-500 font-medium uppercase tracking-[0.3em] text-xs">Traceable Manufacturing Lifecycle</p>
        </div>

        {mode === 'SELECT_ROLE' ? (
          <div className="w-full space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h2>
              <p className="text-slate-400">Select your authorization level to access the platform</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-fr">
              {roles.map((item) => (
                <button
                  key={item.role}
                  onClick={() => handleSelectRole(item)}
                  className="group relative bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 hover:border-indigo-500 transition-all duration-300 text-left hover:-translate-y-1 flex flex-col h-full"
                >
                  <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center text-white mb-6 shadow-lg ${item.shadow} group-hover:scale-110 transition-transform flex-shrink-0`}>
                    <Icons.UserControl className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{item.label}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-6">{item.desc}</p>
                  <div className="mt-auto flex items-center text-indigo-600 font-bold text-sm pt-4">
                    Enter Dashboard
                    <Icons.Plus className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto animate-in fade-in slide-in-from-right-4 duration-500">
            <button
              onClick={handleBack}
              className="flex items-center text-slate-400 hover:text-indigo-600 font-bold text-sm mb-8 transition-colors group"
            >
              <Icons.Plus className="w-4 h-4 mr-2 rotate-45 group-hover:-translate-x-1 transition-transform" />
              Back to roles
            </button>

            <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100">
              <div className="text-center mb-10">
                <div className={`w-16 h-16 rounded-3xl ${selectedRole?.color} mx-auto flex items-center justify-center text-white mb-6 shadow-2xl ${selectedRole?.shadow}`}>
                  <Icons.UserControl className="w-9 h-9" />
                </div>
                <h2 className="text-2xl font-black text-slate-900">{selectedRole?.label}</h2>
                <p className="text-slate-400 text-sm font-medium mt-1 uppercase tracking-widest italic">Identity Verification Required</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">
                    {selectedRole?.role === UserRole.USER ? 'Station ID' : 'Account Identifier'}
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={selectedRole?.role === UserRole.USER ? "e.g. user01" : "Username"}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-900 transition-all font-bold"
                  />
                </div>

                <div className="relative group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Access Token</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      autoFocus
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold placeholder:text-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <Icons.EyeOff className="w-5 h-5" /> : <Icons.Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-black uppercase tracking-tight animate-in shake duration-300">
                    ⚠️ {error}
                  </div>
                )}

                <button
                  type="submit"
                  className={`w-full py-5 rounded-[1.8rem] font-black text-white shadow-2xl transition-all hover:scale-[1.02] active:scale-95 text-lg uppercase tracking-widest mt-4 ${selectedRole?.color} ${selectedRole?.shadow}`}
                >
                  Verify & Proceed
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="mt-20 text-center animate-in fade-in duration-1000">
          <p className="text-slate-300 text-[10px] font-bold uppercase tracking-[0.4em]">Proprietary Manufacturing Control Interface v4.5</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
