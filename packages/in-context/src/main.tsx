import { render } from 'preact';
import { InContextButton } from './InContextButton';
import './styles.css';

const secret = localStorage.getItem('thought-secret');
if (secret) {
  const el = document.getElementById('in-context-thought');
  if (el) {
    render(<InContextButton secret={secret} />, el);
  }
}
