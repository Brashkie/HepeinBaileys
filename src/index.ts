/**
 * HepeinBaileys - Fork mejorado de Baileys
 * 
 * @module hepeinbaileys
 * @author Brashkie
 * @license MIT
 */

// Core
export { HepeinBaileys, createHepeinSocket } from './core/HepeinBaileys';
export { default as createHepeinBaileys } from './core/HepeinBaileys';

// Managers
export { CacheManager } from './cache/CacheManager';
export { QueueManager } from './queue/QueueManager';
export { MetricsManager } from './services/MetricsManager';

// Services
export { AIService } from './services/AIService';

// Handlers
export { GroupHandler } from './handlers/GroupHandler';

// Plugins
export { PluginManager, BasePlugin, createCommand } from './plugins/PluginManager';

// Utils
export {
  Validator,
  Formatter,
  MessageValidator,
  TextUtils,
  ArrayUtils,
  DateUtils,
  WhatsAppValidator,
  WhatsAppFormatter,
} from './utils/validators';

// Middleware
export {
  MiddlewareStack,
  loggingMiddleware,
  filterSelfMessages,
  antiSpamMiddleware,
  commandParserMiddleware,
  errorHandlerMiddleware,
  rateLimitMiddleware,
  metricsMiddleware,
  responseCacheMiddleware,
  messageValidationMiddleware,
  contextEnrichmentMiddleware,
  languageDetectionMiddleware,
  conditionalMiddleware,
  groupOnlyMiddleware,
  privateOnlyMiddleware,
  autoReactMiddleware,
  timeoutMiddleware,
} from './middleware/MiddlewareStack';

// Types
export type {
  HepeinBaileysConfig,
  HepeinSocket,
  HepeinEvents,
  HepeinPlugin,
  PluginCommand,
  Middleware,
  MessageContext,
  MessageType,
  MessageMetadata,
  CacheManager as ICacheManager,
  CacheStats,
  QueueManager as IQueueManager,
  QueueJob,
  QueueJobHandler,
  QueueStats,
  MetricsManager as IMetricsManager,
  RetryOptions,
  BulkSendResult,
  BusinessCatalog,
  Product,
  ProductMessage,
  ExtendedConnectionState,
  ExportOptions,
  MessageAnalysis,
  AIProviderConfig,
  AIResponse,
} from './types';

// Re-export útiles de Baileys
export {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  makeInMemoryStore,
  proto,
  WASocket,
  ConnectionState,
  WAMessage,
} from '@whiskeysockets/baileys';

// Versión del paquete
export const VERSION = '1.0.0';

/**
 * Configuración por defecto exportada
 */
export const DEFAULT_CONFIG: Partial<HepeinBaileysConfig> = {
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
 * Helpers útiles
 */

/**
 * Validar número de WhatsApp
 */
export function isValidWhatsAppNumber(number: string): boolean {
  return /^\d{10,15}$/.test(number.replace(/\D/g, ''));
}

/**
 * Formatear número a JID
 */
export function formatToJID(number: string): string {
  const cleaned = number.replace(/\D/g, '');
  return `${cleaned}@s.whatsapp.net`;
}

/**
 * Formatear JID de grupo
 */
export function formatToGroupJID(id: string): string {
  return `${id}@g.us`;
}

/**
 * Extraer número de JID
 */
export function extractNumberFromJID(jid: string): string {
  return jid.split('@')[0] || '';
}

/**
 * Verificar si es JID de grupo
 */
export function isGroupJID(jid: string): boolean {
  return jid.endsWith('@g.us');
}

/**
 * Sleep helper
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry con backoff exponencial
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    factor = 2,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries - 1) {
        const delay = Math.min(initialDelay * Math.pow(factor, attempt), maxDelay);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Chunkar array en lotes
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();

    if (now - lastCall >= delay) {
      lastCall = now;
      fn.apply(this, args);
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        fn.apply(this, args);
      }, delay - (now - lastCall));
    }
  };
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * Sanitizar texto para WhatsApp
 */
export function sanitizeForWhatsApp(text: string): string {
  return text
    .replace(/[^\x00-\x7F]/g, '') // Remover caracteres no ASCII si es necesario
    .trim()
    .substring(0, 65536); // Límite de WhatsApp
}

/**
 * Generar ID único
 */
export { nanoid } from 'nanoid';

/**
 * Logger helper
 */
export { pino } from 'pino';

// Default export
export default createHepeinSocket;
