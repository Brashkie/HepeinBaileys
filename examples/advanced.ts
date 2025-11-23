/**
 * Ejemplo avanzado de HepeinBaileys
 * Muestra el uso de todas las características profesionales
 */

import {
  createHepeinSocket,
  useMultiFileAuthState,
  loggingMiddleware,
  filterSelfMessages,
  antiSpamMiddleware,
  commandParserMiddleware,
  errorHandlerMiddleware,
  metricsMiddleware,
  type MessageContext,
} from '../src';
import pino from 'pino';

async function main() {
  // Logger personalizado
  const logger = pino({
    level: 'debug',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
      },
    },
  });

  // Autenticación
  const { state, saveCreds } = await useMultiFileAuthState('./auth_advanced');

  // Crear socket con configuración avanzada
  const sock = await createHepeinSocket({
    auth: {
      state,
      saveCreds,
    },
    connection: {
      printQRInTerminal: true,
      autoReconnect: true,
      maxReconnectAttempts: 5,
      reconnectDelay: 5000,
    },
    cache: {
      enabled: true,
      maxSize: 5000,
      ttl: 3600,
      type: 'memory',
    },
    queue: {
      enabled: true,
      type: 'memory',
      processing: {
        concurrency: 20,
        rateLimit: 100,
        batchSize: 100,
        batchDelay: 3000,
      },
    },
    logger: {
      instance: logger,
      level: 'debug',
    },
    business: {
      enabled: true,
    },
    antiSpam: {
      enabled: true,
      maxMessagesPerMinute: 10,
      maxMessagesPerHour: 100,
      action: 'warn',
    },
    metrics: {
      enabled: true,
      detailed: true,
    },
    middleware: {
      stack: [
        errorHandlerMiddleware(logger),
        loggingMiddleware(logger),
        filterSelfMessages(),
        antiSpamMiddleware({
          maxMessagesPerMinute: 10,
          action: 'warn',
        }),
        commandParserMiddleware('!'),
        metricsMiddleware(sock.metrics),
        // Middleware personalizado
        async (context: MessageContext, next) => {
          // Enriquecer contexto
          context.state.processedAt = Date.now();
          await next();
        },
      ],
    },
  });

  logger.info('✅ Bot avanzado conectado');

  // Manejador de comandos
  const commands = new Map<string, (context: MessageContext) => Promise<void>>();

  commands.set('stats', async (context) => {
    const stats = await sock.getStats();
    const summary = `
📊 *Estadísticas del Bot*

*Conexión:*
• Reintentos: ${stats.connection.reconnectAttempts}
• Reconectando: ${stats.connection.isReconnecting ? 'Sí' : 'No'}

*Caché:*
• Hits: ${stats.cache.hits}
• Misses: ${stats.cache.misses}
• Hit Rate: ${stats.cache.hitRate.toFixed(2)}%
• Tamaño: ${stats.cache.size}/${stats.cache.maxSize}

*Cola:*
• Esperando: ${stats.queue.waiting}
• Activos: ${stats.queue.active}
• Completados: ${stats.queue.completed}
• Fallidos: ${stats.queue.failed}

*Métricas:*
• Mensajes recibidos: ${stats.metrics['messages.received'] || 0}
• Mensajes procesados: ${stats.metrics['messages.processed'] || 0}
• Mensajes enviados: ${stats.metrics['messages.sent'] || 0}
    `.trim();

    await context.reply(summary);
  });

  commands.set('ping', async (context) => {
    const start = Date.now();
    await context.reply('Pong! 🏓');
    const latency = Date.now() - start;
    await context.reply(`Latencia: ${latency}ms`);
  });

  commands.set('help', async (context) => {
    const help = `
📚 *Comandos Disponibles*

*General:*
• !ping - Verificar latencia
• !stats - Ver estadísticas
• !help - Este mensaje

*Utilidades:*
• !echo [texto] - Repetir texto
• !reverse [texto] - Invertir texto
• !info - Información del chat

*Administración:*
• !cache clear - Limpiar caché
• !queue pause - Pausar cola
• !queue resume - Reanudar cola
    `.trim();

    await context.reply(help);
  });

  commands.set('echo', async (context) => {
    const text = context.state.args?.join(' ') || 'Debes proporcionar texto';
    await context.reply(text);
  });

  commands.set('reverse', async (context) => {
    const text = context.state.args?.join(' ') || '';
    const reversed = text.split('').reverse().join('');
    await context.reply(reversed || 'Debes proporcionar texto');
  });

  commands.set('info', async (context) => {
    const info = `
ℹ️ *Información del Chat*

*ID:* ${context.from}
*Tipo:* ${context.metadata.isGroup ? 'Grupo' : 'Privado'}
*Business:* ${context.metadata.isBusiness ? 'Sí' : 'No'}
*Timestamp:* ${new Date(context.metadata.timestamp * 1000).toLocaleString()}
    `.trim();

    await context.reply(info);
  });

  commands.set('cache', async (context) => {
    const subcommand = context.state.args?.[0];

    if (subcommand === 'clear') {
      await sock.cache.clear();
      await context.reply('✅ Caché limpiado');
    } else {
      const stats = await sock.cache.getStats();
      await context.reply(
        `📦 Caché: ${stats.size}/${stats.maxSize} | Hit Rate: ${stats.hitRate.toFixed(2)}%`
      );
    }
  });

  commands.set('queue', async (context) => {
    const subcommand = context.state.args?.[0];

    if (subcommand === 'pause') {
      await sock.queue.pause();
      await context.reply('⏸️ Cola pausada');
    } else if (subcommand === 'resume') {
      await sock.queue.resume();
      await context.reply('▶️ Cola reanudada');
    } else {
      const stats = await sock.queue.getStats();
      await context.reply(
        `📋 Cola: ${stats.waiting} esperando | ${stats.active} activos | ${stats.completed} completados`
      );
    }
  });

  // Procesador de mensajes con comandos
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      try {
        // Crear contexto básico (el middleware lo enriquecerá)
        const from = msg.key.remoteJid!;
        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          '';

        // Si es un comando
        if (text.startsWith('!')) {
          const parts = text.slice(1).trim().split(/\s+/);
          const command = parts[0]?.toLowerCase();
          const args = parts.slice(1);

          const handler = commands.get(command);

          if (handler) {
            // Crear contexto completo
            const context: MessageContext = {
              socket: sock,
              message: msg,
              from,
              text,
              type: 'text',
              metadata: {
                timestamp: Number(msg.messageTimestamp),
                isGroup: from.endsWith('@g.us'),
                isBusiness: await sock.isBusinessAccount(from),
                fromMe: false,
              },
              state: {
                command,
                args,
                isCommand: true,
              },
              reply: async (message: any) => {
                const content =
                  typeof message === 'string' ? { text: message } : message;
                return await sock.sendMessage(from, content, { quoted: msg });
              },
              react: async (emoji: string) => {
                await sock.sendMessage(from, {
                  react: { text: emoji, key: msg.key },
                });
              },
            };

            await handler(context);
          } else {
            await sock.sendMessage(from, {
              text: '❌ Comando no encontrado. Usa !help para ver comandos disponibles.',
            });
          }
        }
      } catch (error) {
        logger.error({ error }, 'Error procesando mensaje');
      }
    }
  });

  // Eventos de HepeinBaileys
  sock.on('hepein.ready', () => {
    logger.info('🎉 HepeinBaileys listo');
  });

  sock.on('hepein.reconnecting', (attempt) => {
    logger.warn({ attempt }, '🔄 Reconectando...');
  });

  sock.on('hepein.error', (error) => {
    logger.error({ error }, '❌ Error en HepeinBaileys');
  });

  // Métricas periódicas
  setInterval(async () => {
    const metrics = await sock.metrics.getMetrics();
    logger.info({ metrics }, '📊 Métricas periódicas');
  }, 300000); // Cada 5 minutos

  // Limpiar caché expirado cada hora
  setInterval(async () => {
    const purged = await sock.cache.purgeExpired();
    logger.info({ purged }, '🧹 Caché limpiado');
  }, 3600000);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('🛑 Deteniendo bot...');

    // Obtener estadísticas finales
    const finalStats = await sock.getStats();
    logger.info({ finalStats }, '📊 Estadísticas finales');

    await sock.end();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
