import { LRUCache } from 'lru-cache';
import type { Logger } from 'pino';
import type { CacheManager as ICacheManager, CacheStats, HepeinBaileysConfig } from '../types';
import { proto } from '@whiskeysockets/baileys';

/**
 * Gestor de caché inteligente con soporte LRU y Redis
 */
export class CacheManager implements ICacheManager {
  private cache: LRUCache<string, any>;
  private logger: Logger;
  private config: NonNullable<HepeinBaileysConfig['cache']>;
  private stats: CacheStats;

  constructor(config: NonNullable<HepeinBaileysConfig['cache']>, logger: Logger) {
    this.config = config;
    this.logger = logger;

    // Inicializar estadísticas
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      maxSize: config.maxSize || 1000,
      hitRate: 0,
    };

    // Crear caché LRU
    this.cache = new LRUCache<string, any>({
      max: config.maxSize || 1000,
      ttl: (config.ttl || 3600) * 1000, // Convertir a ms
      updateAgeOnGet: true,
      updateAgeOnHas: true,
      allowStale: false,
      dispose: (_value, key) => {
        this.logger.trace({ key }, 'Elemento eliminado del caché');
      },
    });

    this.logger.info({ config }, 'CacheManager inicializado');
  }

  /**
   * Inicializar caché
   */
  async initialize(): Promise<void> {
    if (this.config.type === 'redis') {
      // TODO: Implementar Redis
      this.logger.warn('Redis cache no implementado aún, usando memoria');
    }

    this.logger.info('Caché inicializado');
  }

  /**
   * Obtener valor del caché
   */
  async get<T = any>(key: string): Promise<T | undefined> {
    const value = this.cache.get(key);

    if (value !== undefined) {
      this.stats.hits++;
      this.updateHitRate();
      this.logger.trace({ key }, 'Cache HIT');
      return value as T;
    }

    this.stats.misses++;
    this.updateHitRate();
    this.logger.trace({ key }, 'Cache MISS');
    return undefined;
  }

  /**
   * Establecer valor en caché
   */
  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    const options = ttl ? { ttl: ttl * 1000 } : {};
    this.cache.set(key, value, options);
    this.stats.size = this.cache.size;
    this.logger.trace({ key, ttl }, 'Valor guardado en caché');
  }

  /**
   * Eliminar del caché
   */
  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    this.stats.size = this.cache.size;
    this.logger.trace({ key, deleted }, 'Eliminando del caché');
    return deleted;
  }

  /**
   * Limpiar todo el caché
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.stats.size = 0;
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.hitRate = 0;
    this.logger.info('Caché limpiado completamente');
  }

  /**
   * Verificar si existe una clave
   */
  async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  /**
   * Obtener estadísticas del caché
   */
  async getStats(): Promise<CacheStats> {
    return { ...this.stats };
  }

  /**
   * Actualizar hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Obtener caché de reintentos de mensajes
   */
  async getMessageRetryCache() {
    return {
      get: async (id: string) => {
        return await this.get(`retry:${id}`);
      },
      set: async (id: string, value: number) => {
        await this.set(`retry:${id}`, value, 3600);
      },
    };
  }

  /**
   * Obtener mensaje del caché
   */
  async getMessage(key: proto.IMessageKey) {
    const messageId = `${key.remoteJid}:${key.id}`;
    return await this.get<proto.IMessage>(messageId);
  }

  /**
   * Guardar mensaje en caché
   */
  async saveMessage(key: proto.IMessageKey, message: proto.IMessage): Promise<void> {
    const messageId = `${key.remoteJid}:${key.id}`;
    await this.set(messageId, message, 86400); // 24 horas
  }

  /**
   * Guardar múltiples mensajes
   */
  async saveMessages(messages: proto.IWebMessageInfo[]): Promise<void> {
    const operations = messages.map((msg) => {
      if (msg.key && msg.message) {
        return this.saveMessage(msg.key, msg.message);
      }
    });

    await Promise.all(operations.filter(Boolean));
  }

  /**
   * Obtener info de contacto cacheada
   */
  async getContactInfo(jid: string) {
    return await this.get(`contact:${jid}`);
  }

  /**
   * Guardar info de contacto
   */
  async saveContactInfo(jid: string, info: any): Promise<void> {
    await this.set(`contact:${jid}`, info, 7200); // 2 horas
  }

  /**
   * Obtener info de grupo cacheada
   */
  async getGroupInfo(jid: string) {
    return await this.get(`group:${jid}`);
  }

  /**
   * Guardar info de grupo
   */
  async saveGroupInfo(jid: string, info: any): Promise<void> {
    await this.set(`group:${jid}`, info, 3600); // 1 hora
  }

  /**
   * Limpiar caché expirado
   */
  async purgeExpired(): Promise<number> {
    this.cache.purgeStale();
    const newSize = this.cache.size;
    const purged = this.stats.size - newSize;
    this.stats.size = newSize;

    if (purged > 0) {
      this.logger.info({ purged }, 'Entradas expiradas eliminadas');
    }

    return purged;
  }

  /**
   * Obtener tamaño del caché
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Obtener todas las claves
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    await this.clear();
    this.logger.info('CacheManager limpiado');
  }

  /**
   * Exportar estadísticas para monitoreo
   */
  getMetrics() {
    return {
      'cache.hits': this.stats.hits,
      'cache.misses': this.stats.misses,
      'cache.size': this.stats.size,
      'cache.hit_rate': this.stats.hitRate,
      'cache.max_size': this.stats.maxSize,
      'cache.utilization': (this.stats.size / this.stats.maxSize) * 100,
    };
  }

  /**
   * Precargar datos comunes
   */
  async warmup(data: Record<string, any>): Promise<void> {
    const operations = Object.entries(data).map(([key, value]) => this.set(key, value));
    await Promise.all(operations);
    this.logger.info({ count: operations.length }, 'Caché precargado');
  }

  /**
   * Invalidar patrón de claves
   */
  async invalidatePattern(pattern: RegExp): Promise<number> {
    const keys = this.getKeys().filter((key) => pattern.test(key));
    const deletions = await Promise.all(keys.map((key) => this.delete(key)));
    const deleted = deletions.filter(Boolean).length;

    this.logger.info({ pattern: pattern.source, deleted }, 'Patrón invalidado');
    return deleted;
  }

  /**
   * Obtener o establecer (cache aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Intentar obtener del caché
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Si no está en caché, obtener de la factory
    const value = await factory();

    // Guardar en caché
    await this.set(key, value, ttl);

    return value;
  }

  /**
   * Guardar con compresión para datos grandes
   */
  async setCompressed(key: string, value: any, ttl?: number): Promise<void> {
    // TODO: Implementar compresión con zlib
    await this.set(key, value, ttl);
  }

  /**
   * Obtener con descompresión
   */
  async getCompressed<T = any>(key: string): Promise<T | undefined> {
    // TODO: Implementar descompresión
    return await this.get<T>(key);
  }
}

export default CacheManager;
