
export enum PipelineStep {
  SETUP = 'Setup',
  ANALYSIS = 'Analysis',
  REPORT = 'Report',
}

export enum RepoType {
  SVN = 'SVN',
  GIT = 'GIT',
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface Repository {
  type: RepoType;
  name: string;
  url: string;
  branch: string;
  username?: string;
  password?: string;
}

export interface Project {
  reqId: string;
  screen: string;
  repositories: Repository[];
  rules: Rule[];
}

export interface FileAnalysis {
  id: number;
  fileName: string;
  filePath: string;
  code: string;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
}

export interface Finding {
  id: string;
  fileName: string;
  filePath: string;
  lineNumber: number;
  codeSnippet: string;
  issue: string;
  suggestion: string;
  reason: string;
  issueToken?: string;
}

export interface Secret {
  id: string;
  name: string;
  value: string;
  username?: string;
}

export interface ReviewHistoryItem {
  id: string;
  project: Project;
  findings: Finding[];
  timestamp: string;
}

// Agent-related types
export enum AgentStatus {
    CONNECTING = 'connecting',
    CONNECTED = 'connected',
    DISCONNECTED = 'disconnected'
}

export enum ReviewJobStatus {
    PENDING = "pending",
    CLONING = "cloning",
    DIFFING = "diffing",
    ANALYZING = "analyzing",
    COMPLETED = "completed",
    ERROR = "error"
}

export interface ReviewProgress {
    totalFiles: number;
    processedFiles: number;
    currentFile: string | null;
}

export interface ReviewJob {
    reviewId: string;
    project: Project;
    status: ReviewJobStatus;
    progress: ReviewProgress;
    files: Omit<FileAnalysis, 'code'>[];
    findings: Finding[];
    error: string | null;
}
