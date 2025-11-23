/**
 * Ejemplo de envío masivo optimizado
 * Demuestra cómo enviar mensajes a miles de números con HepeinBaileys
 */

import {
  createHepeinSocket,
  useMultiFileAuthState,
  formatToJID,
  chunk,
} from '../src';
import pino from 'pino';

async function main() {
  const logger = pino({
    level: 'info',
    transport: {
      target: 'pino-pretty',
    },
  });

  // Autenticación
  const { state, saveCreds } = await useMultiFileAuthState('./auth_bulk');

  // Configuración optimizada para envío masivo
  const sock = await createHepeinSocket({
    auth: { state, saveCreds },
    connection: {
      printQRInTerminal: true,
      autoReconnect: true,
    },
    cache: {
      enabled: true,
      maxSize: 10000, // Caché grande para muchos contactos
    },
    queue: {
      enabled: true,
      processing: {
        concurrency: 50, // Mayor concurrencia
        rateLimit: 100, // 100 mensajes por segundo
        batchSize: 100, // Lotes de 100
        batchDelay: 5000, // 5 segundos entre lotes
      },
    },
    logger: {
      instance: logger,
      level: 'info',
    },
    metrics: {
      enabled: true,
      detailed: true,
    },
  });

  logger.info('✅ Bot de envío masivo conectado');

  // Lista de destinatarios (ejemplo con números)
  const recipients = [
    '51987654321',
    '51912345678',
    '51923456789',
    // ... agregar más números aquí
    // Puede ser una lista de miles de números
  ];

  // Mensaje a enviar
  const message = {
    text: `
¡Hola! 👋

Este es un mensaje de prueba enviado con HepeinBaileys.

Sistema de envío masivo optimizado para grandes volúmenes.

✅ Alta velocidad
✅ Control de rate limiting
✅ Reintentos automáticos
✅ Métricas en tiempo real
    `.trim(),
  };

  // **Método 1: Usar sendBulk (Recomendado)**
  logger.info(`📤 Iniciando envío masivo a ${recipients.length} números`);

  const startTime = Date.now();

  const result = await sock.sendBulk(
    recipients.map(formatToJID),
    message
  );

  const duration = Date.now() - startTime;

  logger.info(
    {
      total: result.total,
      successful: result.successful,
      failed: result.failed,
      duration: result.executionTime,
      rate: (result.successful / (result.executionTime / 1000)).toFixed(2),
    },
    '✅ Envío masivo completado'
  );

  // Mostrar errores si los hay
  if (result.failed > 0) {
    const errors = result.results.filter((r) => !r.success);
    logger.error({ errors: errors.slice(0, 10) }, '❌ Primeros 10 errores');
  }

  // **Método 2: Envío manual con control personalizado**
  async function bulkSendManual(
    recipients: string[],
    message: any,
    options: {
      batchSize?: number;
      batchDelay?: number;
      onProgress?: (sent: number, total: number) => void;
      onError?: (jid: string, error: Error) => void;
    } = {}
  ) {
    const { batchSize = 50, batchDelay = 5000, onProgress, onError } = options;

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ jid: string; error: string }>,
    };

    // Dividir en lotes
    const batches = chunk(recipients, batchSize);

    logger.info(`📦 Procesando ${batches.length} lotes de ${batchSize} mensajes`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.info(`📤 Lote ${i + 1}/${batches.length}`);

      // Procesar lote en paralelo
      const batchResults = await Promise.allSettled(
        batch.map(async (number) => {
          const jid = formatToJID(number);

          try {
            await sock.sendWithRetry(jid, message, {
              maxRetries: 3,
              retryDelay: 1000,
            });
            results.successful++;
            return { jid, success: true };
          } catch (error) {
            results.failed++;
            const errorMsg = (error as Error).message;
            results.errors.push({ jid, error: errorMsg });

            if (onError) {
              onError(jid, error as Error);
            }

            return { jid, success: false, error };
          }
        })
      );

      // Reportar progreso
      if (onProgress) {
        const sent = (i + 1) * batchSize;
        onProgress(Math.min(sent, recipients.length), recipients.length);
      }

      // Esperar entre lotes (excepto en el último)
      if (i < batches.length - 1) {
        logger.info(`⏳ Esperando ${batchDelay}ms antes del siguiente lote...`);
        await new Promise((resolve) => setTimeout(resolve, batchDelay));
      }
    }

    return results;
  }

  // Ejemplo de uso del método manual
  logger.info('\n📤 Ejemplo de envío manual con control personalizado:');

  const manualResult = await bulkSendManual(
    recipients.slice(0, 10), // Solo primeros 10 para demostración
    message,
    {
      batchSize: 5,
      batchDelay: 3000,
      onProgress: (sent, total) => {
        logger.info(`📊 Progreso: ${sent}/${total} (${((sent / total) * 100).toFixed(1)}%)`);
      },
      onError: (jid, error) => {
        logger.error({ jid, error: error.message }, 'Error enviando mensaje');
      },
    }
  );

  logger.info({ manualResult }, '✅ Envío manual completado');

  // **Método 3: Usar la cola para envío asíncrono**
  logger.info('\n📤 Ejemplo usando cola de mensajes:');

  // Agregar trabajos a la cola
  for (const number of recipients.slice(0, 5)) {
    await sock.queue.add({
      type: 'send',
      data: {
        jid: formatToJID(number),
        message,
      },
      priority: 1,
      attempts: 3,
    });
  }

  // Procesar cola
  sock.queue.process(async (job) => {
    const { jid, message } = job.data;
    await sock.sendMessage(jid, message);
    logger.info({ jid }, '✅ Mensaje enviado desde cola');
    return { jid, sent: true };
  });

  logger.info('✅ Trabajos agregados a la cola');

  // **Método 4: Envío programado con delays**
  async function scheduledBulkSend(
    recipients: string[],
    message: any,
    delayPerMessage: number = 100
  ) {
    logger.info(`📤 Envío programado de ${recipients.length} mensajes`);

    let sent = 0;
    let failed = 0;

    for (const number of recipients) {
      try {
        await sock.sendMessage(formatToJID(number), message);
        sent++;
        logger.debug(`✅ ${number}`);
      } catch (error) {
        failed++;
        logger.error({ number, error }, '❌ Error');
      }

      // Delay entre mensajes
      await new Promise((resolve) => setTimeout(resolve, delayPerMessage));

      // Actualizar progreso cada 10 mensajes
      if ((sent + failed) % 10 === 0) {
        logger.info(
          `📊 Progreso: ${sent + failed}/${recipients.length} | ✅ ${sent} | ❌ ${failed}`
        );
      }
    }

    return { sent, failed };
  }

  // Mostrar estadísticas finales
  setTimeout(async () => {
    const stats = await sock.getStats();

    logger.info('\n📊 ESTADÍSTICAS FINALES:');
    logger.info(`Mensajes enviados: ${stats.metrics['messages.sent'] || 0}`);
    logger.info(`Mensajes fallidos: ${stats.metrics['messages.send_failed'] || 0}`);
    logger.info(`Cola completados: ${stats.queue.completed}`);
    logger.info(`Cola fallidos: ${stats.queue.failed}`);

    const queueSuccessRate =
      stats.queue.completed + stats.queue.failed > 0
        ? ((stats.queue.completed / (stats.queue.completed + stats.queue.failed)) * 100).toFixed(2)
        : 100;

    logger.info(`Tasa de éxito: ${queueSuccessRate}%`);

    // Exportar métricas
    const metricsSnapshot = await sock.metrics.createSnapshot();
    logger.info({ snapshot: metricsSnapshot }, '📸 Snapshot de métricas');
  }, 10000);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('\n🛑 Deteniendo envío masivo...');

    // Pausar cola
    await sock.queue.pause();

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

/**
 * NOTAS DE RENDIMIENTO:
 * 
 * - HepeinBaileys puede enviar 50-100 mensajes por segundo
 * - Para evitar bans, se recomienda no superar 20 msg/s en cuentas nuevas
 * - Usar delays entre lotes para simular comportamiento humano
 * - Monitorear métricas para ajustar concurrencia
 * - Implementar lista blanca para números VIP
 * - Usar caché para optimizar múltiples envíos al mismo número
 * 
 * MEJORES PRÁCTICAS:
 * 
 * 1. Validar números antes de enviar
 * 2. Implementar rate limiting progresivo
 * 3. Usar reintentos con backoff exponencial
 * 4. Cachear respuestas de verificación de números
 * 5. Monitorear tasa de errores
 * 6. Implementar circuit breaker para detener en caso de muchos errores
 * 7. Usar diferentes cuentas para volúmenes muy grandes
 * 8. Respetar horarios de envío (evitar madrugadas)
 */
