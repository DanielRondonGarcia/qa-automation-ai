import React from 'react';
import { GitBranch } from 'lucide-react';

const GitIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <GitBranch className={className} />
);

export default GitIcon;