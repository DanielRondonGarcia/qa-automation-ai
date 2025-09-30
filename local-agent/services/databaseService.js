const { PrismaClient } = require('@prisma/client');

class DatabaseService {
  constructor() {
    if (DatabaseService.instance) {
      return DatabaseService.instance;
    }

    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });

    DatabaseService.instance = this;
  }

  static getInstance() {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  getClient() {
    return this.prisma;
  }

  async connect() {
    try {
      await this.prisma.$connect();
      console.log('✅ Database connected successfully');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
  }

  async disconnect() {
    try {
      await this.prisma.$disconnect();
      console.log('✅ Database disconnected successfully');
    } catch (error) {
      console.error('❌ Database disconnection failed:', error);
    }
  }

  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date() };
    } catch (error) {
      console.error('Database health check failed:', error);
      return { status: 'unhealthy', error: error.message, timestamp: new Date() };
    }
  }

  async runMigrations() {
    try {
      console.log('🔄 Running database migrations...');
      // Note: In production, you should run migrations separately
      // This is just for development convenience
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);
      
      await execPromise('npx prisma migrate deploy', { cwd: process.cwd() });
      console.log('✅ Database migrations completed');
      return true;
    } catch (error) {
      console.error('❌ Database migrations failed:', error);
      return false;
    }
  }
}

module.exports = DatabaseService;