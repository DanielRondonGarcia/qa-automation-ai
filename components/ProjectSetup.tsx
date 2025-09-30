
import React, { useState, useEffect } from 'react';
import { Project, Repository, RepoType, ReviewHistoryItem, Rule, AgentStatus } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import SvnIcon from './icons/SvnIcon';
import GitIcon from './icons/GitIcon';
import ReviewHistory from './ReviewHistory';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface ProjectSetupProps {
  onSubmit: (project: Project) => void;
  history: ReviewHistoryItem[];
  onViewHistory: (item: ReviewHistoryItem) => void;
  agentStatus: AgentStatus;
}

const DEFAULT_RULES: Rule[] = [
  {
    id: 'nomenclature',
    name: 'Spanish Nomenclature',
    description: "All variable names, method names, and class properties must be in Spanish. For example, 'users' should be 'usuarios'.",
    enabled: true,
  },
  {
    id: 'spelling',
    name: 'Spanish Spelling',
    description: "Check for spelling mistakes in comments and string literals (in Spanish). For example, 'coment' should be 'comentario'.",
    enabled: true,
  },
  {
    id: 'best_practices',
    name: 'C# Best Practices',
    description: "Identify common C# anti-patterns or code smells, like unconventional variable naming (e.g., 'new_product').",
    enabled: true,
  },
   {
    id: 'clarity',
    name: 'Code Clarity',
    description: "Suggest improvements for code readability and maintainability.",
    enabled: false,
  }
];

const AgentStatusIndicator: React.FC<{ status: AgentStatus }> = ({ status }) => {
    if (status === AgentStatus.CONNECTING) {
        return (
            <div className="bg-yellow-900/40 border border-yellow-700 text-yellow-300 px-4 py-3 rounded-lg mb-6 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5" />
                <div>
                    <strong className="font-bold">Connecting to Local Agent...</strong>
                    <p className="text-sm">Attempting to establish a connection with the local agent.</p>
                </div>
            </div>
        );
    }

    if (status === AgentStatus.DISCONNECTED) {
        return (
            <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-6">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5" />
                    <div>
                        <strong className="font-bold">Local Agent Not Detected</strong>
                        <p className="text-sm">The application requires a local agent to be running to perform QA reviews. Please download and start the agent, then refresh this page.</p>
                    </div>
                </div>
            </div>
        );
    }
    
     return (
        <div className="bg-green-900/40 border border-green-700 text-green-300 px-4 py-3 rounded-lg mb-6 flex items-center gap-3">
            <CheckCircle className="w-5 h-5" />
            <div>
                <strong className="font-bold">Local Agent Connected</strong>
                <p className="text-sm">Ready to start a new QA review.</p>
            </div>
        </div>
    );
};

const ProjectSetup: React.FC<ProjectSetupProps> = ({ onSubmit, history, onViewHistory, agentStatus }) => {
  const [reqId, setReqId] = useState('102546');
  const [screen, setScreen] = useState('PAR_NOVPASOSDES');
  const [rules, setRules] = useState<Rule[]>(DEFAULT_RULES);
  const [formError, setFormError] = useState<string | null>(null);

  const [repositories, setRepositories] = useState<({ type: RepoType; url: string; branch: string; })[]>([
    { type: RepoType.SVN, url: '', branch: '' },
  ]);
  
  const isAgentConnected = agentStatus === AgentStatus.CONNECTED;

  useEffect(() => {
    try {
      const savedRules = localStorage.getItem('qaReviewRules');
      if (savedRules) {
        setRules(JSON.parse(savedRules));
      }
    } catch (e) {
      console.error("Failed to load QA rules from localStorage", e);
    }
  }, []);
  
  const handleRuleChange = (id: string, enabled: boolean) => {
    const updatedRules = rules.map(rule => rule.id === id ? { ...rule, enabled } : rule);
    setRules(updatedRules);
    try {
        localStorage.setItem('qaReviewRules', JSON.stringify(updatedRules));
    } catch(e) {
        console.error("Failed to save QA rules to localStorage", e);
    }
  };

  const handleAddRepository = () => {
    setRepositories([
      ...repositories,
      { type: RepoType.SVN, url: '', branch: '' }
    ]);
  };

  const handleRepositoryChange = (index: number, field: 'type' | 'url' | 'branch', value: string) => {
    const updatedRepositories = [...repositories];
    const repoToUpdate = { ...updatedRepositories[index], [field]: value };
    
    if (field === 'type' && value === RepoType.SVN) {
        repoToUpdate.branch = '';
    }
    
    updatedRepositories[index] = repoToUpdate;
    setRepositories(updatedRepositories);
  };

  const handleRemoveRepository = (index: number) => {
    const updatedRepositories = repositories.filter((_, i) => i !== index);
    setRepositories(updatedRepositories);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAgentConnected) return;
    setFormError(null);

    const gitRepoWithoutBranch = repositories.find(
      (repo) => repo.type === RepoType.GIT && !repo.branch.trim()
    );

    if (gitRepoWithoutBranch) {
      setFormError('A branch name is required for all Git repositories.');
      return; 
    }

    const processedRepositories = repositories
      .map(repo => {
        if (!repo.url) return null;

        let name: string;
        let branch: string;

        if (repo.type === RepoType.SVN) {
          const cleanedUrl = repo.url.replace(/\/$/, '');
          const parts = cleanedUrl.split('/');
          branch = parts[parts.length - 1] || '';
          const repoNameSegment = parts.find(part => part.toLowerCase().includes('san'));
          name = repoNameSegment || parts[parts.length - 2] || 'Unknown Repo';
        } else {
          branch = repo.branch;
          const cleanedUrl = repo.url.replace(/\/$/, '').replace(/\.git$/, '');
          const parts = cleanedUrl.split('/');
          name = parts[parts.length - 1] || 'Unknown Repo';
        }

        const repoWithoutCredentials: Omit<Repository, 'username' | 'password'> = {
          type: repo.type,
          url: repo.url,
          name: name,
          branch: branch,
        };
        return repoWithoutCredentials;
      })
      .filter((r): r is Omit<Repository, 'username' | 'password'> => r !== null && (r.type === RepoType.SVN || (r.type === RepoType.GIT && !!(r as any).branch)));

    const project: Project = {
      reqId,
      screen,
      repositories: processedRepositories as Repository[],
      rules,
    };
    onSubmit(project);
  };

  return (
    <>
      <Card>
        <h2 className="text-2xl font-bold text-gray-100 mb-6 border-b border-gray-700 pb-4">1. Project Details</h2>
        
        <AgentStatusIndicator status={agentStatus} />

        <fieldset disabled={!isAgentConnected} className="disabled:opacity-50">
            <p className="text-gray-400 mb-6">
                Enter the details from the QA request email. The local agent will check out the branches and analyze the changed files.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                <label htmlFor="reqId" className="block text-sm font-medium text-gray-300">REQ</label>
                <input
                    type="text"
                    id="reqId"
                    value={reqId}
                    onChange={(e) => setReqId(e.target.value)}
                    className="mt-1 block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                    required
                />
                </div>
                <div>
                <label htmlFor="screen" className="block text-sm font-medium text-gray-300">Screen/Module</label>
                <input
                    type="text"
                    id="screen"
                    value={screen}
                    onChange={(e) => setScreen(e.target.value)}
                    className="mt-1 block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                    required
                />
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-200 mt-4 mb-2">Repositories</h3>
                <div className="space-y-4">
                    {repositories.map((repo, index) => (
                    <div key={index} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-3">
                        <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            {repo.type === RepoType.SVN ? <SvnIcon className="w-5 h-5 text-cyan-400" /> : <GitIcon className="w-5 h-5 text-cyan-400" />}
                            <span className="font-semibold text-white">Repository #{index + 1}</span>
                        </div>
                        {repositories.length > 1 && (
                            <Button onClick={() => handleRemoveRepository(index)} variant="secondary" size="sm" type="button">
                                Remove
                            </Button>
                        )}
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="sm:col-span-1">
                            <label htmlFor={`repo-type-${index}`} className="block text-xs font-medium text-gray-400 mb-1">Type</label>
                            <select
                            id={`repo-type-${index}`}
                            value={repo.type}
                            onChange={(e) => handleRepositoryChange(index, 'type', e.target.value as RepoType)}
                            className="block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                            >
                            <option value={RepoType.SVN}>SVN</option>
                            <option value={RepoType.GIT}>Git</option>
                            </select>
                        </div>
                        <div className={repo.type === RepoType.GIT ? "sm:col-span-2" : "sm:col-span-3"}>
                            <label htmlFor={`repo-url-${index}`} className="block text-xs font-medium text-gray-400 mb-1">URL</label>
                            <input
                            type="text"
                            id={`repo-url-${index}`}
                            value={repo.url}
                            placeholder={repo.type === RepoType.GIT ? "https://github.com/user/repo.git" : "https://svn.example.com/svn/Repo/branches/branch"}
                            onChange={(e) => handleRepositoryChange(index, 'url', e.target.value)}
                            className="block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 font-mono text-sm"
                            required
                            />
                        </div>
                        {repo.type === RepoType.GIT && (
                            <div className="sm:col-span-1">
                                <label htmlFor={`repo-branch-${index}`} className="block text-xs font-medium text-gray-400 mb-1">Branch</label>
                                <input
                                type="text"
                                id={`repo-branch-${index}`}
                                value={repo.branch}
                                placeholder="main"
                                onChange={(e) => handleRepositoryChange(index, 'branch', e.target.value)}
                                className="block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                                required
                                />
                            </div>
                        )}
                        </div>
                    </div>
                    ))}
                </div>
                <div className="mt-4">
                    <Button onClick={handleAddRepository} variant="secondary" type="button">
                        Add Repository
                    </Button>
                </div>
            </div>
            
            <div className="border-t border-gray-700 pt-6">
                <h2 className="text-xl font-bold text-gray-100 mb-4">2. Configure QA Rules</h2>
                <div className="space-y-4">
                {rules.map(rule => (
                    <div key={rule.id} className="flex items-start">
                    <div className="flex items-center h-5">
                        <input
                        id={rule.id}
                        name={rule.id}
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) => handleRuleChange(rule.id, e.target.checked)}
                        className="focus:ring-cyan-500 h-4 w-4 text-cyan-600 bg-gray-700 border-gray-600 rounded"
                        />
                    </div>
                    <div className="ml-3 text-sm">
                        <label htmlFor={rule.id} className="font-medium text-gray-200">{rule.name}</label>
                        <p className="text-gray-400">{rule.description}</p>
                    </div>
                    </div>
                ))}
                </div>
            </div>
            
            <div className="pt-4 text-right">
                {formError && (
                    <p className="text-red-400 text-sm mb-2 text-right">{formError}</p>
                )}
                <Button type="submit" disabled={!isAgentConnected}>
                    Start QA Review
                </Button>
            </div>
            </form>
        </fieldset>
      </Card>
      <ReviewHistory history={history} onView={onViewHistory} />
    </>
  );
};

export default ProjectSetup;
