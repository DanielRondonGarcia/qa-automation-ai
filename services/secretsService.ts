import CryptoJS from 'crypto-js';
import DatabaseService from './databaseService';
import { SessionSecret } from '@prisma/client';

export interface SecretData {
  id?: string;
  type: string;
  name: string;
  value: string;
  expiresAt?: Date;
}

export interface StoredSecret {
  id: string;
  type: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

class SecretsService {
  private db = DatabaseService.getInstance().getClient();
  private encryptionKey: string;

  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    if (this.encryptionKey === 'default-key-change-in-production') {
      console.warn('⚠️ Using default encryption key. Please set ENCRYPTION_KEY in production!');
    }
  }

  private encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, this.encryptionKey).toString();
  }

  private decrypt(encryptedText: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedText, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  async storeSecret(secretData: SecretData): Promise<StoredSecret> {
    try {
      const encryptedValue = this.encrypt(secretData.value);
      
      const secret = await this.db.sessionSecret.create({
        data: {
          type: secretData.type,
          name: secretData.name,
          value: encryptedValue,
          expiresAt: secretData.expiresAt,
        },
      });

      return {
        id: secret.id,
        type: secret.type,
        name: secret.name,
        createdAt: secret.createdAt,
        updatedAt: secret.updatedAt,
        expiresAt: secret.expiresAt,
        isActive: secret.isActive,
      };
    } catch (error) {
      console.error('Error storing secret:', error);
      throw new Error('Failed to store secret');
    }
  }

  async getSecret(id: string): Promise<string | null> {
    try {
      const secret = await this.db.sessionSecret.findFirst({
        where: {
          id,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
      });

      if (!secret) {
        return null;
      }

      return this.decrypt(secret.value);
    } catch (error) {
      console.error('Error retrieving secret:', error);
      return null;
    }
  }

  async getSecretByType(type: string): Promise<string | null> {
    try {
      const secret = await this.db.sessionSecret.findFirst({
        where: {
          type,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (!secret) {
        return null;
      }

      return this.decrypt(secret.value);
    } catch (error) {
      console.error('Error retrieving secret by type:', error);
      return null;
    }
  }

  async listSecrets(): Promise<StoredSecret[]> {
    try {
      const secrets = await this.db.sessionSecret.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          type: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          expiresAt: true,
          isActive: true,
        },
      });

      return secrets;
    } catch (error) {
      console.error('Error listing secrets:', error);
      throw new Error('Failed to list secrets');
    }
  }

  async updateSecret(id: string, newValue: string): Promise<boolean> {
    try {
      const encryptedValue = this.encrypt(newValue);
      
      await this.db.sessionSecret.update({
        where: { id },
        data: {
          value: encryptedValue,
          updatedAt: new Date(),
        },
      });

      return true;
    } catch (error) {
      console.error('Error updating secret:', error);
      return false;
    }
  }

  async deleteSecret(id: string): Promise<boolean> {
    try {
      await this.db.sessionSecret.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      return true;
    } catch (error) {
      console.error('Error deleting secret:', error);
      return false;
    }
  }

  async cleanupExpiredSecrets(): Promise<number> {
    try {
      const result = await this.db.sessionSecret.updateMany({
        where: {
          expiresAt: {
            lt: new Date()
          },
          isActive: true,
        },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      return result.count;
    } catch (error) {
      console.error('Error cleaning up expired secrets:', error);
      return 0;
    }
  }
}

export default SecretsService;