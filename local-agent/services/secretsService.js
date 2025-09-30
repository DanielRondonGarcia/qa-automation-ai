const CryptoJS = require('crypto-js');
const DatabaseService = require('./databaseService');

class SecretsService {
  constructor() {
    this.db = DatabaseService.getInstance().getClient();
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    
    if (this.encryptionKey === 'default-key-change-in-production') {
      console.warn('⚠️ Using default encryption key. Please set ENCRYPTION_KEY in production!');
    }
  }

  // Métodos de encriptación
  encrypt(text) {
    try {
      return CryptoJS.AES.encrypt(text, this.encryptionKey).toString();
    } catch (error) {
      console.error('Error encrypting data:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  decrypt(encryptedText) {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedText, this.encryptionKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Error decrypting data:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // Métodos de base de datos
  async storeSecret(secretData) {
    try {
      const encryptedValue = this.encrypt(secretData.value);
      
      return await this.db.sessionSecret.create({
        data: {
          type: secretData.type,
          name: secretData.name,
          value: encryptedValue,
          expiresAt: secretData.expiresAt,
        },
      });
    } catch (error) {
      console.error('Error storing secret:', error);
      throw new Error('Failed to store secret');
    }
  }

  async getSecret(id) {
    try {
      const secret = await this.db.sessionSecret.findUnique({
        where: { id, isActive: true },
      });

      if (!secret) {
        return null;
      }

      // Check if secret has expired
      if (secret.expiresAt && secret.expiresAt < new Date()) {
        await this.deactivateSecret(id);
        return null;
      }

      return {
        id: secret.id,
        type: secret.type,
        name: secret.name,
        value: this.decrypt(secret.value),
        createdAt: secret.createdAt,
        updatedAt: secret.updatedAt,
        expiresAt: secret.expiresAt,
        isActive: secret.isActive,
      };
    } catch (error) {
      console.error('Error getting secret:', error);
      return null;
    }
  }

  async getSecretsByType(type) {
    try {
      const secrets = await this.db.sessionSecret.findMany({
        where: { 
          type, 
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        orderBy: { createdAt: 'desc' },
      });

      return secrets.map(secret => ({
        id: secret.id,
        type: secret.type,
        name: secret.name,
        value: this.decrypt(secret.value),
        createdAt: secret.createdAt,
        updatedAt: secret.updatedAt,
        expiresAt: secret.expiresAt,
        isActive: secret.isActive,
      }));
    } catch (error) {
      console.error('Error getting secrets by type:', error);
      return [];
    }
  }

  async getAllActiveSecrets() {
    try {
      const secrets = await this.db.sessionSecret.findMany({
        where: { 
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        orderBy: { createdAt: 'desc' },
      });

      return secrets.map(secret => ({
        id: secret.id,
        type: secret.type,
        name: secret.name,
        createdAt: secret.createdAt,
        updatedAt: secret.updatedAt,
        expiresAt: secret.expiresAt,
        isActive: secret.isActive,
        // Don't return the actual value for security
      }));
    } catch (error) {
      console.error('Error getting all secrets:', error);
      return [];
    }
  }

  async updateSecret(id, updates) {
    try {
      const updateData = { ...updates };
      
      if (updates.value) {
        updateData.value = this.encrypt(updates.value);
      }

      return await this.db.sessionSecret.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      console.error('Error updating secret:', error);
      throw new Error('Failed to update secret');
    }
  }

  async deactivateSecret(id) {
    try {
      return await this.db.sessionSecret.update({
        where: { id },
        data: { isActive: false },
      });
    } catch (error) {
      console.error('Error deactivating secret:', error);
      throw new Error('Failed to deactivate secret');
    }
  }

  async deleteSecret(id) {
    try {
      return await this.db.sessionSecret.delete({
        where: { id },
      });
    } catch (error) {
      console.error('Error deleting secret:', error);
      throw new Error('Failed to delete secret');
    }
  }

  async cleanupExpiredSecrets() {
    try {
      const result = await this.db.sessionSecret.updateMany({
        where: {
          expiresAt: { lt: new Date() },
          isActive: true,
        },
        data: { isActive: false },
      });

      console.log(`Deactivated ${result.count} expired secrets`);
      return result.count;
    } catch (error) {
      console.error('Error cleaning up expired secrets:', error);
      return 0;
    }
  }

  // Método para convertir secretos del formato anterior al nuevo formato de base de datos
  async migrateSecretsFromMemory(secrets) {
    try {
      const migratedSecrets = [];
      
      for (const secret of secrets) {
        const stored = await this.storeSecret({
          type: secret.type || 'UNKNOWN',
          name: secret.name,
          value: secret.value,
        });
        migratedSecrets.push(stored);
      }

      return migratedSecrets;
    } catch (error) {
      console.error('Error migrating secrets:', error);
      throw new Error('Failed to migrate secrets');
    }
  }
}

module.exports = SecretsService;