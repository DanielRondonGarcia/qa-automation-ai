
import React from 'react';
import { KeyRound, Wrench } from 'lucide-react';

interface NavbarProps {
  currentView: 'home' | 'secrets';
  onNavigate: (view: 'home' | 'secrets') => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const navItemClasses = "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer";
  const activeClasses = "bg-cyan-600 text-white";
  const inactiveClasses = "text-gray-300 hover:bg-gray-700 hover:text-white";

  return (
    <nav className="bg-gray-800/50 border border-gray-700 rounded-lg p-2 flex justify-center gap-2 mb-8">
      <button
        onClick={() => onNavigate('home')}
        className={`${navItemClasses} ${currentView === 'home' ? activeClasses : inactiveClasses}`}
        aria-current={currentView === 'home' ? 'page' : undefined}
      >
        <Wrench size={16} />
        QA Pipeline
      </button>
      <button
        onClick={() => onNavigate('secrets')}
        className={`${navItemClasses} ${currentView === 'secrets' ? activeClasses : inactiveClasses}`}
        aria-current={currentView === 'secrets' ? 'page' : undefined}
      >
        <KeyRound size={16} />
        Secrets Manager
      </button>
    </nav>
  );
};

export default Navbar;
