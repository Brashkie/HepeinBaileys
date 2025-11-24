import type { Middleware, MessageContext } from '../types';

/**
 * Stack de middleware para procesamiento de mensajes
 */
export class MiddlewareStack {
  private middlewares: Middleware[];

  constructor() {
    this.middlewares = [];
  }

  /**
   * Agregar middleware al stack
   */
  use(middleware: Middleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Ejecutar todos los middlewares
   */
  async execute(context: MessageContext): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index >= this.middlewares.length) {
        return;
      }

      const middleware = this.middlewares[index++];
      await middleware?.(context, next);
    };

    await next();
  }

  /**
   * Obtener cantidad de middlewares
   */
  size(): number {
    return this.middlewares.length;
  }

  /**
   * Limpiar stack
   */
  clear(): void {
    this.middlewares = [];
  }

  /**
   * Remover middleware específico
   */
  remove(middleware: Middleware): boolean {
    const index = this.middlewares.indexOf(middleware);
    if (index !== -1) {
      this.middlewares.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Obtener todos los middlewares
   */
  getAll(): Middleware[] {
    return [...this.middlewares];
  }
}

/**
 * Middlewares predefinidos útiles
 */

/**
 * Middleware para logging de mensajes
 */
export function loggingMiddleware(logger: any): Middleware {
  return async (_context, next) => {
    logger.info(
      {
        from: context.from,
        type: context.type,
        text: context.text?.substring(0, 50),
      },
      'Mensaje recibido'
    );

    await next();
  };
}

/**
 * Middleware para filtrar mensajes del bot
 */
export function filterSelfMessages(): Middleware {
  return async (_context, next) => {
    if (context.metadata.fromMe) {
      return; // No procesar mensajes propios
    }

    await next();
  };
}

/**
 * Middleware para anti-spam
 */
export function antiSpamMiddleware(config: {
  maxMessagesPerMinute: number;
  action: 'warn' | 'block' | 'ignore';
}): Middleware {
  const userMessageCounts = new Map<string, number[]>();

  return async (_context, next) => {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Obtener o crear array de timestamps para el usuario
    const timestamps = userMessageCounts.get(context.from) || [];

    // Filtrar timestamps del último minuto
    const recentTimestamps = timestamps.filter((ts) => ts > oneMinuteAgo);

    // Verificar límite
    if (recentTimestamps.length >= config.maxMessagesPerMinute) {
      if (config.action === 'block') {
        await context.reply('⚠️ Demasiados mensajes. Por favor, espera un momento.');
        return;
      } else if (config.action === 'warn') {
        context.state.spamWarning = true;
      }
      // Si es 'ignore', solo continúa sin hacer nada
    }

    // Agregar timestamp actual
    recentTimestamps.push(now);
    userMessageCounts.set(context.from, recentTimestamps);

    await next();
  };
}

/**
 * Middleware para parsear comandos
 */
export function commandParserMiddleware(prefix: string = '!'): Middleware {
  return async (_context, next) => {
    if (!context.text) {
      await next();
      return;
    }

    if (context.text.startsWith(prefix)) {
      const parts = context.text.slice(prefix.length).trim().split(/\s+/);
      const command = parts[0]?.toLowerCase();
      const args = parts.slice(1);

      context.state.command = command;
      context.state.args = args;
      context.state.isCommand = true;
    }

    await next();
  };
}

/**
 * Middleware para manejo de errores
 */
export function errorHandlerMiddleware(logger: any): Middleware {
  return async (_context, next) => {
    try {
      await next();
    } catch (error) {
      logger.error(
        { error, context: { from: context.from, type: context.type } },
        'Error en middleware'
      );

      await context.reply('❌ Ocurrió un error procesando tu mensaje.');
    }
  };
}

/**
 * Middleware para rate limiting por usuario
 */
export function rateLimitMiddleware(requestsPerSecond: number): Middleware {
  const userLastRequest = new Map<string, number>();

  return async (_context, next) => {
    const now = Date.now();
    const lastRequest = userLastRequest.get(context.from) || 0;
    const minInterval = 1000 / requestsPerSecond;

    if (now - lastRequest < minInterval) {
      // Demasiado rápido, esperar
      const waitTime = minInterval - (now - lastRequest);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    userLastRequest.set(context.from, Date.now());
    await next();
  };
}

/**
 * Middleware para métricas
 */
export function metricsMiddleware(metrics: any): Middleware {
  return async (_context, next) => {
    const startTime = Date.now();

    try {
      await next();
      metrics.increment('middleware.success');
    } catch (error) {
      metrics.increment('middleware.error');
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      metrics.timing('middleware.duration', duration);
    }
  };
}

/**
 * Middleware para caché de respuestas
 */
export function responseCacheMiddleware(cache: any, ttl: number = 300): Middleware {
  return async (_context, next) => {
    if (!context.text) {
      await next();
      return;
    }

    // Generar clave de caché
    const cacheKey = `response:${context.from}:${context.text}`;

    // Intentar obtener respuesta cacheada
    const cached = await cache.get(cacheKey);

    if (cached) {
      await context.reply(cached);
      return;
    }

    // Interceptar reply original
    const originalReply = context.reply;
    context.reply = async (message: any) => {
      const result = await originalReply(message);

      // Cachear respuesta si es texto
      if (typeof message === 'string') {
        await cache.set(cacheKey, message, ttl);
      }

      return result;
    };

    await next();
  };
}

/**
 * Middleware para validación de mensajes
 */
export function messageValidationMiddleware(): Middleware {
  return async (_context, next) => {
    // Validar que el mensaje no esté vacío
    if (context.type === 'text' && !context.text?.trim()) {
      return; // Ignorar mensajes vacíos
    }

    // Validar longitud máxima
    if (context.text && context.text.length > 10000) {
      await context.reply('❌ El mensaje es demasiado largo.');
      return;
    }

    await next();
  };
}

/**
 * Middleware para enriquecimiento de contexto
 */
export function contextEnrichmentMiddleware(cache: any): Middleware {
  return async (_context, next) => {
    // Obtener info del usuario cacheada
    const userInfo = await cache.getContactInfo(context.from);
    if (userInfo) {
      context.state.userInfo = userInfo;
    }

    // Si es grupo, obtener info del grupo
    if (context.metadata.isGroup) {
      const groupInfo = await cache.getGroupInfo(context.from);
      if (groupInfo) {
        context.state.groupInfo = groupInfo;
      }
    }

    await next();
  };
}

/**
 * Middleware para detección de idioma
 */
export function languageDetectionMiddleware(): Middleware {
  return async (_context, next) => {
    if (context.text) {
      // Simple detección basada en caracteres comunes
      const hasSpanish = /[áéíóúñ¿¡]/i.test(context.text);
      const hasEnglish = /\b(the|is|are|was|were)\b/i.test(context.text);

      context.state.language = hasSpanish ? 'es' : hasEnglish ? 'en' : 'unknown';
    }

    await next();
  };
}

/**
 * Middleware condicional
 */
export function conditionalMiddleware(
  condition: (context: MessageContext) => boolean,
  middleware: Middleware
): Middleware {
  return async (_context, next) => {
    if (condition(context)) {
      await middleware(context, next);
    } else {
      await next();
    }
  };
}

/**
 * Middleware para grupos solamente
 */
export function groupOnlyMiddleware(): Middleware {
  return conditionalMiddleware(
    (context) => context.metadata.isGroup,
    async (_context, next) => {
      await next();
    }
  );
}

/**
 * Middleware para mensajes privados solamente
 */
export function privateOnlyMiddleware(): Middleware {
  return conditionalMiddleware(
    (context) => !context.metadata.isGroup,
    async (_context, next) => {
      await next();
    }
  );
}

/**
 * Middleware para auto-reaccionar
 */
export function autoReactMiddleware(reactions: { [key: string]: string }): Middleware {
  return async (_context, next) => {
    if (context.text) {
      const lowerText = context.text.toLowerCase();

      for (const [keyword, emoji] of Object.entries(reactions)) {
        if (lowerText.includes(keyword.toLowerCase())) {
          await context.react(emoji);
          break;
        }
      }
    }

    await next();
  };
}

/**
 * Middleware para timeout de procesamiento
 */
export function timeoutMiddleware(timeoutMs: number): Middleware {
  return async (_context, next) => {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Middleware timeout')), timeoutMs)
    );

    await Promise.race([next(), timeoutPromise]);
  };
}

export default MiddlewareStack;
