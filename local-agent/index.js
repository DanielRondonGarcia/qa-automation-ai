
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { rimraf } = require('rimraf');
const { analyzeCode } = require('./openaiService');

// Import database services
const DatabaseService = require('./services/databaseService.js');
const SecretsService = require('./services/secretsService.js');
const ReviewService = require('./services/reviewService.js');

const app = express();
const PORT = process.env.PORT || 3001;
const WORKSPACE_DIR = path.join(__dirname, 'workspaces');

// Initialize database services
const dbService = DatabaseService.getInstance();
const secretsService = new SecretsService();
const reviewService = new ReviewService();

// In-memory store for review jobs (will be migrated to database)
const reviewJobs = new Map();

// --- Middleware ---
app.use(cors({ origin: '*' })); // Allow all origins for local dev
app.use(express.json());

// --- Enums for Status ---
const ReviewJobStatus = {
    PENDING: "pending",
    CLONING: "cloning",
    DIFFING: "diffing",
    ANALYZING: "analyzing",
    COMPLETED: "completed",
    ERROR: "error"
};

// --- Helper Functions ---

/**
 * Executes a shell command in a promise-based way.
 * @param {string} command The command to execute.
 * @param {string} cwd The working directory for the command.
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
const execPromise = (command, cwd) => {
    return new Promise((resolve, reject) => {
        exec(command, { cwd, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => { // Increased maxBuffer to 10MB
            if (error) {
                console.error(`Exec error for command "${command}":`, stderr);
                return reject(new Error(stderr || error.message));
            }
            resolve({ stdout, stderr });
        });
    });
};


// --- Utility Functions ---

/**
 * Robust workspace cleanup with retry logic for Windows file locking issues
 * @param {string} workspacePath - Path to the workspace directory
 * @param {string} reviewId - Review ID for logging
 */
const cleanupWorkspace = async (workspacePath, reviewId) => {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Check if directory exists before attempting cleanup
            if (!fs.existsSync(workspacePath)) {
                console.log(`[${reviewId}] Workspace already cleaned up: ${workspacePath}`);
                return;
            }
            
            // Force close any Git processes that might be holding file handles
            try {
                await execPromise('taskkill /F /IM git.exe', process.cwd()).catch(() => {
                    // Ignore errors if git.exe is not running
                });
            } catch (error) {
                // Ignore taskkill errors
            }
            
            // Wait a bit for file handles to be released
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Attempt to remove the directory
            await rimraf(workspacePath);
            console.log(`[${reviewId}] Successfully cleaned up workspace: ${workspacePath}`);
            return;
            
        } catch (error) {
            console.warn(`[${reviewId}] Cleanup attempt ${attempt}/${maxRetries} failed:`, error.message);
            
            if (attempt === maxRetries) {
                console.error(`[${reviewId}] Failed to cleanup workspace after ${maxRetries} attempts. Manual cleanup may be required: ${workspacePath}`);
                // Don't throw the error - continue execution
                return;
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
};

// --- Core Review Logic ---

const processReview = async (reviewId) => {
    const job = reviewJobs.get(reviewId);
    if (!job) return;

    const workspacePath = path.join(WORKSPACE_DIR, reviewId);
    let dbReview = null;
    let dbProject = null;

    try {
        // 1. Create or get project in database
        const firstRepo = job.project.repositories[0];
        dbProject = await reviewService.getProjectByRepoUrl(firstRepo.url);
        
        if (!dbProject) {
            dbProject = await reviewService.createProject({
                name: firstRepo.name || 'Unknown Project',
                description: `Project for ${firstRepo.url}`,
                repoUrl: firstRepo.url,
                repoType: firstRepo.type,
                branch: firstRepo.branch,
            });
            console.log(`[${reviewId}] Created new project in database: ${dbProject.id}`);
        }

        // 2. Check if review already exists, if not create it
        const requestId = job.project.reqId || reviewId;
        dbReview = await reviewService.getReviewByRequestId(requestId);
        
        if (dbReview) {
            console.log(`[${reviewId}] Found existing review in database: ${dbReview.id} for requestId: ${requestId}`);
            // Reset review status if it was in error state
            if (dbReview.status === 'ERROR') {
                await reviewService.updateReviewStatus(dbReview.id, 'PENDING');
                console.log(`[${reviewId}] Reset review status from ERROR to PENDING`);
            }
        } else {
            dbReview = await reviewService.createReview({
                projectId: dbProject.id,
                requestId: requestId,
                rules: job.project.rules,
            });
            console.log(`[${reviewId}] Created new review in database: ${dbReview.id}`);
        }

        // 3. Update review status to IN_PROGRESS
        await reviewService.updateReviewStatus(dbReview.id, 'IN_PROGRESS');

        // 4. Create Workspace
        if (!fs.existsSync(WORKSPACE_DIR)) fs.mkdirSync(WORKSPACE_DIR);
        fs.mkdirSync(workspacePath);
        console.log(`[${reviewId}] Created workspace at ${workspacePath}`);

        const allChangedFiles = [];
        const dbFiles = [];

        // 5. Clone all repositories
        job.status = ReviewJobStatus.CLONING;
        for (const repo of job.project.repositories) {
            const repoPath = path.join(workspacePath, repo.name);
            console.log(`[${reviewId}] Cloning ${repo.url} into ${repoPath}`);
            
            let command;
            if (repo.type === 'GIT') {
                let cloneUrl = repo.url;
                
                // Get secrets from database instead of memory
                const githubTokens = await secretsService.getSecretsByType('GITHUB_TOKEN');
                const gitSecrets = await secretsService.getSecretsByType('GIT');
                
                let secretToUse = null;
                if (cloneUrl.includes('github.com') && githubTokens.length > 0) {
                    secretToUse = githubTokens[0];
                } else if (gitSecrets.length > 0) {
                    secretToUse = gitSecrets[0];
                }

                if (secretToUse) {
                    const protocol = cloneUrl.startsWith('https://') ? 'https://' : 'http://';
                    const urlWithoutProtocol = cloneUrl.substring(protocol.length);
                    if (secretToUse.username) {
                        cloneUrl = `${protocol}${encodeURIComponent(secretToUse.username)}:${encodeURIComponent(secretToUse.value)}@${urlWithoutProtocol}`;
                    } else { // For tokens (like GitHub PAT)
                        cloneUrl = `${protocol}${secretToUse.value}@${urlWithoutProtocol}`;
                    }
                }
                command = `git clone --branch ${repo.branch} "${cloneUrl}" "${repo.name}"`;
            } else { // SVN
                let svnOptions = '--non-interactive';
                const svnSecrets = await secretsService.getSecretsByType('SVN');
                if (svnSecrets.length > 0 && svnSecrets[0].username && svnSecrets[0].value) {
                    svnOptions += ` --username "${svnSecrets[0].username}" --password "${svnSecrets[0].value}"`;
                }
                command = `svn checkout "${repo.url}" "${repo.name}" ${svnOptions}`;
            }

            await execPromise(command, workspacePath);
            console.log(`[${reviewId}] Cloned ${repo.name} successfully.`);
            
            // 6. Get changed files
            job.status = ReviewJobStatus.DIFFING;
            let changedFiles = [];
            if (repo.type === 'GIT') {
                console.log(`[${reviewId}] Fetching latest from remote for Git repo ${repo.name}`);
                await execPromise('git fetch origin', repoPath);
                
                // Detect the default branch automatically
                let defaultBranch = 'main';
                try {
                    const remoteHeadOutput = await execPromise('git symbolic-ref refs/remotes/origin/HEAD', repoPath);
                    defaultBranch = remoteHeadOutput.stdout.trim().replace('refs/remotes/origin/', '');
                } catch (error) {
                    // If symbolic-ref fails, try to detect common default branches
                    try {
                        await execPromise('git rev-parse --verify origin/main', repoPath);
                        defaultBranch = 'main';
                    } catch {
                        try {
                            await execPromise('git rev-parse --verify origin/master', repoPath);
                            defaultBranch = 'master';
                        } catch {
                            try {
                                await execPromise('git rev-parse --verify origin/develop', repoPath);
                                defaultBranch = 'develop';
                            } catch {
                                console.warn(`[${reviewId}] Could not detect default branch, using 'main' as fallback`);
                                defaultBranch = 'main';
                            }
                        }
                    }
                }
                
                console.log(`[${reviewId}] Calculating diff for Git branch ${repo.branch} against origin/${defaultBranch}`);
                
                // Try multiple diff strategies with fallbacks
                let diffOutput;
                try {
                    // First try: three-dot diff with origin
                    diffOutput = await execPromise(`git diff --name-only origin/${defaultBranch}...${repo.branch}`, repoPath);
                } catch (error) {
                    console.warn(`[${reviewId}] Three-dot diff failed, trying two-dot diff: ${error.message}`);
                    try {
                        // Second try: two-dot diff with origin
                        diffOutput = await execPromise(`git diff --name-only origin/${defaultBranch}..${repo.branch}`, repoPath);
                    } catch (error2) {
                        console.warn(`[${reviewId}] Two-dot diff with origin failed, trying local branch: ${error2.message}`);
                        try {
                            // Third try: diff with local default branch
                            diffOutput = await execPromise(`git diff --name-only ${defaultBranch}...${repo.branch}`, repoPath);
                        } catch (error3) {
                            console.warn(`[${reviewId}] Local branch diff failed, using HEAD diff: ${error3.message}`);
                            try {
                                // Fourth try: diff with HEAD
                                diffOutput = await execPromise(`git diff --name-only HEAD~1..HEAD`, repoPath);
                            } catch (error4) {
                                console.warn(`[${reviewId}] HEAD diff failed, listing all files: ${error4.message}`);
                                // Final fallback: list all .cs files in the repository (Windows compatible)
                                diffOutput = await execPromise(`powershell -Command "Get-ChildItem -Path . -Recurse -Filter '*.cs' | ForEach-Object { $_.FullName.Replace((Get-Location).Path + '\\', '') }"`, repoPath);
                            }
                        }
                    }
                }
                
                changedFiles = diffOutput.stdout.trim().split('\n').filter(Boolean);

            } else { // SVN
                console.log(`[${reviewId}] Calculating diff for SVN branch ${repo.name}`);
                
                const logOutput = await execPromise(`svn log --stop-on-copy -q "${repo.url}"`, workspacePath);
                const logLines = logOutput.stdout.trim().split('\n');
                const lastLogLine = logLines[logLines.length - 2];
                const match = lastLogLine.match(/^r(\d+)\s\|/);

                if (!match || !match[1]) {
                    throw new Error(`Could not determine base revision for SVN branch ${repo.url}`);
                }
                const baseRevision = match[1];
                console.log(`[${reviewId}] Found base revision ${baseRevision} for SVN branch ${repo.name}`);
                
                const diffOutput = await execPromise(`svn diff --summarize -r ${baseRevision}:HEAD "${repoPath}"`, workspacePath);
                const diffLines = diffOutput.stdout.trim().split('\n').filter(Boolean);
                
                changedFiles = diffLines
                    .filter(line => line.trim().startsWith('A') || line.trim().startsWith('M')) // Added or Modified
                    .map(line => {
                        const filePath = line.replace(/^[AM]\s+/, '').trim();
                        return path.relative(repoPath, filePath);
                    });
            }

            const csharpFiles = changedFiles
                .filter(file => file.endsWith('.cs'))
                .map(file => ({
                    id: uuidv4(),
                    fileName: path.basename(file),
                    filePath: file.replace(/\\/g, '/'),
                    fullPath: path.join(repoPath, file),
                    status: 'pending'
                }));

            // Create files in database
            for (const file of csharpFiles) {
                try {
                    const stats = fs.existsSync(file.fullPath) ? fs.statSync(file.fullPath) : null;
                    const dbFile = await reviewService.createFile({
                        reviewId: dbReview.id,
                        filePath: file.filePath,
                        fileName: file.fileName,
                        fileSize: stats ? stats.size : null,
                        linesOfCode: stats ? fs.readFileSync(file.fullPath, 'utf8').split('\n').length : null,
                    });
                    file.dbId = dbFile.id;
                    dbFiles.push(dbFile);
                } catch (error) {
                    console.error(`[${reviewId}] Error creating file in database:`, error);
                }
            }
            
            job.files.push(...csharpFiles);
            allChangedFiles.push(...csharpFiles);
        }
        
        job.progress.totalFiles = allChangedFiles.length;

        // 7. Analyze files
        job.status = ReviewJobStatus.ANALYZING;
        for (const file of allChangedFiles) {
            job.progress.currentFile = file.filePath;
            console.log(`[${reviewId}] Analyzing ${file.filePath}`);
            
            try {
                if (!fs.existsSync(file.fullPath)) {
                     console.warn(`[${reviewId}] File not found, skipping: ${file.fullPath}`);
                     job.files.find(f => f.id === file.id).status = 'error';
                     if (file.dbId) {
                         await reviewService.updateFileStatus(file.dbId, 'ERROR');
                     }
                     continue;
                }
                
                const code = fs.readFileSync(file.fullPath, 'utf8');
                const findings = await analyzeCode(code, job.project.rules);
                
                if (findings.length > 0) {
                    const fileFindings = findings.map(f => ({ 
                        ...f, 
                        id: uuidv4(), 
                        fileName: file.fileName, 
                        filePath: file.filePath 
                    }));
                    job.findings.push(...fileFindings);

                    // Store findings in database
                    const dbFindings = findings.map(finding => ({
                        reviewId: dbReview.id,
                        fileId: file.dbId,
                        type: finding.type || 'UNKNOWN',
                        severity: finding.severity || 'MEDIUM',
                        title: finding.title || finding.message || 'Issue found',
                        description: finding.description || finding.message || 'No description available',
                        line: finding.line,
                        column: finding.column,
                        code: finding.code,
                        suggestion: finding.suggestion,
                        rule: finding.rule,
                        metadata: finding,
                    }));

                    await reviewService.createMultipleFindings(dbFindings);
                }
                
                job.files.find(f => f.id === file.id).status = 'completed';
                if (file.dbId) {
                    await reviewService.updateFileStatus(file.dbId, 'ANALYZED', findings.length);
                }
            } catch (analysisError) {
                console.error(`[${reviewId}] Error analyzing file ${file.filePath}:`, analysisError);
                job.files.find(f => f.id === file.id).status = 'error';
                job.error = `Error analyzing ${file.fileName}: ${analysisError.message}`;
                if (file.dbId) {
                    await reviewService.updateFileStatus(file.dbId, 'ERROR');
                }
            } finally {
                job.progress.processedFiles++;
            }
        }

        job.status = ReviewJobStatus.COMPLETED;
        await reviewService.updateReviewStatus(dbReview.id, 'COMPLETED');
        await reviewService.updateReviewStats(dbReview.id);
        console.log(`[${reviewId}] Review completed successfully.`);

    } catch (error) {
        console.error(`[${reviewId}] An error occurred during the review process:`, error);
        job.status = ReviewJobStatus.ERROR;
        job.error = error.message || "An unknown error occurred in the agent.";
        
        if (dbReview) {
            await reviewService.updateReviewStatus(dbReview.id, 'FAILED', error.message);
        }
    } finally {
        // 8. Cleanup Workspace
        console.log(`[${reviewId}] Cleaning up workspace: ${workspacePath}`);
        await cleanupWorkspace(workspacePath, reviewId);
        job.progress.currentFile = null;
    }
};


// --- API Routes ---

app.get('/ping', (req, res) => {
    res.json({ status: "ok", version: "1.0.0" });
});

// Health check endpoint for Docker
app.get('/health', async (req, res) => {
    try {
        const dbHealth = await dbService.healthCheck();
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                database: dbHealth,
                server: { status: 'healthy' }
            }
        };
        res.json(health);
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

app.post('/api/review', (req, res) => {
    const { project, secrets } = req.body;
    if (!project || !project.repositories || project.repositories.length === 0) {
        return res.status(400).json({ error: "Invalid project data provided." });
    }

    const reviewId = uuidv4();
    const newJob = {
        reviewId,
        project,
        secrets,
        status: ReviewJobStatus.PENDING,
        progress: {
            totalFiles: 0,
            processedFiles: 0,
            currentFile: null,
        },
        files: [],
        findings: [],
        error: null,
    };

    reviewJobs.set(reviewId, newJob);
    console.log(`[${reviewId}] New review job created for REQ ${project.reqId}.`);

    // Start processing asynchronously
    processReview(reviewId);

    res.status(202).json({ reviewId });
});

app.get('/api/review/:reviewId/status', (req, res) => {
    const { reviewId } = req.params;
    const job = reviewJobs.get(reviewId);

    if (!job) {
        return res.status(404).json({ error: "Review job not found." });
    }
    
    // Don't send the full project config or secrets back every time to save bandwidth/for security
    const { project, secrets, ...jobStatus } = job;
    const response = {
        ...jobStatus,
        // Only send project back on the final response
        ...(job.status === ReviewJobStatus.COMPLETED || job.status === ReviewJobStatus.ERROR ? { project } : {})
    };


    res.json(response);
});

// Database API Routes
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await reviewService.listProjects();
        res.json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

app.get('/api/projects/:id', async (req, res) => {
    try {
        const project = await reviewService.getProject(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json(project);
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
});

app.get('/api/projects/:id/reviews', async (req, res) => {
    try {
        const reviews = await reviewService.listReviews(req.params.id);
        res.json(reviews);
    } catch (error) {
        console.error('Error fetching project reviews:', error);
        res.status(500).json({ error: 'Failed to fetch project reviews' });
    }
});

app.get('/api/reviews', async (req, res) => {
    try {
        const reviews = await reviewService.listReviews();
        res.json(reviews);
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

app.get('/api/reviews/:id', async (req, res) => {
    try {
        const review = await reviewService.getReview(req.params.id);
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }
        res.json(review);
    } catch (error) {
        console.error('Error fetching review:', error);
        res.status(500).json({ error: 'Failed to fetch review' });
    }
});

app.get('/api/reviews/:id/files', async (req, res) => {
    try {
        const files = await reviewService.getFilesByReview(req.params.id);
        res.json(files);
    } catch (error) {
        console.error('Error fetching review files:', error);
        res.status(500).json({ error: 'Failed to fetch review files' });
    }
});

app.get('/api/reviews/:id/findings', async (req, res) => {
    try {
        const { severity, type } = req.query;
        const findings = await reviewService.getFindingsByReview(req.params.id, severity, type);
        res.json(findings);
    } catch (error) {
        console.error('Error fetching review findings:', error);
        res.status(500).json({ error: 'Failed to fetch review findings' });
    }
});

app.get('/api/reviews/:id/report', async (req, res) => {
    try {
        const review = await reviewService.getReviewById(req.params.id);
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }

        const files = await reviewService.getFilesByReview(req.params.id);
        const findings = await reviewService.getFindingsByReview(req.params.id);

        const report = {
            id: review.id,
            requestId: review.requestId,
            project: review.project,
            status: review.status,
            rules: review.rules,
            files: files,
            findings: findings,
            createdAt: review.createdAt,
            summary: {
                totalFiles: files.length,
                analyzedFiles: files.filter(f => f.status === 'ANALYZED').length,
                totalFindings: findings.length,
                findingsBySeverity: findings.reduce((acc, f) => {
                    acc[f.severity] = (acc[f.severity] || 0) + 1;
                    return acc;
                }, {}),
                findingsByType: findings.reduce((acc, f) => {
                    acc[f.type] = (acc[f.type] || 0) + 1;
                    return acc;
                }, {})
            }
        };
        
        res.json(report);
    } catch (error) {
        console.error('Error generating review report:', error);
        res.status(500).json({ error: 'Failed to generate review report' });
    }
});

app.get('/api/findings/:id', async (req, res) => {
    try {
        const finding = await reviewService.getFindingById(req.params.id);
        if (!finding) {
            return res.status(404).json({ error: 'Finding not found' });
        }
        res.json(finding);
    } catch (error) {
        console.error('Error fetching finding:', error);
        res.status(500).json({ error: 'Failed to fetch finding' });
    }
});

// Secrets API Routes
app.get('/api/secrets', async (req, res) => {
    try {
        const { type } = req.query;
        const secrets = type 
            ? await secretsService.getSecretsByType(type)
            : await secretsService.getAllActiveSecrets();
        
        // Remove sensitive values from response
        const safeSecrets = secrets.map(secret => ({
            ...secret,
            value: '***HIDDEN***'
        }));
        
        res.json(safeSecrets);
    } catch (error) {
        console.error('Error fetching secrets:', error);
        res.status(500).json({ error: 'Failed to fetch secrets' });
    }
});

app.post('/api/secrets', async (req, res) => {
    try {
        const { name, value, type, username, description } = req.body;
        
        if (!name || !value || !type) {
            return res.status(400).json({ error: 'Name, value, and type are required' });
        }

        const secret = await secretsService.storeSecret({
            name,
            value,
            type,
            description
        });
        
        // Remove sensitive value from response
        const safeSecret = {
            ...secret,
            value: '***HIDDEN***'
        };
        
        res.status(201).json(safeSecret);
    } catch (error) {
        console.error('Error creating secret:', error);
        res.status(500).json({ error: 'Failed to create secret' });
    }
});

app.put('/api/secrets/:id', async (req, res) => {
    try {
        const { name, value, type, username, description } = req.body;
        const secret = await secretsService.updateSecret(req.params.id, {
            name,
            value,
            type,
            username,
            description
        });
        
        if (!secret) {
            return res.status(404).json({ error: 'Secret not found' });
        }

        // Remove sensitive value from response
        const safeSecret = {
            ...secret,
            value: '***HIDDEN***'
        };
        
        res.json(safeSecret);
    } catch (error) {
        console.error('Error updating secret:', error);
        res.status(500).json({ error: 'Failed to update secret' });
    }
});

app.delete('/api/secrets/:id', async (req, res) => {
    try {
        const success = await secretsService.deleteSecret(req.params.id);
        if (!success) {
            return res.status(404).json({ error: 'Secret not found' });
        }
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting secret:', error);
        res.status(500).json({ error: 'Failed to delete secret' });
    }
});


app.listen(PORT, '127.0.0.1', () => {
    console.log(`QA Pipeline Local Agent listening on http://localhost:${PORT}`);
});
