import React from 'react';
import { Code } from 'lucide-react';

const CodeIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <Code className={className} />
);

export default CodeIcon;