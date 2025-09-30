
import React, { useState } from 'react';
import { Finding, Project } from '../types';
import Card from './common/Card';
import Button from './common/Button';

interface FindingsReportProps {
  findings: Finding[];
  project: Project | null;
  onReset: () => void;
}

const HighlightedCode: React.FC<{ code: string; token?: string }> = ({ code, token }) => {
  if (!token || !code.includes(token)) {
    return <span>{code}</span>;
  }
  const parts = code.split(token);
  return (
    <span>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {i < parts.length - 1 && <span className="bg-red-500/30 rounded px-1">{token}</span>}
        </React.Fragment>
      ))}
    </span>
  );
};

const FindingsReport: React.FC<FindingsReportProps> = ({ findings, project, onReset }) => {
  const [activeTab, setActiveTab] = useState<'findings' | 'patches'>('findings');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const findingsByFile = findings.reduce((acc, finding) => {
    const key = finding.filePath;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(finding);
    return acc;
  }, {} as Record<string, Finding[]>);

  const generatePatchForFile = (filePath: string, fileFindings: Finding[]): string => {
    const hunks = fileFindings.map(finding => {
        const oldCode = finding.codeSnippet.trim();
        const newCode = finding.suggestion.trim();
        return `@@ -${finding.lineNumber},1 +${finding.lineNumber},1 @@\n- ${oldCode}\n+ ${newCode}`;
    }).join('\n');
    return `--- a/${filePath}\n+++ b/${filePath}\n${hunks}`;
  };

  const patchesByFile = Object.entries(findingsByFile).map(([filePath, fileFindings]) => {
    const patchContent = generatePatchForFile(filePath, fileFindings);
    return {
        filePath,
        patchContent,
        fileName: fileFindings[0]?.fileName || 'Unknown File'
    }
  });

  const handleDownloadAllPatches = () => {
    if (patchesByFile.length === 0) return;

    const combinedPatchContent = patchesByFile
        .map(p => p.patchContent)
        .join('\n\n');
    
    const blob = new Blob([combinedPatchContent], { type: 'text/x-patch' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project?.reqId || 'review'}-patches.patch`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJsonReport = () => {
    if (!project) return;

    const reportData = {
      project,
      findings,
    };

    const jsonString = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString();
    a.download = `${project.reqId}-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  return (
    <Card>
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-gray-100">3. QA Review Report</h2>
          </div>
          <p className="text-gray-400 mt-1">
            Found {findings.length} issue{findings.length !== 1 ? 's' : ''} across {Object.keys(findingsByFile).length} file{Object.keys(findingsByFile).length !== 1 ? 's' : ''}.
          </p>
          {project && <p className="text-sm text-gray-500 font-mono mt-1">REQ: {project.reqId} | Screen: {project.screen}</p>}
        </div>
        <div className="flex gap-2 flex-shrink-0">
            <Button onClick={handleDownloadJsonReport} variant="secondary">
              Download Report
            </Button>
            {findings.length > 0 && (
                <Button onClick={handleDownloadAllPatches} variant="secondary">
                    Download All Patches
                </Button>
            )}
            <Button onClick={onReset} variant="secondary">Start New Review</Button>
        </div>
      </div>

      <div className="mt-6 border-b border-gray-700">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('findings')}
            className={`${
              activeTab === 'findings'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
            } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
          >
            Findings
          </button>
          <button
            onClick={() => setActiveTab('patches')}
            className={`${
              activeTab === 'patches'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
            } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
          >
            Generated Patches
          </button>
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'findings' && (
          <div className="space-y-8">
            {Object.entries(findingsByFile).map(([filePath, fileFindings]) => (
                <div key={filePath}>
                    <h3 className="text-lg font-semibold text-cyan-300 font-mono sticky top-0 bg-gray-800/80 backdrop-blur-sm py-2">{filePath}</h3>
                    <div className="space-y-4 mt-2">
                    {fileFindings.map((finding) => (
                        <div key={finding.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                            <p className="text-sm text-gray-400 mb-2">Line {finding.lineNumber}: <span className="font-semibold text-red-400">{finding.issue}</span></p>
                            <div className="font-mono text-sm bg-gray-900 p-3 rounded-md">
                                <p className="text-red-500 whitespace-pre-wrap">- <HighlightedCode code={finding.codeSnippet} token={finding.issueToken} /></p>
                                <p className="text-green-500 whitespace-pre-wrap mt-1">+ {finding.suggestion}</p>
                            </div>
                            <p className="text-sm text-gray-300 mt-3"><span className="font-semibold text-gray-200">Reason:</span> {finding.reason}</p>
                        </div>
                    ))}
                    </div>
                </div>
            ))}
            {findings.length === 0 && <p className="text-gray-400 text-center py-8">No issues found. Excellent work!</p>}
          </div>
        )}

        {activeTab === 'patches' && (
           <div className="space-y-6">
            {patchesByFile.map(({filePath, patchContent, fileName}) => (
                <div key={filePath}>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold text-cyan-300 font-mono">{fileName}.patch</h3>
                        <Button onClick={() => copyToClipboard(patchContent)} variant="secondary" size="sm">
                            Copy Patch
                        </Button>
                    </div>
                    <pre className="bg-gray-900 p-4 rounded-md text-sm text-gray-300 font-mono overflow-x-auto">
                        {patchContent}
                    </pre>
                </div>
            ))}
             {patchesByFile.length === 0 && <p className="text-gray-400 text-center py-8">No patches to generate.</p>}
           </div>
        )}
      </div>
    </Card>
  );
};

export default FindingsReport;
