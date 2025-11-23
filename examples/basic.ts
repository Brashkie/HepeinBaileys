
/**
 * Ejemplo básico de uso de HepeinBaileys
 * Este ejemplo muestra cómo crear un bot simple que responde a mensajes
 */

import { createHepeinSocket, useMultiFileAuthState } from '../src';

async function main() {
  // Configurar autenticación
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

  // Crear socket de HepeinBaileys
  const sock = await createHepeinSocket({
    auth: {
      state,
      saveCreds,
    },
    connection: {
      printQRInTerminal: true,
      autoReconnect: true,
    },
    logger: {
      level: 'info',
    },
  });

  console.log('✅ Bot conectado exitosamente');

  // Manejar mensajes
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      // Ignorar mensajes sin contenido o propios
      if (!msg.message || msg.key.fromMe) continue;

      const from = msg.key.remoteJid!;
      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        '';

      console.log(`Mensaje de ${from}: ${text}`);

      // Responder
      if (text.toLowerCase() === 'hola') {
        await sock.sendMessage(from, {
          text: '¡Hola! Soy un bot creado con HepeinBaileys 🤖',
        });
      }

      if (text.toLowerCase() === 'ping') {
        await sock.sendMessage(from, { text: 'Pong! 🏓' });
      }

      if (text.toLowerCase() === 'ayuda') {
        await sock.sendMessage(from, {
          text: `
📋 *Comandos disponibles:*

• hola - Saludo
• ping - Verificar bot
• ayuda - Este mensaje
          `.trim(),
        });
      }
    }
  });

  // Manejar errores
  sock.ev.on('connection.update', (update) => {
    const { connection } = update;
    if (connection === 'close') {
      console.log('⚠️ Conexión cerrada');
    } else if (connection === 'open') {
      console.log('✅ Conexión abierta');
    }
  });

  // Manejo graceful de shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Deteniendo bot...');
    await sock.end();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
