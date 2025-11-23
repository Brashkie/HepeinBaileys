/**
 * Ejemplo COMPLETO con todas las features nuevas:
 * - AI Service (OpenAI, Anthropic, Google)
 * - Plugin System
 * - Group Handler
 * - Validators y Formatters
 */

import {
  createHepeinSocket,
  useMultiFileAuthState,
  AIService,
  PluginManager,
  GroupHandler,
  Validator,
  Formatter,
  MessageValidator,
  loggingMiddleware,
  filterSelfMessages,
  antiSpamMiddleware,
  commandParserMiddleware,
  type MessageContext,
} from '../src';
import pino from 'pino';

async function main() {
  const logger = pino({
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  });

  // Autenticación
  const { state, saveCreds } = await useMultiFileAuthState('./auth_complete');

  // Crear socket con AI habilitado
  const sock = await createHepeinSocket({
    auth: { state, saveCreds },
    connection: {
      printQRInTerminal: true,
      autoReconnect: true,
    },
    cache: {
      enabled: true,
      maxSize: 5000,
      ttl: 3600,
    },
    queue: {
      enabled: true,
      processing: {
        concurrency: 20,
        rateLimit: 100,
      },
    },
    logger: {
      instance: logger,
      level: 'info',
    },
    // 🤖 Configuración de AI
    ai: {
      enabled: true,
      provider: 'openai', // o 'anthropic' o 'google'
      apiKey: process.env.OPENAI_API_KEY || 'tu-api-key-aqui',
      model: 'gpt-4',
      autoReply: {
        enabled: true,
        patterns: [/^bot/i, /^ia/i],
        context: 'Eres un asistente útil de WhatsApp en español.',
      },
    },
    antiSpam: {
      enabled: true,
      maxMessagesPerMinute: 10,
      action: 'warn',
    },
    metrics: {
      enabled: true,
      detailed: true,
    },
    middleware: {
      stack: [
        loggingMiddleware(logger),
        filterSelfMessages(),
        antiSpamMiddleware({ maxMessagesPerMinute: 10 }),
        commandParserMiddleware('!'),
      ],
    },
  });

  logger.info('✅ Bot completo conectado');

  // 🤖 Inicializar AI Service
  let aiService: AIService | undefined;
  if (sock.config.ai?.enabled) {
    aiService = new AIService(sock.config.ai, logger);
    logger.info('🤖 AI Service inicializado');
  }

  // 🔌 Inicializar Plugin Manager
  const pluginManager = new PluginManager('./plugins', logger);
  await pluginManager.initialize(sock);

  // Cargar plugins built-in
  try {
    await pluginManager.loadPlugin('./builtin/utils.ts');
    logger.info('✅ Plugins cargados');
  } catch (error) {
    logger.warn('No se pudieron cargar plugins built-in');
  }

  // 👥 Inicializar Group Handler
  const groupHandler = new GroupHandler(sock, logger);

  // 📝 Comandos personalizados
  const commands = new Map<string, (context: MessageContext) => Promise<void>>();

  // Comando: AI
  commands.set('ai', async (context) => {
    if (!aiService) {
      await context.reply('❌ AI no está habilitada');
      return;
    }

    const args = context.state.args;
    if (!args || args.length === 0) {
      await context.reply('❌ Uso: !ai [pregunta]');
      return;
    }

    const question = args.join(' ');
    await context.react('🤔');

    try {
      const response = await aiService.generateResponse(question, {
        systemPrompt: 'Eres un asistente útil. Responde de forma concisa.',
        maxTokens: 500,
      });

      await context.reply(`🤖 *AI:* ${response.text}`);
      await context.react('✅');
    } catch (error) {
      logger.error({ error }, 'Error en AI');
      await context.reply('❌ Error generando respuesta AI');
      await context.react('❌');
    }
  });

  // Comando: Traducir
  commands.set('translate', async (context) => {
    if (!aiService) {
      await context.reply('❌ AI no está habilitada');
      return;
    }

    const args = context.state.args;
    if (!args || args.length < 2) {
      await context.reply('❌ Uso: !translate [idioma] [texto]');
      return;
    }

    const targetLang = args[0];
    const text = args.slice(1).join(' ');

    try {
      const translation = await aiService.translate(text, targetLang!);
      await context.reply(`🌐 *Traducción:* ${translation}`);
    } catch (error) {
      await context.reply('❌ Error traduciendo');
    }
  });

  // Comando: Sentiment
  commands.set('sentiment', async (context) => {
    if (!aiService) {
      await context.reply('❌ AI no está habilitada');
      return;
    }

    const args = context.state.args;
    if (!args || args.length === 0) {
      await context.reply('❌ Uso: !sentiment [texto]');
      return;
    }

    const text = args.join(' ');

    try {
      const sentiment = await aiService.analyzeSentiment(text);
      const emoji =
        sentiment.sentiment === 'positive'
          ? '😊'
          : sentiment.sentiment === 'negative'
          ? '😞'
          : '😐';

      await context.reply(
        `${emoji} *Sentimiento:* ${sentiment.sentiment}\n*Score:* ${sentiment.score}\n*Confianza:* ${(sentiment.confidence * 100).toFixed(1)}%`
      );
    } catch (error) {
      await context.reply('❌ Error analizando sentimiento');
    }
  });

  // Comando: Group Info (solo en grupos)
  commands.set('groupinfo', async (context) => {
    if (!context.metadata.isGroup) {
      await context.reply('❌ Este comando solo funciona en grupos');
      return;
    }

    try {
      const stats = await groupHandler.getGroupStats(context.from);

      const info = `
📊 *Información del Grupo*

*Nombre:* ${stats.metadata.subject}
*Descripción:* ${stats.metadata.desc || 'Sin descripción'}
*Participantes:* ${stats.totalParticipants}
*Admins:* ${stats.totalAdmins}
*Bot es admin:* ${stats.botIsAdmin ? 'Sí ✅' : 'No ❌'}
*Creado:* ${new Date(stats.metadata.creation * 1000).toLocaleDateString()}
      `.trim();

      await context.reply(info);
    } catch (error) {
      logger.error({ error }, 'Error obteniendo info de grupo');
      await context.reply('❌ Error obteniendo información');
    }
  });

  // Comando: Mention All (solo admins)
  commands.set('everyone', async (context) => {
    if (!context.metadata.isGroup) {
      await context.reply('❌ Este comando solo funciona en grupos');
      return;
    }

    try {
      const isBotAdmin = await groupHandler.isBotAdmin(context.from);
      
      if (!isBotAdmin) {
        await context.reply('❌ El bot necesita ser admin para usar este comando');
        return;
      }

      const message = context.state.args?.join(' ') || '📢 Atención a todos!';
      await groupHandler.mentionEveryone(context.from, message);
    } catch (error) {
      await context.reply('❌ Error mencionando a todos');
    }
  });

  // Comando: Validar número
  commands.set('validate', async (context) => {
    const args = context.state.args;
    if (!args || args.length === 0) {
      await context.reply('❌ Uso: !validate [número]');
      return;
    }

    const number = args[0]!;
    const isValid = Validator.isValidNumber(number);

    if (isValid) {
      const formatted = Formatter.formatNumber(number);
      const jid = Formatter.toJID(number);
      const link = Formatter.formatWhatsAppLink(number);

      await context.reply(
        `✅ *Número válido*\n\n*Formato:* ${formatted}\n*JID:* ${jid}\n*Link:* ${link}`
      );
    } else {
      await context.reply('❌ Número inválido');
    }
  });

  // Comando: Plugins
  commands.set('plugins', async (context) => {
    const stats = pluginManager.getStats();

    const pluginList = stats.plugins
      .map(
        (p) =>
          `• *${p.name}* v${p.version}\n  Comandos: ${p.commands} | Middlewares: ${p.middlewares}`
      )
      .join('\n');

    const info = `
🔌 *Plugins Cargados*

${pluginList || 'Sin plugins'}

*Total:* ${stats.totalPlugins} plugins
*Comandos:* ${stats.totalCommands} comandos
    `.trim();

    await context.reply(info);
  });

  // Comando: Stats
  commands.set('stats', async (context) => {
    const stats = await sock.getStats();
    const aiStats = aiService?.getStats();

    const info = `
📊 *Estadísticas del Bot*

*Caché:*
• Hits: ${stats.cache.hits}
• Hit Rate: ${stats.cache.hitRate.toFixed(2)}%
• Tamaño: ${stats.cache.size}/${stats.cache.maxSize}

*Cola:*
• Esperando: ${stats.queue.waiting}
• Completados: ${stats.queue.completed}
• Fallidos: ${stats.queue.failed}

*Mensajes:*
• Recibidos: ${stats.metrics['messages.received'] || 0}
• Enviados: ${stats.metrics['messages.sent'] || 0}
• Errores: ${stats.metrics['messages.errors'] || 0}

${aiStats ? `*AI (${aiStats.provider}):*\n• Requests: ${aiStats.requestCount}\n• Tokens: ${aiStats.totalTokens || 'N/A'}` : ''}
    `.trim();

    await context.reply(info);
  });

  // Comando: Help
  commands.set('help', async (context) => {
    const help = `
📚 *Comandos Disponibles*

*General:*
• !help - Esta ayuda
• !stats - Estadísticas del bot
• !plugins - Plugins cargados

*AI:*
• !ai [pregunta] - Pregunta a la IA
• !translate [idioma] [texto] - Traducir
• !sentiment [texto] - Análisis de sentimiento

*Grupos:*
• !groupinfo - Info del grupo
• !everyone [mensaje] - Mencionar a todos

*Utilidades:*
• !validate [número] - Validar número
• !ping - Latencia
• !info - Info del chat

*Nota:* Algunos comandos requieren permisos especiales
    `.trim();

    await context.reply(help);
  });

  // 🎯 Manejador principal de mensajes
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      try {
        const from = msg.key.remoteJid!;
        const text =
          msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        // Validar mensaje
        if (text && MessageValidator.isSpam(text)) {
          logger.warn({ from }, 'Spam detectado');
          continue;
        }

        // Crear contexto
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
          state: {},
          reply: async (message: any) => {
            const content = typeof message === 'string' ? { text: message } : message;
            return await sock.sendMessage(from, content, { quoted: msg });
          },
          react: async (emoji: string) => {
            await sock.sendMessage(from, {
              react: { text: emoji, key: msg.key },
            });
          },
        };

        // Procesar comandos
        if (text.startsWith('!')) {
          const parsed = MessageValidator.parseCommand(text);

          if (parsed) {
            context.state.command = parsed.command;
            context.state.args = parsed.args;

            // Intentar ejecutar desde plugin manager
            const executedByPlugin = await pluginManager.executeCommand(
              parsed.command,
              context
            );

            if (!executedByPlugin) {
              // Intentar ejecutar comando personalizado
              const handler = commands.get(parsed.command);

              if (handler) {
                await handler(context);
              } else {
                await context.reply(
                  '❌ Comando no encontrado. Usa !help para ver comandos disponibles.'
                );
              }
            }
          }
        }
        // Auto-reply con AI si está habilitado
        else if (
          aiService &&
          sock.config.ai?.autoReply?.enabled &&
          aiService.shouldAutoReply(text)
        ) {
          await context.react('🤔');

          try {
            const response = await aiService.generateAutoReply(text);
            await context.reply(response);
          } catch (error) {
            logger.error({ error }, 'Error en auto-reply');
          }
        }
      } catch (error) {
        logger.error({ error }, 'Error procesando mensaje');
      }
    }
  });

  // Eventos de HepeinBaileys
  sock.on('hepein.ready', () => {
    logger.info('🎉 Sistema completo listo');
  });

  sock.on('hepein.error', (error) => {
    logger.error({ error }, '❌ Error en sistema');
  });

  // Métricas periódicas
  setInterval(async () => {
    const stats = await sock.getStats();
    logger.info({ stats }, '📊 Métricas');
  }, 300000);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('🛑 Deteniendo bot...');

    if (aiService) {
      await aiService.cleanup();
    }

    await pluginManager.cleanup();
    await sock.end();

    logger.info('✅ Bot detenido');
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
