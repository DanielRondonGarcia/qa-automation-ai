// Mock CryptoJS
jest.mock('crypto-js', () => ({
  AES: {
    encrypt: jest.fn(),
    decrypt: jest.fn()
  },
  enc: {
    Utf8: 'utf8'
  }
}));

// Mock DatabaseService
jest.mock('../services/databaseService');

const CryptoJS = require('crypto-js');
const SecretsService = require('../services/secretsService');
const DatabaseService = require('../services/databaseService');

describe('SecretsService', () => {
  let secretsService;
  let mockDb;
  let originalEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Save original environment
    originalEnv = process.env.ENCRYPTION_KEY;
    
    // Mock database client
    mockDb = {
      sessionSecret: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    // Mock DatabaseService
    const mockDatabaseService = {
      getClient: jest.fn().mockReturnValue(mockDb)
    };
    DatabaseService.getInstance.mockReturnValue(mockDatabaseService);

    // Set test encryption key
    process.env.ENCRYPTION_KEY = 'test-encryption-key';
    
    secretsService = new SecretsService();
  });

  afterEach(() => {
    // Restore original environment
    process.env.ENCRYPTION_KEY = originalEnv;
  });

  describe('Constructor', () => {
    it('should initialize with custom encryption key', () => {
      process.env.ENCRYPTION_KEY = 'custom-key';
      const service = new SecretsService();
      
      expect(service.encryptionKey).toBe('custom-key');
    });

    it('should use default encryption key when not provided', () => {
      delete process.env.ENCRYPTION_KEY;
      const service = new SecretsService();
      
      expect(service.encryptionKey).toBe('default-key-change-in-production');
    });

    it('should warn when using default encryption key', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      delete process.env.ENCRYPTION_KEY;
      
      new SecretsService();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '⚠️ Using default encryption key. Please set ENCRYPTION_KEY in production!'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Encryption Methods', () => {
    describe('encrypt', () => {
      it('should encrypt text successfully', () => {
        const plainText = 'secret-password';
        const encryptedText = 'encrypted-result';
        
        CryptoJS.AES.encrypt.mockReturnValue({
          toString: jest.fn().mockReturnValue(encryptedText)
        });

        const result = secretsService.encrypt(plainText);

        expect(CryptoJS.AES.encrypt).toHaveBeenCalledWith(plainText, 'test-encryption-key');
        expect(result).toBe(encryptedText);
      });

      it('should handle encryption errors', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        CryptoJS.AES.encrypt.mockImplementation(() => {
          throw new Error('Encryption failed');
        });

        expect(() => secretsService.encrypt('test')).toThrow('Failed to encrypt data');
        expect(consoleSpy).toHaveBeenCalledWith('Error encrypting data:', expect.any(Error));
        
        consoleSpy.mockRestore();
      });
    });

    describe('decrypt', () => {
      it('should decrypt text successfully', () => {
        const encryptedText = 'encrypted-data';
        const decryptedText = 'decrypted-result';
        
        const mockBytes = {
          toString: jest.fn().mockReturnValue(decryptedText)
        };
        
        CryptoJS.AES.decrypt.mockReturnValue(mockBytes);

        const result = secretsService.decrypt(encryptedText);

        expect(CryptoJS.AES.decrypt).toHaveBeenCalledWith(encryptedText, 'test-encryption-key');
        expect(mockBytes.toString).toHaveBeenCalledWith('utf8');
        expect(result).toBe(decryptedText);
      });

      it('should handle decryption errors', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        CryptoJS.AES.decrypt.mockImplementation(() => {
          throw new Error('Decryption failed');
        });

        expect(() => secretsService.decrypt('invalid')).toThrow('Failed to decrypt data');
        expect(consoleSpy).toHaveBeenCalledWith('Error decrypting data:', expect.any(Error));
        
        consoleSpy.mockRestore();
      });
    });
  });

  describe('Database Methods', () => {
    describe('storeSecret', () => {
      it('should store secret successfully', async () => {
        const secretData = {
          type: 'api_key',
          name: 'test-secret',
          value: 'secret-value',
          expiresAt: new Date()
        };

        const encryptedValue = 'encrypted-secret-value';
        const mockStoredSecret = { id: 1, ...secretData, value: encryptedValue };

        // Mock encryption
        CryptoJS.AES.encrypt.mockReturnValue({
          toString: jest.fn().mockReturnValue(encryptedValue)
        });

        mockDb.sessionSecret.create.mockResolvedValue(mockStoredSecret);

        const result = await secretsService.storeSecret(secretData);

        expect(CryptoJS.AES.encrypt).toHaveBeenCalledWith(secretData.value, 'test-encryption-key');
        expect(mockDb.sessionSecret.create).toHaveBeenCalledWith({
          data: {
            type: secretData.type,
            name: secretData.name,
            value: encryptedValue,
            expiresAt: secretData.expiresAt,
          }
        });
        expect(result).toEqual(mockStoredSecret);
      });

      it('should handle storage errors', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        const secretData = { type: 'test', name: 'test', value: 'test' };
        
        CryptoJS.AES.encrypt.mockReturnValue({
          toString: jest.fn().mockReturnValue('encrypted')
        });
        
        mockDb.sessionSecret.create.mockRejectedValue(new Error('Database error'));

        await expect(secretsService.storeSecret(secretData))
          .rejects.toThrow('Failed to store secret');
        
        expect(consoleSpy).toHaveBeenCalledWith('Error storing secret:', expect.any(Error));
        consoleSpy.mockRestore();
      });
    });

    describe('getSecret', () => {
      it('should retrieve and decrypt secret successfully', async () => {
        const encryptedSecret = {
          id: 1,
          type: 'api_key',
          name: 'test-secret',
          value: 'encrypted-value'
        };

        const decryptedValue = 'decrypted-value';

        mockDb.sessionSecret.findUnique.mockResolvedValue(encryptedSecret);
        
        const mockBytes = {
          toString: jest.fn().mockReturnValue(decryptedValue)
        };
        CryptoJS.AES.decrypt.mockReturnValue(mockBytes);

        const result = await secretsService.getSecret(1);

        expect(mockDb.sessionSecret.findUnique).toHaveBeenCalledWith({
          where: { id: 1, isActive: true }
        });
        expect(CryptoJS.AES.decrypt).toHaveBeenCalledWith('encrypted-value', 'test-encryption-key');
        expect(result).toEqual({
          ...encryptedSecret,
          value: decryptedValue
        });
      });

      it('should return null for non-existent secret', async () => {
        mockDb.sessionSecret.findUnique.mockResolvedValue(null);

        const result = await secretsService.getSecret(999);

        expect(result).toBeNull();
      });
    });

    describe('getSecretsByType', () => {
      it('should retrieve secrets by type', async () => {
        const mockSecrets = [
          { id: 1, type: 'api_key', value: 'encrypted1' },
          { id: 2, type: 'api_key', value: 'encrypted2' }
        ];

        mockDb.sessionSecret.findMany.mockResolvedValue(mockSecrets);
        
        const mockBytes = {
          toString: jest.fn()
            .mockReturnValueOnce('decrypted1')
            .mockReturnValueOnce('decrypted2')
        };
        CryptoJS.AES.decrypt.mockReturnValue(mockBytes);

        const result = await secretsService.getSecretsByType('api_key');

        expect(mockDb.sessionSecret.findMany).toHaveBeenCalledWith({
          where: { 
            type: 'api_key',
            isActive: true,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: expect.any(Date) } }
            ]
          },
          orderBy: { createdAt: 'desc' }
        });
        expect(result).toHaveLength(2);
        expect(result[0].value).toBe('decrypted1');
        expect(result[1].value).toBe('decrypted2');
      });
    });

    describe('updateSecret', () => {
      it('should update secret with encryption', async () => {
        const updates = { value: 'new-secret-value' };
        const encryptedValue = 'new-encrypted-value';
        const mockUpdatedSecret = { id: 1, value: encryptedValue };

        CryptoJS.AES.encrypt.mockReturnValue({
          toString: jest.fn().mockReturnValue(encryptedValue)
        });

        mockDb.sessionSecret.update.mockResolvedValue(mockUpdatedSecret);

        const result = await secretsService.updateSecret(1, updates);

        expect(CryptoJS.AES.encrypt).toHaveBeenCalledWith('new-secret-value', 'test-encryption-key');
        expect(mockDb.sessionSecret.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { value: encryptedValue }
        });
        expect(result).toEqual(mockUpdatedSecret);
      });

      it('should update secret without encryption for non-value fields', async () => {
        const updates = { name: 'new-name' };
        const mockUpdatedSecret = { id: 1, name: 'new-name' };

        mockDb.sessionSecret.update.mockResolvedValue(mockUpdatedSecret);

        const result = await secretsService.updateSecret(1, updates);

        expect(CryptoJS.AES.encrypt).not.toHaveBeenCalled();
        expect(mockDb.sessionSecret.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: updates
        });
        expect(result).toEqual(mockUpdatedSecret);
      });
    });

    describe('deleteSecret', () => {
      it('should delete secret successfully', async () => {
        const mockDeletedSecret = { id: 1 };
        mockDb.sessionSecret.delete.mockResolvedValue(mockDeletedSecret);

        const result = await secretsService.deleteSecret(1);

        expect(mockDb.sessionSecret.delete).toHaveBeenCalledWith({
          where: { id: 1 }
        });
        expect(result).toEqual(mockDeletedSecret);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDb.sessionSecret.findMany.mockRejectedValue(new Error('Database connection failed'));

      const result = await secretsService.getAllActiveSecrets();
      
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Error getting all secrets:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });
});