const DatabaseService = require('./databaseService');

class ReviewService {
  constructor() {
    this.db = DatabaseService.getInstance().getClient();
  }

  // Métodos para Proyectos
  async createProject(data) {
    try {
      return await this.db.project.create({
        data: {
          name: data.name,
          description: data.description,
          repoUrl: data.repoUrl,
          repoType: data.repoType,
          branch: data.branch,
        },
      });
    } catch (error) {
      console.error('Error creating project:', error);
      throw new Error('Failed to create project');
    }
  }

  async getProject(id) {
    try {
      return await this.db.project.findUnique({
        where: { id },
      });
    } catch (error) {
      console.error('Error getting project:', error);
      return null;
    }
  }

  async getProjectByRepoUrl(repoUrl) {
    try {
      return await this.db.project.findFirst({
        where: { repoUrl, isActive: true },
      });
    } catch (error) {
      console.error('Error getting project by repo URL:', error);
      return null;
    }
  }

  async listProjects() {
    try {
      return await this.db.project.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('Error listing projects:', error);
      return [];
    }
  }

  // Métodos para Reviews
  async createReview(data) {
    try {
      return await this.db.review.create({
        data: {
          projectId: data.projectId,
          requestId: data.requestId,
          status: 'PENDING',
          rules: data.rules,
        },
      });
    } catch (error) {
      console.error('Error creating review:', error);
      throw new Error('Failed to create review');
    }
  }

  async updateReviewStatus(id, status, errorMessage) {
    try {
      const updateData = {
        status,
      };

      if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
      }

      if (errorMessage) {
        updateData.errorMessage = errorMessage;
      }

      return await this.db.review.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      console.error('Error updating review status:', error);
      return null;
    }
  }

  async getReview(id) {
    try {
      return await this.db.review.findUnique({
        where: { id },
        include: {
          project: true,
          files: true,
          findings: true,
        },
      });
    } catch (error) {
      console.error('Error getting review:', error);
      return null;
    }
  }

  async getReviewByRequestId(requestId) {
    try {
      return await this.db.review.findUnique({
        where: { requestId },
        include: {
          project: true,
          files: true,
          findings: true,
        },
      });
    } catch (error) {
      console.error('Error getting review by request ID:', error);
      return null;
    }
  }

  async listReviews(projectId) {
    try {
      const where = projectId ? { projectId } : {};
      
      return await this.db.review.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        include: {
          project: true,
        },
      });
    } catch (error) {
      console.error('Error listing reviews:', error);
      return [];
    }
  }

  // Métodos para Archivos
  async createFile(data) {
    try {
      return await this.db.reviewFile.create({
        data: {
          reviewId: data.reviewId,
          filePath: data.filePath,
          fileName: data.fileName,
          fileSize: data.fileSize,
          linesOfCode: data.linesOfCode,
          status: 'PENDING',
        },
      });
    } catch (error) {
      console.error('Error creating file:', error);
      throw new Error('Failed to create file');
    }
  }

  async updateFileStatus(id, status, issueCount) {
    try {
      const updateData = {
        status,
      };

      if (status === 'ANALYZED') {
        updateData.analyzedAt = new Date();
      }

      if (issueCount !== undefined) {
        updateData.issueCount = issueCount;
      }

      return await this.db.reviewFile.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      console.error('Error updating file status:', error);
      return null;
    }
  }

  // Métodos para Hallazgos
  async createFinding(data) {
    try {
      return await this.db.finding.create({
        data: {
          reviewId: data.reviewId,
          fileId: data.fileId,
          type: data.type,
          severity: data.severity,
          title: data.title,
          description: data.description,
          line: data.line,
          column: data.column,
          code: data.code,
          suggestion: data.suggestion,
          rule: data.rule,
          metadata: data.metadata,
        },
      });
    } catch (error) {
      console.error('Error creating finding:', error);
      throw new Error('Failed to create finding');
    }
  }

  async createMultipleFindings(findings) {
    try {
      const createdFindings = [];
      
      for (const finding of findings) {
        const created = await this.createFinding(finding);
        createdFindings.push(created);
      }
      
      return createdFindings;
    } catch (error) {
      console.error('Error creating multiple findings:', error);
      throw new Error('Failed to create findings');
    }
  }

  async getFindings(reviewId) {
    try {
      return await this.db.finding.findMany({
        where: { reviewId },
        orderBy: { createdAt: 'desc' },
        include: {
          file: true,
        },
      });
    } catch (error) {
      console.error('Error getting findings:', error);
      return [];
    }
  }

  // Métodos de estadísticas
  async getReviewStats(reviewId) {
    try {
      const [files, findings] = await Promise.all([
        this.db.reviewFile.count({ where: { reviewId } }),
        this.db.finding.findMany({ 
          where: { reviewId },
          select: { severity: true, type: true }
        }),
      ]);

      const issuesBySeverity = findings.reduce((acc, finding) => {
        acc[finding.severity] = (acc[finding.severity] || 0) + 1;
        return acc;
      }, {});

      const issuesByType = findings.reduce((acc, finding) => {
        acc[finding.type] = (acc[finding.type] || 0) + 1;
        return acc;
      }, {});

      return {
        totalFiles: files,
        totalIssues: findings.length,
        issuesBySeverity,
        issuesByType,
      };
    } catch (error) {
      console.error('Error getting review stats:', error);
      return {
        totalFiles: 0,
        totalIssues: 0,
        issuesBySeverity: {},
        issuesByType: {},
      };
    }
  }

  async updateReviewStats(reviewId) {
    try {
      const stats = await this.getReviewStats(reviewId);
      
      await this.db.review.update({
        where: { id: reviewId },
        data: {
          totalFiles: stats.totalFiles,
          analyzedFiles: stats.analyzedFiles,
          totalFindings: stats.totalFindings,
          criticalFindings: stats.criticalFindings,
          highFindings: stats.highFindings,
          mediumFindings: stats.mediumFindings,
          lowFindings: stats.lowFindings,
        },
      });
    } catch (error) {
      console.error('Error updating review stats:', error);
      throw new Error('Failed to update review stats');
    }
  }

  // Funciones adicionales para las APIs
  async getFilesByReview(reviewId) {
    try {
      return await this.db.file.findMany({
        where: { reviewId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('Error getting files by review:', error);
      return [];
    }
  }

  async getFindingsByReview(reviewId, severity = null, type = null) {
    try {
      const where = { reviewId };
      if (severity) where.severity = severity;
      if (type) where.type = type;

      return await this.db.finding.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('Error getting findings by review:', error);
      return [];
    }
  }

  async getFindingById(id) {
    try {
      return await this.db.finding.findUnique({
        where: { id },
      });
    } catch (error) {
      console.error('Error getting finding by id:', error);
      return null;
    }
  }
}

module.exports = ReviewService;