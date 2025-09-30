import React from 'react';
import { Loader } from 'lucide-react';

const Spinner: React.FC = () => (
    <Loader className="animate-spin text-cyan-400" size={24} />
);

export default Spinner;