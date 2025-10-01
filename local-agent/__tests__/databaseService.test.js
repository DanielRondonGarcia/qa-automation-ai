// Mock PrismaClient
const mockPrismaClient = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $queryRaw: jest.fn(),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient),
}));

const DatabaseService = require('../services/databaseService');

describe('DatabaseService', () => {
  beforeEach(() => {
    // Reset the singleton instance
    DatabaseService.instance = null;
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = DatabaseService.getInstance();
      const instance2 = DatabaseService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should create instance through constructor', () => {
      const instance = new DatabaseService();
      expect(instance).toBeInstanceOf(DatabaseService);
    });
  });

  describe('getClient', () => {
    it('should return the Prisma client', () => {
      const service = DatabaseService.getInstance();
      const client = service.getClient();
      
      expect(client).toBeDefined();
      expect(client).toBe(mockPrismaClient);
    });
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      mockPrismaClient.$connect.mockResolvedValue();
      
      const service = DatabaseService.getInstance();
      const result = await service.connect();
      
      expect(result).toBe(true);
      expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(1);
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      mockPrismaClient.$connect.mockRejectedValue(error);
      
      const service = DatabaseService.getInstance();
      const result = await service.connect();
      
      expect(result).toBe(false);
      expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      mockPrismaClient.$disconnect.mockResolvedValue();
      
      const service = DatabaseService.getInstance();
      await service.disconnect();
      
      expect(mockPrismaClient.$disconnect).toHaveBeenCalledTimes(1);
    });

    it('should handle disconnection errors', async () => {
      const error = new Error('Disconnection failed');
      mockPrismaClient.$disconnect.mockRejectedValue(error);
      
      const service = DatabaseService.getInstance();
      await service.disconnect();
      
      expect(mockPrismaClient.$disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when query succeeds', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ '1': 1 }]);
      
      const service = DatabaseService.getInstance();
      const result = await service.healthCheck();
      
      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should return unhealthy status when query fails', async () => {
      const error = new Error('Database query failed');
      mockPrismaClient.$queryRaw.mockRejectedValue(error);
      
      const service = DatabaseService.getInstance();
      const result = await service.healthCheck();
      
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Database query failed');
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('runMigrations', () => {
    it('should run migrations successfully', async () => {
      // Mock child_process exec
      const mockExec = jest.fn((cmd, options, callback) => {
        callback(null, { stdout: 'Migration completed' });
      });
      
      jest.doMock('child_process', () => ({
        exec: mockExec
      }));
      
      const service = DatabaseService.getInstance();
      const result = await service.runMigrations();
      
      expect(result).toBe(true);
    });
  });
});