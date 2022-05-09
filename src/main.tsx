import { createRoot } from 'react-dom/client';
import Site from './Site';
import React from 'react';

const container = document.getElementById('site');
const root = createRoot(container!);
root.render(<Site />);
