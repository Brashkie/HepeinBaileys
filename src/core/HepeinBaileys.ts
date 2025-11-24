import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  //makeInMemoryStore,
  proto,
  WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import type {
  HepeinBaileysConfig,
  HepeinSocket,
  BulkSendResult,
  RetryOptions,
  ProductMessage,
  BusinessCatalog,
  MessageContext,
  //Middleware,
  ExtendedConnectionState,
} from '../types';
import { CacheManager } from '../cache/CacheManager';
import { QueueManager } from '../queue/QueueManager';
import { MetricsManager } from '../services/MetricsManager';
import { MiddlewareStack } from '../middleware/MiddlewareStack';
import { EventEmitter } from 'events';
//import { nanoid } from 'nanoid';

/**
 * Configuración por defecto
 */
const DEFAULT_CONFIG: Partial<HepeinBaileysConfig> = {
  connection: {
    printQRInTerminal: true,
    timeout: 60000,
    autoReconnect: true,
    reconnectDelay: 3000,
    maxReconnectAttempts: 10,
  },
  cache: {
    enabled: true,
    maxSize: 1000,
    ttl: 3600,
    type: 'memory',
  },
  queue: {
    enabled: true,
    type: 'memory',
    processing: {
      concurrency: 10,
      rateLimit: 50,
      batchSize: 50,
      batchDelay: 5000,
    },
  },
  logger: {
    level: 'info',
    structured: true,
  },
  business: {
    enabled: false,
  },
  plugins: {
    enabled: false,
    directory: './plugins',
    load: [],
  },
  middleware: {
    stack: [],
  },
  ai: {
    enabled: false,
  },
  antiSpam: {
    enabled: false,
    maxMessagesPerMinute: 20,
    maxMessagesPerHour: 200,
    action: 'warn',
    whitelist: [],
  },
  metrics: {
    enabled: true,
    detailed: false,
  },
};

/**
 * Clase principal de HepeinBaileys
 */
export class HepeinBaileys extends EventEmitter {
  private socket!: WASocket;
  private config: HepeinBaileysConfig;
  private logger: pino.Logger;
  private reconnectAttempts = 0;
  private isReconnecting = false;
  private middlewareStack: MiddlewareStack;

  public cache: CacheManager;
  public queue: QueueManager;
  public metrics: MetricsManager;

  constructor(config: HepeinBaileysConfig) {
    super();

    // Merge config con defaults
    this.config = this.mergeConfig(config);

    // Inicializar logger
    this.logger = this.initLogger();

    // Inicializar sistemas
    this.cache = new CacheManager(this.config.cache!, this.logger);
    this.queue = new QueueManager(this.config.queue!, this.logger);
    this.metrics = new MetricsManager(this.config.metrics!, this.logger);
    this.middlewareStack = new MiddlewareStack();

    // Registrar middlewares
    if (this.config.middleware?.stack) {
      this.config.middleware.stack.forEach((mw) => this.middlewareStack.use(mw));
    }

    this.logger.info('HepeinBaileys inicializado');
  }

  /**
   * Mezclar configuración con defaults
   */
  private mergeConfig(config: HepeinBaileysConfig): HepeinBaileysConfig {
    return {
      ...DEFAULT_CONFIG,
      ...config,
      connection: { ...DEFAULT_CONFIG.connection, ...config.connection },
      cache: { ...DEFAULT_CONFIG.cache, ...config.cache },
      queue: { ...DEFAULT_CONFIG.queue, ...config.queue },
      logger: { ...DEFAULT_CONFIG.logger, ...config.logger },
      business: { ...DEFAULT_CONFIG.business, ...config.business },
      plugins: { ...DEFAULT_CONFIG.plugins, ...config.plugins },
      middleware: { ...DEFAULT_CONFIG.middleware, ...config.middleware },
      ai: { ...DEFAULT_CONFIG.ai, ...config.ai },
      antiSpam: { ...DEFAULT_CONFIG.antiSpam, ...config.antiSpam },
      metrics: { ...DEFAULT_CONFIG.metrics, ...config.metrics },
    } as HepeinBaileysConfig;
  }

  /**
   * Inicializar logger
   */
  private initLogger(): pino.Logger {
    if (this.config.logger?.instance) {
      return this.config.logger.instance;
    }

    return pino({
      level: this.config.logger?.level || 'info',
      transport: this.config.logger?.structured
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          },
    });
  }

  /**
   * Conectar al WhatsApp
   */
  async connect(): Promise<HepeinSocket> {
    const { state, saveCreds } = this.config.auth;
    const { version } = await fetchLatestBaileysVersion();

    this.logger.info({ version }, 'Usando versión de Baileys');

    // Crear socket base
    this.socket = makeWASocket({
      version,
      logger: this.logger,
      printQRInTerminal: this.config.connection?.printQRInTerminal,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, this.logger),
      },
      msgRetryCounterCache: {
        get: async (id: string) => this.cache.get(`retry:${id}`),
        set: async (id: string, value: number) => this.cache.set(`retry:${id}`, value),
        del: async (id: string) => this.cache.delete(`retry:${id}`),
        flushAll: async () => {} // No-op for now
      }
      generateHighQualityLinkPreview: true,
      getMessage: async (key) => {
        return await this.cache.getMessage(key);
      },
    });

    // Extender socket con funcionalidades de HepeinBaileys
    const hepeinSocket = this.extendSocket(this.socket);

    // Registrar eventos
    this.registerEvents(saveCreds);

    // Inicializar servicios
    await this.initializeServices();

    this.logger.info('HepeinBaileys conectado exitosamente');
    this.emit('hepein.ready');

    return hepeinSocket;
  }

  /**
   * Extender socket con funcionalidades
   */
  private extendSocket(socket: WASocket): HepeinSocket {
    const extended = socket as unknown as HepeinSocket;

    extended.config = this.config;
    extended.cache = this.cache;
    extended.queue = this.queue;
    extended.metrics = this.metrics;

    // Envío masivo optimizado
    extended.sendBulk = this.sendBulk.bind(this);

    // Envío con reintentos
    extended.sendWithRetry = this.sendWithRetry.bind(this);

    // WhatsApp Business
    extended.isBusinessAccount = this.isBusinessAccount.bind(this);
    extended.getCatalog = this.getCatalog.bind(this);
    extended.sendProduct = this.sendProduct.bind(this);

    return extended;
  }

  /**
   * Registrar eventos de conexión
   */
  private registerEvents(saveCreds: () => Promise<void>): void {
    // Actualizar credenciales
    this.socket.ev.on('creds.update', saveCreds);

    // Manejar conexión
    this.socket.ev.on('connection.update', async (update) => {
      await this.handleConnectionUpdate(update as ExtendedConnectionState);
    });

    // Manejar mensajes
    this.socket.ev.on('messages.upsert', async ({ messages }) => {
      await this.handleMessages(messages);
    });

    // Manejar grupos
    this.socket.ev.on('groups.update', (updates) => {
      this.logger.debug({ updates }, 'Actualizaciones de grupos');
    });

    // Manejar presencia
    this.socket.ev.on('presence.update', (presence) => {
      this.logger.debug({ presence }, 'Actualización de presencia');
    });
  }

  /**
   * Manejar actualizaciones de conexión
   */
  private async handleConnectionUpdate(update: ExtendedConnectionState): Promise<void> {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      this.logger.info('Código QR generado');
    }

    if (connection === 'close') {
      const shouldReconnect = this.shouldReconnect(lastDisconnect);

      if (shouldReconnect && this.config.connection?.autoReconnect) {
        await this.handleReconnection();
      } else {
        this.logger.error('Conexión cerrada, no se puede reconectar');
        this.emit('hepein.error', new Error('Connection closed permanently'));
      }
    } else if (connection === 'open') {
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      this.logger.info('✅ Conexión establecida exitosamente');
      this.metrics.increment('connection.established');
    }
  }

  /**
   * Determinar si se debe reconectar
   */
  private shouldReconnect(lastDisconnect: any): boolean {
    const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;

    return (
      statusCode !== DisconnectReason.loggedOut &&
      this.reconnectAttempts < (this.config.connection?.maxReconnectAttempts || 10)
    );
  }

  /**
   * Manejar reconexión
   */
  private async handleReconnection(): Promise<void> {
    if (this.isReconnecting) return;

    this.isReconnecting = true;
    this.reconnectAttempts++;

    const delay = this.calculateReconnectDelay();

    this.logger.warn(
      { attempt: this.reconnectAttempts, delay },
      'Reconectando en ${delay}ms...'
    );

    this.emit('hepein.reconnecting', this.reconnectAttempts);
    this.metrics.increment('connection.reconnect_attempts');

    await this.sleep(delay);

    try {
      await this.connect();
    } catch (error) {
      this.logger.error({ error }, 'Error al reconectar');
      this.isReconnecting = false;
    }
  }

  /**
   * Calcular delay de reconexión (backoff exponencial)
   */
  private calculateReconnectDelay(): number {
    const baseDelay = this.config.connection?.reconnectDelay || 3000;
    return Math.min(baseDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
  }

  /**
   * Manejar mensajes entrantes
   */
  private async handleMessages(messages: proto.IWebMessageInfo[]): Promise<void> {
    for (const msg of messages) {
      if (!msg.message) continue;

      this.metrics.increment('messages.received');

      try {
        // Crear contexto del mensaje
        const context = await this.createMessageContext(msg);

        // Ejecutar middleware stack
        await this.middlewareStack.execute(context);

        this.emit('hepein.message.processed', context);
        this.metrics.increment('messages.processed');
      } catch (error) {
        this.logger.error({ error, message: msg }, 'Error procesando mensaje');
        this.metrics.increment('messages.errors');
        this.emit('hepein.error', error as Error);
      }
    }
  }

  /**
   * Crear contexto de mensaje
   */
  private async createMessageContext(msg: proto.IWebMessageInfo): Promise<MessageContext> {
    const from = msg.key.remoteJid!;
    const text = this.extractMessageText(msg);
    const type = this.getMessageType(msg);

    return {
      socket: this.socket as unknown as HepeinSocket,
      message: msg,
      from,
      text,
      type,
      metadata: {
        timestamp: Number(msg.messageTimestamp),
        isGroup: from.endsWith('@g.us'),
        isBusiness: await this.isBusinessAccount(from),
        fromMe: msg.key.fromMe || false,
        participant: msg.participant ?? undefined,
      },
      state: {},
      reply: async (message: string | proto.IMessage) => {
        const content = typeof message === 'string' ? { text: message } : message;
        return await this.socket.sendMessage(from, content, { quoted: msg });
      },
      react: async (emoji: string) => {
        await this.socket.sendMessage(from, {
          react: { text: emoji, key: msg.key },
        });
      },
    };
  }

  /**
   * Extraer texto del mensaje
   */
  private extractMessageText(msg: proto.IWebMessageInfo): string | undefined {
    return (
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption
    );
  }

  /**
   * Obtener tipo de mensaje
   */
  private getMessageType(msg: proto.IWebMessageInfo): any {
    const message = msg.message;
    if (!message) return 'text';

    if (message.conversation || message.extendedTextMessage) return 'text';
    if (message.imageMessage) return 'image';
    if (message.videoMessage) return 'video';
    if (message.audioMessage) return 'audio';
    if (message.documentMessage) return 'document';
    if (message.stickerMessage) return 'sticker';
    if (message.contactMessage) return 'contact';
    if (message.locationMessage) return 'location';
    if (message.buttonsMessage) return 'button';
    if (message.listMessage) return 'list';
    if (message.templateMessage) return 'template';

    return 'text';
  }

  /**
   * Envío masivo optimizado
   */
  private async sendBulk(
    recipients: string[],
    message: proto.IMessage
  ): Promise<BulkSendResult> {
    const startTime = Date.now();
    const batchSize = this.config.queue?.processing?.batchSize || 50;
    const batchDelay = this.config.queue?.processing?.batchDelay || 5000;

    const results: BulkSendResult['results'] = [];
    let successful = 0;
    let failed = 0;

    this.logger.info({ total: recipients.length }, 'Iniciando envío masivo');

    // Procesar en lotes
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      this.logger.debug(
        { batch: Math.floor(i / batchSize) + 1, size: batch.length },
        'Procesando lote'
      );

      // Enviar lote en paralelo
      const batchResults = await Promise.allSettled(
        batch.map(async (jid) => {
          try {
            const messageInfo = await this.sendWithRetry(jid, message);
            return { jid, success: true, messageInfo };
          } catch (error) {
            return { jid, success: false, error: error as Error };
          }
        })
      );

      // Procesar resultados del lote
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const data = result.value;
          results.push(data);
          if (data.success) successful++;
          else failed++;
        } else {
          failed++;
        }
      });

      // Delay entre lotes (excepto en el último)
      if (i + batchSize < recipients.length) {
        await this.sleep(batchDelay);
      }
    }

    const executionTime = Date.now() - startTime;

    this.logger.info(
      { successful, failed, executionTime },
      'Envío masivo completado'
    );

    this.metrics.increment('bulk.send.completed');
    this.metrics.gauge('bulk.send.success_rate', (successful / recipients.length) * 100);

    return {
      total: recipients.length,
      successful,
      failed,
      results,
      executionTime,
    };
  }

  /**
   * Envío con reintentos
   */
  private async sendWithRetry(
    jid: string,
    message: proto.IMessage,
    options?: RetryOptions
  ): Promise<proto.WebMessageInfo> {
    const maxRetries = options?.maxRetries || 3;
    const retryDelay = options?.retryDelay || 1000;
    const backoffFactor = options?.backoffFactor || 2;

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const messageInfo = await this.socket.sendMessage(jid, message);
        this.metrics.increment('messages.sent');
        return messageInfo!;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn({ attempt, jid, error }, 'Error enviando mensaje, reintentando');

        if (options?.onRetry) {
          options.onRetry(attempt, lastError);
        }

        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(backoffFactor, attempt - 1);
          await this.sleep(delay);
        }
      }
    }

    this.metrics.increment('messages.send_failed');
    throw lastError || new Error('Failed to send message after retries');
  }

  /**
   * Verificar si es cuenta Business
   */
  private async isBusinessAccount(jid: string): Promise<boolean> {
    try {
      const info = await this.socket.onWhatsApp(jid);
      return info[0]?.isBusiness || false;
    } catch {
      return false;
    }
  }

  /**
   * Obtener catálogo de negocio
   */
  private async getCatalog(jid: string): Promise<BusinessCatalog> {
    // Implementación pendiente - requiere API de Business
    throw new Error('Not implemented yet');
  }

  /**
   * Enviar producto del catálogo
   */
  private async sendProduct(
    jid: string,
    product: ProductMessage
  ): Promise<proto.WebMessageInfo> {
    const message: proto.IMessage = {
      productMessage: {
        product: {
          productImage: product.product.imageUrl
            ? { url: product.product.imageUrl }
            : undefined,
          title: product.product.name,
          description: product.product.description,
          currencyCode: product.product.price?.currency,
          priceAmount1000:
            product.product.price ? product.product.price.amount * 1000 : 0,
          url: product.product.url,
          productImageCount: 1,
          businessOwnerJid: product.businessOwnerJid,
        },
        businessOwnerJid: product.businessOwnerJid,
        caption: product.caption,
      },
    };

    return await this.sendWithRetry(jid, message);
  }

  /**
   * Inicializar servicios
   */
  private async initializeServices(): Promise<void> {
    // Inicializar caché
    await this.cache.initialize();

    // Inicializar cola
    await this.queue.initialize();

    // Inicializar métricas
    this.metrics.initialize();

    this.logger.info('Servicios inicializados');
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Desconectar y limpiar
   */
  async disconnect(): Promise<void> {
    this.logger.info('Desconectando HepeinBaileys');

    try {
      await this.socket?.end();
      await this.cache.cleanup();
      await this.queue.cleanup();
      this.metrics.cleanup();

      this.logger.info('HepeinBaileys desconectado exitosamente');
    } catch (error) {
      this.logger.error({ error }, 'Error al desconectar');
    }
  }

  /**
   * Obtener estadísticas
   */
  async getStats() {
    return {
      connection: {
        reconnectAttempts: this.reconnectAttempts,
        isReconnecting: this.isReconnecting,
      },
      cache: await this.cache.getStats(),
      queue: await this.queue.getStats(),
      metrics: await this.metrics.getMetrics(),
    };
  }
}

/**
 * Factory function para crear instancia de HepeinBaileys
 */
export async function createHepeinSocket(
  config: HepeinBaileysConfig
): Promise<HepeinSocket> {
  const hepein = new HepeinBaileys(config);
  return await hepein.connect();
}

export default createHepeinSocket;
