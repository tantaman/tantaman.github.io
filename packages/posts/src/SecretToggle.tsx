import { useContext } from 'react';
import { AuthContext } from './App';
import { getSecret, setSecret } from './auth';

export function SecretToggle({ inline }: { inline?: boolean }) {
  const ctx = useContext(AuthContext);

  const handleClick = () => {
    const current = getSecret();
    const val = prompt(
      current ? 'Update or clear secret:' : 'Enter secret:',
      current || '',
    );
    if (val !== null) {
      const s = val || null;
      setSecret(s);
      ctx.updateSecret(s);
    }
  };

  if (inline) {
    return (
      <button className="pe-auth-btn" onClick={handleClick}>
        Enter Secret
      </button>
    );
  }

  return (
    <button
      className="pe-secret-toggle"
      title="Set secret"
      onClick={handleClick}
    >
      &#128274;
    </button>
  );
}
