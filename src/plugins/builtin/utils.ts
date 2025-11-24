import { BasePlugin, createCommand } from '../PluginManager';
import type { HepeinSocket, MessageContext } from '../../types';

/**
 * Plugin de utilidades básicas
 */
export class UtilsPlugin extends BasePlugin {
  constructor() {
    super({
      name: 'utils',
      version: '1.0.0',
      description: 'Comandos de utilidad básicos',
      author: 'Brashkie',
    });
  }

  async initialize(socket: HepeinSocket): Promise<void> {
    // Comando: ping
    this.addCommand(
      createCommand({
        name: 'ping',
        aliases: ['p'],
        description: 'Verificar latencia del bot',
        pattern: /^!ping$/i,
        handler: async (context: MessageContext) => {
          const start = Date.now();
          await context.reply('🏓 Pong!');
          const latency = Date.now() - start;
          await context.reply(`⏱️ Latencia: ${latency}ms`);
        },
      })
    );

    // Comando: info
    this.addCommand(
      createCommand({
        name: 'info',
        description: 'Información del chat actual',
        pattern: /^!info$/i,
        handler: async (context: MessageContext) => {
          const info = `
📊 *Información del Chat*

*ID:* ${context.from}
*Tipo:* ${context.metadata.isGroup ? 'Grupo' : 'Chat Privado'}
*Business:* ${context.metadata.isBusiness ? 'Sí' : 'No'}
*Timestamp:* ${new Date(context.metadata.timestamp * 1000).toLocaleString()}
          `.trim();

          await context.reply(info);
        },
      })
    );

    // Comando: echo
    this.addCommand(
      createCommand({
        name: 'echo',
        aliases: ['repeat'],
        description: 'Repetir un mensaje',
        pattern: /^!echo\s+(.+)$/i,
        handler: async (context: MessageContext) => {
          const match = context.text?.match(/^!echo\s+(.+)$/i);
          const text = match?.[1] || 'Debes proporcionar texto';
          await context.reply(text);
        },
      })
    );

    // Comando: reverse
    this.addCommand(
      createCommand({
        name: 'reverse',
        description: 'Invertir texto',
        pattern: /^!reverse\s+(.+)$/i,
        handler: async (context: MessageContext) => {
          const match = context.text?.match(/^!reverse\s+(.+)$/i);
          const text = match?.[1];
          
          if (!text) {
            await context.reply('❌ Debes proporcionar texto');
            return;
          }

          const reversed = text.split('').reverse().join('');
          await context.reply(reversed);
        },
      })
    );

    // Comando: calc
    this.addCommand(
      createCommand({
        name: 'calc',
        aliases: ['calculate', 'math'],
        description: 'Calcular expresión matemática',
        pattern: /^!calc\s+(.+)$/i,
        handler: async (context: MessageContext) => {
          const match = context.text?.match(/^!calc\s+(.+)$/i);
          const expression = match?.[1];

          if (!expression) {
            await context.reply('❌ Proporciona una expresión matemática');
            return;
          }

          try {
            // Sanitizar expresión (solo números y operadores básicos)
            const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
            const result = eval(sanitized);
            await context.reply(`🔢 Resultado: ${result}`);
          } catch (error) {
            await context.reply('❌ Expresión inválida');
          }
        },
      })
    );

    // Comando: help
    this.addCommand(
      createCommand({
        name: 'help',
        aliases: ['ayuda', 'comandos'],
        description: 'Mostrar ayuda',
        pattern: /^!help$/i,
        handler: async (context: MessageContext) => {
          const help = `
📚 *Comandos de Utilidades*

*!ping* - Verificar latencia
*!info* - Info del chat
*!echo [texto]* - Repetir texto
*!reverse [texto]* - Invertir texto
*!calc [expresión]* - Calcular
*!help* - Esta ayuda
          `.trim();

          await context.reply(help);
        },
      })
    );
  }
}

export default new UtilsPlugin();
