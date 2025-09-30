
import React from 'react';
import { FileAnalysis, ReviewJob, ReviewJobStatus } from '../types';
import Card from './common/Card';
import Spinner from './common/Spinner';
import CodeIcon from './icons/CodeIcon';

interface FileAnalysisViewProps {
  reviewJob: ReviewJob | null;
}

const getStatusText = (status: ReviewJobStatus | undefined) => {
    switch (status) {
        case ReviewJobStatus.PENDING: return "Review is pending in the queue...";
        case ReviewJobStatus.CLONING: return "Cloning repositories from remote source...";
        case ReviewJobStatus.DIFFING: return "Calculating changed files...";
        case ReviewJobStatus.ANALYZING: return "The AI is reviewing each changed file...";
        default: return "Preparing analysis...";
    }
}

const StatusIndicator: React.FC<{ status: FileAnalysis['status'] }> = ({ status }) => {
  switch (status) {
    case 'pending':
      return <span className="text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full bg-gray-700 text-gray-300">Pending</span>;
    case 'analyzing':
      return (
        <div className="flex items-center">
            <Spinner />
            <span className="text-xs font-medium ml-2 text-cyan-400">Analyzing...</span>
        </div>
      );
    case 'completed':
      return <span className="text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full bg-green-900 text-green-300">Completed</span>;
    case 'error':
      return <span className="text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full bg-red-900 text-red-300">Error</span>;
    default:
      return null;
  }
};


const FileAnalysisView: React.FC<FileAnalysisViewProps> = ({ reviewJob }) => {
  const progressPercent = reviewJob && reviewJob.progress.totalFiles > 0
    ? (reviewJob.progress.processedFiles / reviewJob.progress.totalFiles) * 100
    : 0;

  const filesToDisplay = reviewJob?.files || [];

  return (
    <Card>
      <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
        <h2 className="text-2xl font-bold text-gray-100">2. Analyzing Files</h2>
      </div>
      <p className="text-gray-400 mb-6">
        {getStatusText(reviewJob?.status)}
      </p>

      {reviewJob?.status === ReviewJobStatus.ANALYZING && (
        <div className="mb-6">
            <div className="flex justify-between mb-1">
                <span className="text-base font-medium text-cyan-400">Analysis Progress</span>
                <span className="text-sm font-medium text-cyan-400">{reviewJob.progress.processedFiles} of {reviewJob.progress.totalFiles} files</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div className="bg-cyan-600 h-2.5 rounded-full" style={{ width: `${progressPercent}%` }}></div>
            </div>
            {reviewJob.progress.currentFile && (
                <p className="text-sm text-gray-500 font-mono text-center mt-2">
                    Currently processing: {reviewJob.progress.currentFile}
                </p>
            )}
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {filesToDisplay.length > 0 ? filesToDisplay.map(file => (
          <div key={file.id} className="bg-gray-800/50 p-4 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <CodeIcon className="w-5 h-5 text-gray-400 mr-3" />
              <div>
                <p className="font-semibold text-white">{file.fileName}</p>
                <p className="text-sm text-gray-500 font-mono">{file.filePath}</p>
              </div>
            </div>
            <StatusIndicator status={file.status} />
          </div>
        )) : (
            <div className="text-center py-10">
                <Spinner />
                <p className="mt-4 text-gray-400">Waiting for the local agent to start processing...</p>
            </div>
        )}
      </div>
    </Card>
  );
};

export default FileAnalysisView;
