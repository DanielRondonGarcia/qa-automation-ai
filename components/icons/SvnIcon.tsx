import React from 'react';
import { GitCommitHorizontal } from 'lucide-react';

const SvnIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <GitCommitHorizontal className={className} />
);

export default SvnIcon;