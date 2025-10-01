const ReviewService = require('../services/reviewService');

// Mock DatabaseService
jest.mock('../services/databaseService', () => {
  const mockClient = {
    project: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    review: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    file: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    reviewFile: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    finding: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  return {
    getInstance: jest.fn(() => ({
      getClient: jest.fn(() => mockClient),
    })),
  };
});

describe('ReviewService', () => {
  let reviewService;
  let mockDb;

  beforeEach(() => {
    jest.clearAllMocks();
    reviewService = new ReviewService();
    const DatabaseService = require('../services/databaseService');
    mockDb = DatabaseService.getInstance().getClient();
  });

  describe('Project Methods', () => {
    test('should create a project successfully', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'Test Description',
        repoUrl: 'https://github.com/test/repo',
        repoType: 'github',
        branch: 'main',
      };

      const expectedProject = { id: 1, ...projectData };
      mockDb.project.create.mockResolvedValue(expectedProject);

      const result = await reviewService.createProject(projectData);

      expect(mockDb.project.create).toHaveBeenCalledWith({
        data: projectData,
      });
      expect(result).toEqual(expectedProject);
    });

    test('should handle project creation error', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'Test Description',
        repoUrl: 'https://github.com/test/repo',
        repoType: 'github',
        branch: 'main',
      };

      mockDb.project.create.mockRejectedValue(new Error('Database error'));

      await expect(reviewService.createProject(projectData)).rejects.toThrow('Failed to create project');
    });

    test('should get a project by id', async () => {
      const projectId = 1;
      const expectedProject = { id: projectId, name: 'Test Project' };
      mockDb.project.findUnique.mockResolvedValue(expectedProject);

      const result = await reviewService.getProject(projectId);

      expect(mockDb.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
      });
      expect(result).toEqual(expectedProject);
    });

    test('should return null when project not found', async () => {
      const projectId = 999;
      mockDb.project.findUnique.mockRejectedValue(new Error('Not found'));

      const result = await reviewService.getProject(projectId);

      expect(result).toBeNull();
    });

    test('should list all projects', async () => {
      const expectedProjects = [
        { id: 1, name: 'Project 1' },
        { id: 2, name: 'Project 2' },
      ];
      mockDb.project.findMany.mockResolvedValue(expectedProjects);

      const result = await reviewService.listProjects();

      expect(mockDb.project.findMany).toHaveBeenCalled();
      expect(result).toEqual(expectedProjects);
    });
  });

  describe('Review Methods', () => {
    test('should create a review successfully', async () => {
      const reviewData = {
        projectId: 1,
        requestId: 'req-123',
        rules: ['rule1', 'rule2'],
      };

      const expectedReview = { id: 1, ...reviewData, status: 'PENDING' };
      mockDb.review.create.mockResolvedValue(expectedReview);

      const result = await reviewService.createReview(reviewData);

      expect(mockDb.review.create).toHaveBeenCalledWith({
        data: {
          projectId: reviewData.projectId,
          requestId: reviewData.requestId,
          status: 'PENDING',
          rules: reviewData.rules,
        },
      });
      expect(result).toEqual(expectedReview);
    });

    test('should get a review by id', async () => {
      const reviewId = 1;
      const expectedReview = { id: reviewId, status: 'completed' };
      mockDb.review.findUnique.mockResolvedValue(expectedReview);

      const result = await reviewService.getReview(reviewId);

      expect(mockDb.review.findUnique).toHaveBeenCalledWith({
        where: { id: reviewId },
        include: {
          project: true,
          files: true,
          findings: true,
        },
      });
      expect(result).toEqual(expectedReview);
    });

    test('should update review status', async () => {
      const reviewId = 1;
      const status = 'completed';
      const updatedReview = { id: reviewId, status };
      
      mockDb.review.update.mockResolvedValue(updatedReview);

      const result = await reviewService.updateReviewStatus(reviewId, status);

      expect(mockDb.review.update).toHaveBeenCalledWith({
        where: { id: reviewId },
        data: { status },
      });
      expect(result).toEqual(updatedReview);
    });
  });

  describe('File Methods', () => {
    test('should create a file successfully', async () => {
      const fileData = {
        reviewId: 1,
        filePath: '/test/file.js',
        fileName: 'file.js',
        fileSize: 1024,
        linesOfCode: 50,
      };

      const expectedFile = { id: 1, ...fileData, status: 'PENDING' };
      mockDb.reviewFile.create.mockResolvedValue(expectedFile);

      const result = await reviewService.createFile(fileData);

      expect(mockDb.reviewFile.create).toHaveBeenCalledWith({
        data: {
          reviewId: fileData.reviewId,
          filePath: fileData.filePath,
          fileName: fileData.fileName,
          fileSize: fileData.fileSize,
          linesOfCode: fileData.linesOfCode,
          status: 'PENDING',
        },
      });
      expect(result).toEqual(expectedFile);
    });

    test('should get files by review', async () => {
      const reviewId = 1;
      const expectedFiles = [
        { id: 1, filePath: '/test/file1.js' },
        { id: 2, filePath: '/test/file2.js' },
      ];
      mockDb.file.findMany.mockResolvedValue(expectedFiles);

      const result = await reviewService.getFilesByReview(reviewId);

      expect(mockDb.file.findMany).toHaveBeenCalledWith({
        where: { reviewId },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(expectedFiles);
    });
  });

  describe('Finding Methods', () => {
    test('should create a finding successfully', async () => {
      const findingData = {
        reviewId: 1,
        fileId: 1,
        type: 'security',
        severity: 'high',
        title: 'Security issue found',
        description: 'A security vulnerability was detected',
        line: 10,
        column: 5,
        code: 'vulnerable code snippet',
        suggestion: 'Fix the security issue',
        rule: 'security-rule-1',
        metadata: { category: 'security' },
      };

      const expectedFinding = { id: 1, ...findingData };
      mockDb.finding.create.mockResolvedValue(expectedFinding);

      const result = await reviewService.createFinding(findingData);

      expect(mockDb.finding.create).toHaveBeenCalledWith({
        data: {
          reviewId: findingData.reviewId,
          fileId: findingData.fileId,
          type: findingData.type,
          severity: findingData.severity,
          title: findingData.title,
          description: findingData.description,
          line: findingData.line,
          column: findingData.column,
          code: findingData.code,
          suggestion: findingData.suggestion,
          rule: findingData.rule,
          metadata: findingData.metadata,
        },
      });
      expect(result).toEqual(expectedFinding);
    });

    test('should get findings by review', async () => {
      const reviewId = 1;
      const expectedFindings = [
        { id: 1, type: 'security', severity: 'high' },
        { id: 2, type: 'performance', severity: 'medium' },
      ];
      mockDb.finding.findMany.mockResolvedValue(expectedFindings);

      const result = await reviewService.getFindings(reviewId);

      expect(mockDb.finding.findMany).toHaveBeenCalledWith({
        where: { reviewId },
        orderBy: { createdAt: 'desc' },
        include: {
          file: true,
        },
      });
      expect(result).toEqual(expectedFindings);
    });
  });
});