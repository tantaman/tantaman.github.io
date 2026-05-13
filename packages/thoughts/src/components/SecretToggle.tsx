import { useContext } from 'react';
import { AuthContext } from '../auth-context';

export function SecretToggle() {
  const { secret, updateSecret } = useContext(AuthContext);

  const handleClick = () => {
    const val = prompt(
      secret ? 'Update or clear secret:' : 'Enter secret:',
      secret || '',
    );
    if (val !== null) {
      updateSecret(val || null);
    }
  };

  return (
    <button
      className="secret-toggle"
      title="Set secret"
      onClick={handleClick}
    >
      &#128274;
    </button>
  );
}
