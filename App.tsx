
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { PipelineStep, Project, Finding, ReviewHistoryItem, Secret, AgentStatus, ReviewJob, ReviewJobStatus } from './types';
import ProjectSetup from './components/ProjectSetup';
import PipelineTracker from './components/PipelineTracker';
import FileAnalysisView from './components/FileAnalysisView';
import FindingsReport from './components/FindingsReport';
import Navbar from './components/Navbar';
import CredentialsManager from './components/CredentialsManager';
import { agentService } from './services/agentService';

const POLLING_INTERVAL = 2000; // 2 seconds

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'home' | 'secrets'>('home');
  const [currentStep, setCurrentStep] = useState<PipelineStep>(PipelineStep.SETUP);
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewHistory, setReviewHistory] = useState<ReviewHistoryItem[]>([]);
  const [viewingHistoryItem, setViewingHistoryItem] = useState<ReviewHistoryItem | null>(null);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  
  // Agent and Review Job State
  const [agentStatus, setAgentStatus] = useState<AgentStatus>(AgentStatus.CONNECTING);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewJob, setReviewJob] = useState<ReviewJob | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);

  // Check agent connection on startup
  useEffect(() => {
    const checkAgent = async () => {
      const isConnected = await agentService.ping();
      setAgentStatus(isConnected ? AgentStatus.CONNECTED : AgentStatus.DISCONNECTED);
    };
    checkAgent();
  }, []);

  // Polling logic for review status
  useEffect(() => {
    const pollStatus = async () => {
      if (!reviewId) return;

      try {
        const jobUpdate = await agentService.getReviewStatus(reviewId);
        
        // Merge the update with existing job data to keep project info
        setReviewJob(prevJob => ({
            ...prevJob,
            ...jobUpdate,
            // If the final update contains the project, use it. Otherwise, keep the old one.
            project: jobUpdate.project || prevJob?.project
        } as ReviewJob));

        if (jobUpdate.status === ReviewJobStatus.COMPLETED || jobUpdate.status === ReviewJobStatus.ERROR) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          if (jobUpdate.status === ReviewJobStatus.COMPLETED && jobUpdate.project) {
            setCurrentStep(PipelineStep.REPORT);
            saveToHistory(jobUpdate.project, jobUpdate.findings);
          } else {
            setError(jobUpdate.error || 'The review failed due to an unknown error in the agent.');
            setCurrentStep(PipelineStep.SETUP);
          }
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        setError(`Failed to poll review status: ${errorMessage}`);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
        setCurrentStep(PipelineStep.SETUP);
      }
    };

    if (reviewId) {
      pollingIntervalRef.current = window.setInterval(pollStatus, POLLING_INTERVAL);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [reviewId]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('qaReviewHistory');
      if (savedHistory) {
        setReviewHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error("Failed to load review history from localStorage", e);
    }
  }, []);

  const saveToHistory = (projectData: Project, findings: Finding[]) => {
      const newHistoryItem: ReviewHistoryItem = {
          id: new Date().toISOString(),
          project: projectData, // The agent already sanitized it
          findings: findings,
          timestamp: new Date().toISOString(),
      };
      setReviewHistory(prevHistory => {
          const updatedHistory = [newHistoryItem, ...prevHistory];
          try {
              localStorage.setItem('qaReviewHistory', JSON.stringify(updatedHistory));
          } catch (e) {
              console.error("Failed to save review history to localStorage", e);
              setError("Failed to save review history. Your browser's storage might be full.");
          }
          return updatedHistory;
      });
  };

  const handleAddSecret = (name: string, value: string, username?: string) => {
    const newSecret: Secret = { id: Date.now().toString(), name, value, username };
    setSecrets(prevSecrets => [...prevSecrets, newSecret]);
  };

  const handleUpdateSecret = (id: string, name: string, value: string, username?: string) => {
    setSecrets(prevSecrets => prevSecrets.map(s => s.id === id ? { ...s, name, value, username } : s));
  };

  const handleDeleteSecret = (id: string) => {
    setSecrets(prevSecrets => prevSecrets.filter(s => s.id !== id));
  };
  
  const handleProjectSubmit = async (projectData: Project) => {
    if (agentStatus !== AgentStatus.CONNECTED) {
        setError("Cannot start review: Local Agent is not connected.");
        return;
    }
    setProject(projectData);
    setError(null);
    setReviewJob(null);
    setReviewId(null);
    setCurrentStep(PipelineStep.ANALYSIS);
    
    try {
        const newReviewId = await agentService.startReview(projectData, secrets);
        setReviewId(newReviewId);
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        setError(`Failed to start review: ${errorMessage}`);
        setCurrentStep(PipelineStep.SETUP);
    }
  };

  const handleReset = () => {
    setCurrentStep(PipelineStep.SETUP);
    setProject(null);
    setError(null);
    setViewingHistoryItem(null);
    setReviewId(null);
    setReviewJob(null);
    if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
    }
  };
  
  const handleViewHistoryItem = (item: ReviewHistoryItem) => {
    setCurrentView('home');
    setViewingHistoryItem(item);
  };

  const renderPipeline = () => {
    if (viewingHistoryItem) {
        return <FindingsReport findings={viewingHistoryItem.findings} project={viewingHistoryItem.project} onReset={handleReset} />;
    }

    switch (currentStep) {
      case PipelineStep.SETUP:
        return <ProjectSetup onSubmit={handleProjectSubmit} history={reviewHistory} onViewHistory={handleViewHistoryItem} agentStatus={agentStatus} />;
      case PipelineStep.ANALYSIS:
        return <FileAnalysisView reviewJob={reviewJob} />;
      case PipelineStep.REPORT:
        return <FindingsReport findings={reviewJob?.findings || []} onReset={handleReset} project={reviewJob?.project || project} />;
      default:
        return <div>Unknown step</div>;
    }
  };

  const renderView = () => {
    switch(currentView) {
      case 'home':
        return renderPipeline();
      case 'secrets':
        return <CredentialsManager 
                  secrets={secrets}
                  onAddSecret={handleAddSecret}
                  onUpdateSecret={handleUpdateSecret}
                  onDeleteSecret={handleDeleteSecret}
                />;
      default:
        return <div>Not Found</div>
    }
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-bold text-cyan-400">AI-Powered QA Review Pipeline</h1>
          <p className="mt-2 text-lg text-gray-400">Automate C# code reviews with the power of OpenAI GPT-5</p>
        </header>
        
        <Navbar currentView={currentView} onNavigate={setCurrentView} />

        { !viewingHistoryItem && currentView === 'home' && <PipelineTracker currentStep={currentStep} /> }

        <main className="mt-10">
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          {renderView()}
        </main>
      </div>
    </div>
  );
};

export default App;
