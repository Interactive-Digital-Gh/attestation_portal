import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, X, CheckCircle2 } from 'lucide-react';
import { supabase, signInResilient, signOutQuietly } from '../../../../supabaseClient';
import LogoCrest from '../../../../assets/images/Logo_crest.png';

const AdminAuthSection = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Authenticate with Supabase
      const { data, error: loginError } = await signInResilient(() =>
        supabase.auth.signInWithPassword({ email, password })
      );

      if (loginError) throw loginError;

      if (!data.user) {
        throw new Error('Authentication failed. Please try again.');
      }

      // Verify the user has admin role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        await signOutQuietly();
        throw new Error('Could not verify your account role. Contact IT support.');
      }

      if (profile.role !== 'admin') {
        await signOutQuietly();
        throw new Error('Unauthorized — this portal is for system administrators only.');
      }

      // Update last_login
      await supabase
        .from('profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.user.id);

      setSuccess(true);
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Invalid login credentials.');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative h-full w-full bg-white rounded-[24px] shadow-2xl overflow-hidden flex flex-col justify-between p-8 lg:px-16 lg:py-12">

      {/* Mobile Header (Only visible on small screens) */}
      <div className="lg:hidden flex items-center gap-3 mb-10">
        <img src={LogoCrest} alt="Logo" className="h-8 w-auto object-contain" />
        <span className="text-brand-navy-800 font-bold text-[15px]">Ministry of Foreign Affairs</span>
      </div>

      <div className="max-w-[400px] mx-auto w-full flex-grow flex flex-col mt-12 lg:mt-24">

        {/* Error / Success message */}
        {(error || success) && (
          <div className={`mb-10 p-4 border rounded-xl flex items-start gap-4 animate-in fade-in slide-in-from-top-2 duration-300 ${
            error ? 'bg-[#fdf3f5] border-[#f6d7dd]' : 'bg-[#f0fdf4] border-[#dcfce7]'
          }`}>
            <div className="mt-0.5 shrink-0">
              {error ? (
                <AlertCircle className="w-[18px] h-[18px] text-[#de354a]" strokeWidth={2.5} />
              ) : (
                <CheckCircle2 className="w-[18px] h-[18px] text-green-600" strokeWidth={2.5} />
              )}
            </div>
            <div className="flex-grow">
              <h3 className={`text-[13px] font-bold leading-tight mb-1 ${error ? 'text-[#333333]' : 'text-green-800'}`}>
                {error ? 'Login unsuccessful' : 'Login successful'}
              </h3>
              <p className={`text-[12px] leading-tight ${error ? 'text-[#666666]' : 'text-green-700'}`}>
                {error || 'Redirecting to admin dashboard...'}
              </p>
            </div>
            <button 
              type="button" 
              onClick={() => { setError(null); setSuccess(false); }}
              className={`p-0.5 rounded-full transition-colors flex items-center justify-center shrink-0 ${
                error ? 'text-[#999999] border border-[#d1d5db] hover:bg-[#f6d7dd]' : 'text-green-600 border border-green-300 hover:bg-green-200'
              }`}
            >
              <X className="w-[14px] h-[14px]" />
            </button>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-8 w-full">
          <div className="text-center mb-10">
            <h1 className="text-[#2a2a2a] text-[32px] font-bold mb-3 tracking-tight">Admin Sign In</h1>
            <p className="text-[#6b7280] text-[14px] font-medium max-w-sm mx-auto leading-relaxed">
              Use your MOFA System Administrator account.
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[#8e95a2] font-bold text-[10px] uppercase tracking-wider">Admin Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@mfa.gov.gh"
                className={`w-full h-12 px-4 border rounded-lg focus:outline-none transition-colors text-[15px] ${
                  error 
                    ? 'border-[#de354a] focus:border-[#de354a] text-neutral-800 bg-white' 
                    : success
                    ? 'border-green-500 focus:border-green-500 text-neutral-800 bg-white'
                    : 'border-[#e5e7eb] focus:border-brand-navy-700 placeholder:text-[#d1d5db] text-neutral-800'
                }`}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[#8e95a2] font-bold text-[10px] uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full h-12 px-4 border rounded-lg focus:outline-none transition-colors text-[15px] tracking-[0.2em] ${
                    error 
                      ? 'border-[#de354a] focus:border-[#de354a] text-neutral-800 bg-white' 
                      : success
                      ? 'border-green-500 focus:border-green-500 text-neutral-800 bg-white'
                      : 'border-[#e5e7eb] focus:border-brand-navy-700 text-neutral-800'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.477 10.477 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.822 7.822L21 21m-2.278-2.278L15.07m-4.408-4.408a3 3 0 014.242 4.242" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#fbe798] hover:bg-[#f3dc82] text-[#4b4528] font-semibold text-[15px] rounded-lg transition-all shadow-sm mt-6 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                'Sign in'
              )}
            </button>

            <div className="text-center mt-4">
              <p className="text-[#a1a1aa] text-[11px] font-medium">
                Access issues? Contact IT support at <span className="text-[#18181b] font-bold">it@mfa.gov.gh</span>
              </p>
            </div>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center text-[#a1a1aa] text-[11px] font-medium mt-auto shrink-0 border-t border-neutral-50 pt-4">
        <p>© 2026 Ministry of Foreign Affairs, Ghana</p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-neutral-700">Privacy Policy</a>
          <a href="#" className="hover:text-neutral-700">IT Support</a>
        </div>
      </div>
    </div>
  );
};

export default AdminAuthSection;
