import type { WASocket, ConnectionState, proto, WAMessage } from '@whiskeysockets/baileys';
// import type { Boom } from '@hapi/boom';
import type { Logger } from 'pino';

/**
 * Configuración extendida para HepeinBaileys
 */
export interface HepeinBaileysConfig {
  /** Configuración de autenticación */
  auth: {
    /** Estado de autenticación */
    state: any;
    /** Función para guardar credenciales */
    saveCreds: () => Promise<void>;
  };

  /** Configuración de conexión */
  connection?: {
    /** Imprimir QR en terminal */
    printQRInTerminal?: boolean;
    /** Timeout de conexión en ms */
    timeout?: number;
    /** Reintentos automáticos */
    autoReconnect?: boolean;
    /** Delay entre reintentos en ms */
    reconnectDelay?: number;
    /** Máximo de reintentos */
    maxReconnectAttempts?: number;
  };

  /** Configuración de caché */
  cache?: {
    /** Habilitar caché */
    enabled?: boolean;
    /** Tamaño máximo del caché */
    maxSize?: number;
    /** TTL en segundos */
    ttl?: number;
    /** Tipo de caché */
    type?: 'memory' | 'redis';
    /** Configuración de Redis */
    redis?: {
      host?: string;
      port?: number;
      password?: string;
      db?: number;
    };
  };

  /** Configuración de cola de mensajes */
  queue?: {
    /** Habilitar cola */
    enabled?: boolean;
    /** Tipo de cola */
    type?: 'memory' | 'redis';
    /** Configuración de Redis */
    redis?: {
      host?: string;
      port?: number;
      password?: string;
    };
    /** Configuración de procesamiento */
    processing?: {
      /** Concurrencia máxima */
      concurrency?: number;
      /** Tasa límite (mensajes por segundo) */
      rateLimit?: number;
      /** Batch size para envío masivo */
      batchSize?: number;
      /** Delay entre batches en ms */
      batchDelay?: number;
    };
  };

  /** Configuración de logging */
  logger?: {
    /** Nivel de log */
    level?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
    /** Logger personalizado */
    instance?: Logger;
    /** Habilitar logs estructurados */
    structured?: boolean;
  };

  /** Configuración de WhatsApp Business */
  business?: {
    /** Habilitar funciones de Business */
    enabled?: boolean;
    /** ID del catálogo */
    catalogId?: string;
    /** Información del negocio */
    businessProfile?: {
      description?: string;
      email?: string;
      website?: string;
      address?: string;
      category?: string;
    };
  };

  /** Configuración de plugins */
  plugins?: {
    /** Habilitar sistema de plugins */
    enabled?: boolean;
    /** Directorio de plugins */
    directory?: string;
    /** Plugins a cargar */
    load?: string[];
  };

  /** Configuración de middleware */
  middleware?: {
    /** Middlewares a aplicar */
    stack?: Middleware[];
  };

  /** Configuración de IA */
  ai?: {
    /** Habilitar IA */
    enabled?: boolean;
    /** Proveedor de IA */
    provider?: 'openai' | 'anthropic' | 'google' | 'custom';
    /** API Key */
    apiKey?: string;
    /** Modelo a usar */
    model?: string;
    /** Configuración de auto-respuestas */
    autoReply?: {
      enabled?: boolean;
      /** Patrones que activan auto-respuesta */
      patterns?: RegExp[];
      /** Contexto del bot */
      context?: string;
    };
    /** Configuración de NLP */
    nlp?: {
      enabled?: boolean;
      /** Idiomas soportados */
      languages?: string[];
    };
  };

  /** Configuración anti-spam */
  antiSpam?: {
    /** Habilitar anti-spam */
    enabled?: boolean;
    /** Máximo de mensajes por minuto por usuario */
    maxMessagesPerMinute?: number;
    /** Máximo de mensajes por hora por usuario */
    maxMessagesPerHour?: number;
    /** Acción a tomar */
    action?: 'warn' | 'block' | 'ignore';
    /** Lista blanca de números */
    whitelist?: string[];
  };

  /** Configuración de métricas */
  metrics?: {
    /** Habilitar métricas */
    enabled?: boolean;
    /** Puerto para endpoint de métricas */
    port?: number;
    /** Incluir métricas detalladas */
    detailed?: boolean;
  };
}

/**
 * Cliente extendido de HepeinBaileys
 */
export interface HepeinSocket extends WASocket {
  /** Configuración del socket */
  config: HepeinBaileysConfig;
  
  /** Sistema de caché */
  cache: CacheManager;
  
  /** Sistema de cola */
  queue: QueueManager;
  
  /** Sistema de métricas */
  metrics: MetricsManager;
  
  /** Envío masivo optimizado */
  sendBulk: (recipients: string[], message: proto.IMessage) => Promise<BulkSendResult>;
  
  /** Envío con reintentos */
  sendWithRetry: (jid: string, message: proto.IMessage, options?: RetryOptions) => Promise<proto.WebMessageInfo>;
  
  /** Verificar si es WhatsApp Business */
  isBusinessAccount: (jid: string) => Promise<boolean>;
  
  /** Obtener info del catálogo */
  getCatalog?: (options: any) => Promise<any>;
  
  /** Enviar producto del catálogo */
  sendProduct: (jid: string, product: ProductMessage) => Promise<proto.WebMessageInfo>;
}

/**
 * Middleware para procesamiento de mensajes
 */
export type Middleware = (
  context: MessageContext,
  next: () => Promise<void>
) => Promise<void>;

/**
 * Contexto de mensaje para middleware
 */
export interface MessageContext {
  /** Socket de conexión */
  socket: HepeinSocket;
  
  /** Mensaje recibido */
  message: WAMessage;
  
  /** JID del remitente */
  from: string;
  
  /** Texto del mensaje */
  text?: string;
  
  /** Tipo de mensaje */
  type: MessageType;
  
  /** Metadata del mensaje */
  metadata: MessageMetadata;
  
  /** Estado compartido entre middlewares */
  state: Record<string, any>;
  
  /** Responder al mensaje */
  reply: (message: string | proto.IMessage) => Promise<proto.WebMessageInfo>;
  
  /** Reaccionar al mensaje */
  react: (emoji: string) => Promise<void>;
}

/**
 * Tipos de mensaje soportados
 */
export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'sticker'
  | 'contact'
  | 'location'
  | 'button'
  | 'list'
  | 'template'
  | 'product';

/**
 * Metadata del mensaje
 */
export interface MessageMetadata {
  /** Timestamp del mensaje */
  timestamp: number;
  
  /** Es un mensaje de grupo */
  isGroup: boolean;
  
  /** Es de WhatsApp Business */
  isBusiness: boolean;
  
  /** Es del propio bot */
  fromMe: boolean;
  
  /** Participante (en grupos) */
  participant?: string;
  
  /** Mensaje citado */
  quoted?: WAMessage;
}

/**
 * Gestor de caché
 */
export interface CacheManager {
  /** Obtener valor del caché */
  get<T = any>(key: string): Promise<T | undefined>;
  
  /** Establecer valor en caché */
  set<T = any>(key: string, value: T, ttl?: number): Promise<void>;
  
  /** Eliminar del caché */
  delete(key: string): Promise<boolean>;
  
  /** Limpiar todo el caché */
  clear(): Promise<void>;
  
  /** Verificar si existe */
  has(key: string): Promise<boolean>;
  
  /** Obtener estadísticas del caché */
  getStats(): Promise<CacheStats>;
}

/**
 * Estadísticas del caché
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
}

/**
 * Gestor de cola de mensajes
 */
export interface QueueManager {
  /** Agregar mensaje a la cola */
  add(job: QueueJob): Promise<void>;
  
  /** Procesar trabajos de la cola */
  process(handler: QueueJobHandler): void;
  
  /** Pausar procesamiento */
  pause(): Promise<void>;
  
  /** Reanudar procesamiento */
  resume(): Promise<void>;
  
  /** Obtener estadísticas de la cola */
  getStats(): Promise<QueueStats>;
  
  /** Limpiar trabajos completados */
  clean(): Promise<void>;
}

/**
 * Trabajo de cola
 */
export interface QueueJob {
  /** ID único del trabajo */
  id?: string;
  
  /** Tipo de trabajo */
  type: 'send' | 'bulk' | 'process';
  
  /** Datos del trabajo */
  data: any;
  
  /** Prioridad (mayor = más prioritario) */
  priority?: number;
  
  /** Reintentos permitidos */
  attempts?: number;
  
  /** Delay antes de procesar (ms) */
  delay?: number;
}

/**
 * Handler para trabajos de cola
 */
export type QueueJobHandler = (job: QueueJob) => Promise<any>;

/**
 * Estadísticas de cola
 */
export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

/**
 * Gestor de métricas
 */
export interface MetricsManager {
  /** Incrementar contador */
  increment(metric: string, value?: number): void;
  
  /** Establecer gauge */
  gauge(metric: string, value: number): void;
  
  /** Registrar histograma */
  histogram(metric: string, value: number): void;
  
  /** Registrar timing */
  timing(metric: string, value: number): void;
  
  /** Obtener todas las métricas */
  getMetrics(): Promise<Record<string, any>>;
  
  /** Resetear métricas */
  reset(): void;
}

/**
 * Opciones de reintento
 */
export interface RetryOptions {
  /** Número máximo de reintentos */
  maxRetries?: number;
  
  /** Delay entre reintentos (ms) */
  retryDelay?: number;
  
  /** Factor de backoff exponencial */
  backoffFactor?: number;
  
  /** Callback en caso de fallo */
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Resultado de envío masivo
 */
export interface BulkSendResult {
  /** Total de mensajes */
  total: number;
  
  /** Mensajes exitosos */
  successful: number;
  
  /** Mensajes fallidos */
  failed: number;
  
  /** Resultados individuales */
  results: Array<{
    jid: string;
    success: boolean;
    messageInfo?: proto.WebMessageInfo;
    error?: Error;
  }>;
  
  /** Tiempo de ejecución (ms) */
  executionTime: number;
}

/**
 * Catálogo de negocio
 */
export interface BusinessCatalog {
  /** ID del catálogo */
  id: string;
  
  /** Productos */
  products: Product[];
  
  /** Total de productos */
  totalProducts: number;
}

/**
 * Producto del catálogo
 */
export interface Product {
  /** ID del producto */
  id: string;
  
  /** Nombre */
  name: string;
  
  /** Descripción */
  description?: string;
  
  /** Precio */
  price?: {
    amount: number;
    currency: string;
  };
  
  /** URL de imagen */
  imageUrl?: string;
  
  /** URL del producto */
  url?: string;
  
  /** Disponibilidad */
  availability?: 'in_stock' | 'out_of_stock';
}

/**
 * Mensaje de producto
 */
export interface ProductMessage {
  /** Producto a enviar */
  product: Product;
  
  /** JID del negocio */
  businessOwnerJid: string;
  
  /** Mensaje adicional */
  caption?: string;
}

/**
 * Plugin de HepeinBaileys
 */
export interface HepeinPlugin {
  /** Nombre del plugin */
  name: string;
  
  /** Versión del plugin */
  version: string;
  
  /** Descripción */
  description?: string;
  
  /** Autor */
  author?: string;
  
  /** Inicializar plugin */
  initialize: (socket: HepeinSocket) => Promise<void>;
  
  /** Limpiar plugin */
  cleanup?: () => Promise<void>;
  
  /** Middlewares del plugin */
  middlewares?: Middleware[];
  
  /** Comandos del plugin */
  commands?: PluginCommand[];
}

/**
 * Comando de plugin
 */
export interface PluginCommand {
  /** Nombre del comando */
  name: string;
  
  /** Alias del comando */
  aliases?: string[];
  
  /** Descripción */
  description?: string;
  
  /** Patrón de activación */
  pattern: RegExp;
  
  /** Handler del comando */
  handler: (context: MessageContext) => Promise<void>;
  
  /** Permisos requeridos */
  permissions?: string[];
}

/**
 * Eventos personalizados de HepeinBaileys
 */
export interface HepeinEvents {
  'hepein.ready': () => void;
  'hepein.reconnecting': (attempt: number) => void;
  'hepein.error': (error: Error) => void;
  'hepein.message.processed': (context: MessageContext) => void;
  'hepein.spam.detected': (jid: string, count: number) => void;
  'hepein.cache.hit': (key: string) => void;
  'hepein.cache.miss': (key: string) => void;
  'hepein.queue.job.completed': (job: QueueJob) => void;
  'hepein.queue.job.failed': (job: QueueJob, error: Error) => void;
}

/**
 * Estado de conexión extendido
 */
export interface ExtendedConnectionState extends ConnectionState {
  /** Número de reintentos */
  reconnectAttempts?: number;
  
  /** Última vez que se reconectó */
  lastReconnectTime?: number;
  
  /** Estado del caché */
  cacheStatus?: 'active' | 'inactive' | 'error';
  
  /** Estado de la cola */
  queueStatus?: 'active' | 'paused' | 'error';
}

/**
 * Opciones de exportación para análisis
 */
export interface ExportOptions {
  /** Formato de exportación */
  format: 'json' | 'csv' | 'parquet';
  
  /** Rango de fechas */
  dateRange?: {
    from: Date;
    to: Date;
  };
  
  /** Filtros */
  filters?: {
    type?: MessageType[];
    from?: string[];
    isGroup?: boolean;
  };
  
  /** Incluir metadata */
  includeMetadata?: boolean;
  
  /** Comprimir */
  compress?: boolean;
}

/**
 * Resultado de análisis de mensajes
 */
export interface MessageAnalysis {
  /** Total de mensajes */
  totalMessages: number;
  
  /** Mensajes por tipo */
  messagesByType: Record<MessageType, number>;
  
  /** Mensajes por hora */
  messagesByHour: Record<number, number>;
  
  /** Usuarios más activos */
  topUsers: Array<{
    jid: string;
    count: number;
  }>;
  
  /** Palabras más comunes */
  topWords?: Array<{
    word: string;
    count: number;
  }>;
  
  /** Sentimiento promedio */
  averageSentiment?: number;
  
  /** Tiempo de respuesta promedio (ms) */
  averageResponseTime?: number;
}

/**
 * Configuración de AI Provider
 */
export interface AIProviderConfig {
  /** Tipo de proveedor */
  type: 'openai' | 'anthropic' | 'google' | 'custom';
  
  /** API Key */
  apiKey: string;
  
  /** Modelo */
  model: string;
  
  /** Endpoint personalizado */
  endpoint?: string;
  
  /** Parámetros adicionales */
  params?: Record<string, any>;
}

/**
 * Respuesta de IA
 */
export interface AIResponse {
  /** Texto generado */
  text: string;
  
  /** Confianza (0-1) */
  confidence?: number;
  
  /** Intención detectada */
  intent?: string;
  
  /** Entidades extraídas */
  entities?: Record<string, any>;
  
  /** Tokens usados */
  tokensUsed?: number;
  
  /** Metadata adicional */
  metadata?: Record<string, any>;
}
