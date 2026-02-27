import { useState } from 'preact/hooks';
import { requestOtp, verifyOtp } from '../api';
import { setSession } from '../auth';
import type { Commenter } from '../types';

type Step = 'email' | 'otp' | 'name';

interface Props {
  onAuthenticated: (commenter: Commenter) => void;
  onClose: () => void;
}

export function AuthModal({ onAuthenticated, onClose }: Props) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  const handleRequestOtp = async (e: Event) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await requestOtp(email);
      setStep('otp');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: Event) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // First try without display_name to see if user exists
      const result = await verifyOtp(email, code, displayName || undefined);
      setSession(result.token, result.commenter);
      onAuthenticated(result.commenter);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e: Event) => {
    if ((e.target as HTMLElement).classList.contains('comments-auth-overlay')) {
      onClose();
    }
  };

  return (
    <div class="comments-auth-overlay" onClick={handleOverlayClick}>
      <div class="comments-auth-modal">
        <button class="comments-auth-close" onClick={onClose} type="button">&times;</button>

        {step === 'email' && (
          <form onSubmit={handleRequestOtp}>
            <h3>Sign in to comment</h3>
            <p class="comments-auth-desc">We'll send a verification code to your email.</p>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
              required
              autoFocus
              class="comments-input"
            />
            {error && <p class="comments-error">{error}</p>}
            <button type="submit" class="comments-btn-primary" disabled={loading}>
              {loading ? 'Sending...' : 'Send code'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp}>
            <h3>Enter verification code</h3>
            <p class="comments-auth-desc">Check your email for a 6-digit code.</p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              value={code}
              onInput={(e) => setCode((e.target as HTMLInputElement).value)}
              required
              autoFocus
              class="comments-input comments-otp-input"
            />
            <label class="comments-name-label">
              <span>Display name (optional, permanent)</span>
              <input
                type="text"
                placeholder="Your name"
                value={displayName}
                onInput={(e) => setDisplayName((e.target as HTMLInputElement).value)}
                class="comments-input"
              />
            </label>
            {error && <p class="comments-error">{error}</p>}
            <button type="submit" class="comments-btn-primary" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
