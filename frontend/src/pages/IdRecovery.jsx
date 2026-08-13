import { useState } from 'react';
import { ArrowLeft, CheckCircle2, KeyRound, Phone, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { FONT_DISPLAY } from '../theme';

export default function IdRecovery() {
  const [step, setStep] = useState('phone'); // phone -> otp -> result
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [uniqueId, setUniqueId] = useState('');
  const [error, setError] = useState('');

  async function sendOtp(e) {
    e.preventDefault();
    setError('');
    try {
      await axiosInstance.post('/otp/send', { phone });
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await axiosInstance.post('/otp/verify', { phone, code });
      setUniqueId(data.uniqueId);
      setStep('result');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP');
    }
  }

  const isPhoneStep = step === 'phone';

  return (
    <div className="portal-theme min-h-screen px-5 py-10 sm:px-8">
      <main className="mx-auto w-full max-w-md">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-[12.5px] font-bold text-[#80576A] transition-colors hover:text-[#C75560]">
          <ArrowLeft size={15} /> Back to home
        </Link>
        <section className="portal-card overflow-hidden">
          <div className="border-b border-[#EBC2AE] bg-[#FFF0E8] p-6">
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-[#1D181A] text-[#F7C56B] shadow-[0_12px_22px_-15px_rgba(29,24,26,0.72)]">
              {isPhoneStep ? <Phone size={20} /> : step === 'otp' ? <ShieldCheck size={20} /> : <KeyRound size={20} />}
            </span>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#C75560]">Account access</p>
            <h1 className="mt-1 text-2xl font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>Recover your Unique ID</h1>
            <p className="mt-2 text-[13px] leading-6 text-[#80576A]">Verify the phone number connected to your account and we will help you sign back in.</p>
          </div>

          <div className="p-6">
            <div className="mb-6 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#8D6072]">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full ${step !== 'phone' ? 'bg-[#C75560] text-white' : 'bg-[#1D181A] text-[#F7C56B]'}`}>1</span>
              <span className="h-px flex-1 bg-[#EBC2AE]" />
              <span className={`flex h-6 w-6 items-center justify-center rounded-full ${step === 'result' ? 'bg-[#C75560] text-white' : step === 'otp' ? 'bg-[#1D181A] text-[#F7C56B]' : 'border border-[#EBC2AE] bg-[#FFF9F5]'}`}>2</span>
              <span className="h-px flex-1 bg-[#EBC2AE]" />
              <span className={`flex h-6 w-6 items-center justify-center rounded-full ${step === 'result' ? 'bg-[#1D181A] text-[#F7C56B]' : 'border border-[#EBC2AE] bg-[#FFF9F5]'}`}>3</span>
            </div>

            {step === 'phone' && (
              <form onSubmit={sendOtp} className="space-y-4">
                <label className="block text-[12.5px] font-semibold text-[#54263F]">
                  Registered phone number
                  <input
                    type="tel"
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="mt-2 block w-full rounded-[10px] border border-[#EBC2AE] bg-[#FFF9F5] px-3.5 py-3 text-[13.5px] text-[#1D181A] outline-none transition focus:border-[#C75560] focus:bg-white focus:shadow-[0_0_0_3px_rgba(199,85,96,0.14)]"
                  />
                </label>
                <button type="submit" className="portal-primary-action w-full px-4 py-3">
                  Send verification code <Phone size={16} className="text-[#F7C56B]" />
                </button>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={verifyOtp} className="space-y-4">
                <label className="block text-[12.5px] font-semibold text-[#54263F]">
                  Verification code
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter the OTP"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    className="mt-2 block w-full rounded-[10px] border border-[#EBC2AE] bg-[#FFF9F5] px-3.5 py-3 text-[13.5px] tracking-[0.18em] text-[#1D181A] outline-none transition focus:border-[#C75560] focus:bg-white focus:shadow-[0_0_0_3px_rgba(199,85,96,0.14)]"
                  />
                </label>
                <button type="submit" className="portal-primary-action w-full px-4 py-3">
                  Verify and recover <ShieldCheck size={16} className="text-[#F7C56B]" />
                </button>
              </form>
            )}

            {step === 'result' && (
              <div className="rounded-xl border border-[#F7C56B] bg-[#FFF5D9] p-5 text-center">
                <CheckCircle2 size={26} className="mx-auto text-[#9A671A]" />
                <p className="mt-3 text-[13px] text-[#80576A]">Your Unique ID</p>
                <p className="mt-1 break-all text-xl font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>{uniqueId}</p>
                <Link to="/" className="portal-primary-action mt-5 w-full px-4 py-3">Return to sign in</Link>
              </div>
            )}

            {error && <p className="mt-4 rounded-lg border border-[#E9B6AF] bg-[#FFF0EE] px-3 py-2 text-[12.5px] font-medium text-[#B3261E]">{error}</p>}
          </div>
        </section>
      </main>
    </div>
  );
}
