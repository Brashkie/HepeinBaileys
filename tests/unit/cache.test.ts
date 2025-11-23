import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheManager } from '../../src/cache/CacheManager';
import pino from 'pino';

describe('CacheManager', () => {
  let cacheManager: CacheManager;
  let logger: pino.Logger;

  beforeEach(() => {
    logger = pino({ level: 'silent' });
    cacheManager = new CacheManager(
      {
        enabled: true,
        maxSize: 100,
        ttl: 60,
        type: 'memory',
      },
      logger
    );
  });

  describe('Basic Operations', () => {
    it('should set and get a value', async () => {
      await cacheManager.set('key1', 'value1');
      const value = await cacheManager.get('key1');
      expect(value).toBe('value1');
    });

    it('should return undefined for non-existent key', async () => {
      const value = await cacheManager.get('nonexistent');
      expect(value).toBeUndefined();
    });

    it('should delete a value', async () => {
      await cacheManager.set('key1', 'value1');
      const deleted = await cacheManager.delete('key1');
      expect(deleted).toBe(true);

      const value = await cacheManager.get('key1');
      expect(value).toBeUndefined();
    });

    it('should check if key exists', async () => {
      await cacheManager.set('key1', 'value1');
      const exists = await cacheManager.has('key1');
      expect(exists).toBe(true);

      const notExists = await cacheManager.has('key2');
      expect(notExists).toBe(false);
    });

    it('should clear all values', async () => {
      await cacheManager.set('key1', 'value1');
      await cacheManager.set('key2', 'value2');
      await cacheManager.clear();

      const value1 = await cacheManager.get('key1');
      const value2 = await cacheManager.get('key2');

      expect(value1).toBeUndefined();
      expect(value2).toBeUndefined();
    });
  });

  describe('Statistics', () => {
    it('should track hits and misses', async () => {
      await cacheManager.set('key1', 'value1');

      // Hit
      await cacheManager.get('key1');

      // Miss
      await cacheManager.get('key2');

      const stats = await cacheManager.getStats();

      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(50);
    });

    it('should track cache size', async () => {
      await cacheManager.set('key1', 'value1');
      await cacheManager.set('key2', 'value2');

      const stats = await cacheManager.getStats();
      expect(stats.size).toBe(2);
    });

    it('should calculate hit rate correctly', async () => {
      await cacheManager.set('key1', 'value1');

      // 3 hits
      await cacheManager.get('key1');
      await cacheManager.get('key1');
      await cacheManager.get('key1');

      // 1 miss
      await cacheManager.get('key2');

      const stats = await cacheManager.getStats();
      expect(stats.hitRate).toBe(75); // 3/(3+1) * 100
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire values after TTL', async () => {
      await cacheManager.set('key1', 'value1', 1); // 1 segundo

      // Inmediatamente debe existir
      let value = await cacheManager.get('key1');
      expect(value).toBe('value1');

      // Esperar 1.5 segundos
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Debe haber expirado
      value = await cacheManager.get('key1');
      expect(value).toBeUndefined();
    });

    it('should use default TTL if not specified', async () => {
      await cacheManager.set('key1', 'value1'); // Usa TTL default (60s)

      const value = await cacheManager.get('key1');
      expect(value).toBe('value1');
    });
  });

  describe('getOrSet Pattern', () => {
    it('should return cached value if exists', async () => {
      await cacheManager.set('key1', 'cached');

      const factory = vi.fn(async () => 'factory');
      const value = await cacheManager.getOrSet('key1', factory);

      expect(value).toBe('cached');
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory if value does not exist', async () => {
      const factory = vi.fn(async () => 'factory');
      const value = await cacheManager.getOrSet('key1', factory);

      expect(value).toBe('factory');
      expect(factory).toHaveBeenCalledTimes(1);

      // Verificar que se guardó en caché
      const cached = await cacheManager.get('key1');
      expect(cached).toBe('factory');
    });
  });

  describe('Max Size', () => {
    it('should respect max size limit', async () => {
      const smallCache = new CacheManager(
        {
          enabled: true,
          maxSize: 3,
          ttl: 60,
          type: 'memory',
        },
        logger
      );

      await smallCache.set('key1', 'value1');
      await smallCache.set('key2', 'value2');
      await smallCache.set('key3', 'value3');
      await smallCache.set('key4', 'value4'); // Debe expulsar el más antiguo

      const stats = await smallCache.getStats();
      expect(stats.size).toBeLessThanOrEqual(3);
    });
  });

  describe('Specialized Methods', () => {
    it('should save and get message', async () => {
      const messageKey = {
        remoteJid: '51987654321@s.whatsapp.net',
        id: 'msg123',
      };

      const message = {
        conversation: 'Hola',
      };

      await cacheManager.saveMessage(messageKey, message);
      const retrieved = await cacheManager.getMessage(messageKey);

      expect(retrieved).toEqual(message);
    });

    it('should save and get contact info', async () => {
      const jid = '51987654321@s.whatsapp.net';
      const info = { name: 'John Doe', number: '51987654321' };

      await cacheManager.saveContactInfo(jid, info);
      const retrieved = await cacheManager.getContactInfo(jid);

      expect(retrieved).toEqual(info);
    });

    it('should save and get group info', async () => {
      const jid = '123456@g.us';
      const info = { subject: 'Test Group', participants: [] };

      await cacheManager.saveGroupInfo(jid, info);
      const retrieved = await cacheManager.getGroupInfo(jid);

      expect(retrieved).toEqual(info);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup properly', async () => {
      await cacheManager.set('key1', 'value1');
      await cacheManager.cleanup();

      const value = await cacheManager.get('key1');
      expect(value).toBeUndefined();
    });
  });

  describe('Metrics', () => {
    it('should export metrics', async () => {
      await cacheManager.set('key1', 'value1');
      await cacheManager.get('key1');
      await cacheManager.get('key2');

      const metrics = cacheManager.getMetrics();

      expect(metrics).toHaveProperty('cache.hits');
      expect(metrics).toHaveProperty('cache.misses');
      expect(metrics).toHaveProperty('cache.size');
      expect(metrics).toHaveProperty('cache.hit_rate');
    });
  });
});
