import DatabaseService from './databaseService';
import { Project, Review, ReviewFile, Finding } from '@prisma/client';

export interface CreateProjectData {
  name: string;
  description?: string;
  repoUrl: string;
  repoType: 'GIT' | 'SVN';
  branch?: string;
}

export interface CreateReviewData {
  projectId: string;
  requestId: string;
  rules?: any;
}

export interface CreateFileData {
  reviewId: string;
  filePath: string;
  fileName: string;
  fileSize?: number;
  linesOfCode?: number;
}

export interface CreateFindingData {
  reviewId: string;
  fileId: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  line?: number;
  column?: number;
  code?: string;
  suggestion?: string;
  rule?: string;
  metadata?: any;
}

export interface ReviewWithDetails extends Review {
  project: Project;
  files: ReviewFile[];
  findings: Finding[];
}

class ReviewService {
  private db = DatabaseService.getInstance().getClient();

  // Métodos para Proyectos
  async createProject(data: CreateProjectData): Promise<Project> {
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

  async getProject(id: string): Promise<Project | null> {
    try {
      return await this.db.project.findUnique({
        where: { id },
      });
    } catch (error) {
      console.error('Error getting project:', error);
      return null;
    }
  }

  async listProjects(): Promise<Project[]> {
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
  async createReview(data: CreateReviewData): Promise<Review> {
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

  async updateReviewStatus(
    id: string, 
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED',
    errorMessage?: string
  ): Promise<Review | null> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date(),
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

  async getReview(id: string): Promise<ReviewWithDetails | null> {
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

  async getReviewByRequestId(requestId: string): Promise<ReviewWithDetails | null> {
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

  async listReviews(projectId?: string): Promise<Review[]> {
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
  async createFile(data: CreateFileData): Promise<ReviewFile> {
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

  async updateFileStatus(
    id: string,
    status: 'PENDING' | 'ANALYZED' | 'SKIPPED' | 'ERROR',
    issueCount?: number
  ): Promise<ReviewFile | null> {
    try {
      const updateData: any = {
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
  async createFinding(data: CreateFindingData): Promise<Finding> {
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

  async createMultipleFindings(findings: CreateFindingData[]): Promise<Finding[]> {
    try {
      return await this.db.finding.createMany({
        data: findings,
      }).then(() => 
        this.db.finding.findMany({
          where: {
            reviewId: findings[0]?.reviewId,
          },
          orderBy: { createdAt: 'desc' },
          take: findings.length,
        })
      );
    } catch (error) {
      console.error('Error creating multiple findings:', error);
      throw new Error('Failed to create findings');
    }
  }

  async getFindings(reviewId: string): Promise<Finding[]> {
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
  async getReviewStats(reviewId: string): Promise<{
    totalFiles: number;
    totalIssues: number;
    issuesBySeverity: Record<string, number>;
    issuesByType: Record<string, number>;
  }> {
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
      }, {} as Record<string, number>);

      const issuesByType = findings.reduce((acc, finding) => {
        acc[finding.type] = (acc[finding.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

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

  async updateReviewStats(reviewId: string): Promise<void> {
    try {
      const stats = await this.getReviewStats(reviewId);
      
      await this.db.review.update({
        where: { id: reviewId },
        data: {
          totalFiles: stats.totalFiles,
          totalIssues: stats.totalIssues,
          summary: {
            issuesBySeverity: stats.issuesBySeverity,
            issuesByType: stats.issuesByType,
          },
        },
      });
    } catch (error) {
      console.error('Error updating review stats:', error);
    }
  }
}

export default ReviewService;