
import React, { useState, useEffect } from 'react';
import Card from './common/Card';
import { Secret } from '../types';
import Button from './common/Button';
import { Lock, Trash2, Edit } from 'lucide-react';

interface CredentialsManagerProps {
  secrets: Secret[];
  onAddSecret: (name: string, value: string, username?: string) => void;
  onUpdateSecret: (id: string, name: string, value: string, username?: string) => void;
  onDeleteSecret: (id: string) => void;
}

const AddSecretForm: React.FC<{
  onSave: (name: string, value: string, username?: string) => void;
  onCancel: () => void;
  secretToEdit?: Secret | null;
}> = ({ onSave, onCancel, secretToEdit }) => {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [username, setUsername] = useState('');
  const isEditing = !!secretToEdit;

  useEffect(() => {
    if (secretToEdit) {
      setName(secretToEdit.name || '');
      setValue(secretToEdit.value || '');
      setUsername(secretToEdit.username || '');
    }
  }, [secretToEdit]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && value) {
      onSave(name, value, username);
    }
  };

  return (
    <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
      <h3 className="text-lg font-semibold text-gray-200 mb-4">{isEditing ? 'Update Secret' : 'Add a new secret'}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="secret-name" className="block text-sm font-medium text-gray-300">Secret Name</label>
          <input
            type="text"
            id="secret-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. GITHUB_TOKEN or MY_SISTEM_CREDS"
            className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
            required
            readOnly={isEditing}
          />
           <p className="mt-2 text-xs text-gray-400">
            Names are case-insensitive and can only contain letters, numbers, and underscores. For GitHub, use GITHUB_TOKEN.
          </p>
        </div>
        <div>
            <label htmlFor="secret-username" className="block text-sm font-medium text-gray-300">Username (optional)</label>
            <input
                type="text"
                id="secret-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. jsmith"
                className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
            />
        </div>
        <div>
          <label htmlFor="secret-value" className="block text-sm font-medium text-gray-300">Value (Password / Token)</label>
          <textarea
            id="secret-value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 font-mono"
            rows={3}
            required
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button type="submit">{isEditing ? 'Update Secret' : 'Add Secret'}</Button>
        </div>
      </form>
    </div>
  );
};

const CredentialsManager: React.FC<CredentialsManagerProps> = ({ secrets, onAddSecret, onUpdateSecret, onDeleteSecret }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [secretToEdit, setSecretToEdit] = useState<Secret | null>(null);

  const handleSave = (name: string, value: string, username?: string) => {
    if (secretToEdit) {
      onUpdateSecret(secretToEdit.id, name, value, username);
    } else {
      onAddSecret(name.trim().replace(/\s+/g, '_').toUpperCase(), value, username);
    }
    setIsAdding(false);
    setSecretToEdit(null);
  };
  
  const handleEdit = (secret: Secret) => {
    setSecretToEdit(secret);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setSecretToEdit(null);
  };

  return (
    <Card className="mb-8">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-100 mb-2">Session Secrets Manager</h2>
          <p className="text-sm text-gray-400 max-w-2xl">
            Secrets are used to authenticate with private repositories (e.g., a Personal Access Token for GitHub, or a username/password for SVN).
            This information is <strong className="text-yellow-400">only stored in memory for this session</strong> and will be gone when you close this tab.
          </p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)}>New secret</Button>
        )}
      </div>

      {isAdding && <AddSecretForm onSave={handleSave} onCancel={handleCancel} secretToEdit={secretToEdit} />}

      <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-700 pb-2">Session Secrets</h3>
          {secrets.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-700 rounded-lg mt-4">
              <p className="text-gray-400">There are no secrets for this session.</p>
            </div>
          ) : (
             <ul role="list" className="divide-y divide-gray-700 mt-4 border border-gray-700 rounded-lg">
                {secrets.map((secret) => (
                    <li key={secret.id} className="flex items-center justify-between gap-x-6 px-4 py-3">
                        <div className="flex min-w-0 items-center gap-x-4">
                            <Lock className="h-5 w-5 text-gray-400 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold leading-6 text-white">{secret.name}</p>
                                {secret.username && <p className="text-xs text-gray-400 font-mono">User: {secret.username}</p>}
                            </div>
                        </div>
                        <div className="flex flex-none items-center gap-x-4">
                             <p className="text-sm leading-5 text-gray-500">Value stored securely for this session</p>
                            <button onClick={() => handleEdit(secret)} className="rounded-md p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                <Edit className="h-4 w-4" />
                            </button>
                             <button onClick={() => onDeleteSecret(secret.id)} className="rounded-md p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
          )}
      </div>

    </Card>
  );
};

export default CredentialsManager;
