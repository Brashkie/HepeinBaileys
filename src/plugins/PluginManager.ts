import type { Logger } from 'pino';
import type { HepeinSocket, HepeinPlugin, PluginCommand, MessageContext } from '../types';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Gestor de plugins profesional
 */
export class PluginManager extends EventEmitter {
  private logger: Logger;
  private pluginsDir: string;
  private plugins: Map<string, HepeinPlugin>;
  private commands: Map<string, PluginCommand>;
  private socket?: HepeinSocket;

  constructor(pluginsDir: string, logger: Logger) {
    super();
    this.logger = logger;
    this.pluginsDir = pluginsDir;
    this.plugins = new Map();
    this.commands = new Map();

    this.logger.info({ pluginsDir }, 'PluginManager inicializado');
  }

  /**
   * Inicializar gestor de plugins
   */
  async initialize(socket: HepeinSocket): Promise<void> {
    this.socket = socket;

    // Verificar directorio de plugins
    try {
      await fs.access(this.pluginsDir);
    } catch {
      await fs.mkdir(this.pluginsDir, { recursive: true });
      this.logger.info('Directorio de plugins creado');
    }

    this.logger.info('PluginManager inicializado');
  }

  /**
   * Cargar un plugin
   */
  async loadPlugin(pluginName: string): Promise<void> {
    try {
      const pluginPath = path.join(this.pluginsDir, pluginName);
      
      this.logger.info({ plugin: pluginName }, 'Cargando plugin');

      // Importar plugin dinámicamente
      const pluginModule = await import(pluginPath);
      const plugin: HepeinPlugin = pluginModule.default || pluginModule;

      // Validar plugin
      this.validatePlugin(plugin);

      // Inicializar plugin
      if (this.socket) {
        await plugin.initialize(this.socket);
      }

      // Registrar comandos del plugin
      if (plugin.commands) {
        for (const command of plugin.commands) {
          this.registerCommand(command, plugin.name);
        }
      }

      // Registrar middlewares del plugin
      if (plugin.middlewares) {
        for (const middleware of plugin.middlewares) {
          this.socket?.config.middleware?.stack?.push(middleware);
        }
      }

      // Guardar plugin
      this.plugins.set(plugin.name, plugin);

      this.logger.info(
        {
          plugin: plugin.name,
          version: plugin.version,
          commands: plugin.commands?.length || 0,
          middlewares: plugin.middlewares?.length || 0,
        },
        '✅ Plugin cargado'
      );

      this.emit('plugin.loaded', plugin);
    } catch (error) {
      this.logger.error({ error, plugin: pluginName }, 'Error cargando plugin');
      throw error;
    }
  }

  /**
   * Cargar múltiples plugins
   */
  async loadPlugins(pluginNames: string[]): Promise<void> {
    for (const name of pluginNames) {
      try {
        await this.loadPlugin(name);
      } catch (error) {
        this.logger.error({ error, plugin: name }, 'Error cargando plugin');
      }
    }
  }

  /**
   * Descargar plugin
   */
  async unloadPlugin(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);

    if (!plugin) {
      throw new Error(`Plugin ${pluginName} no encontrado`);
    }

    // Cleanup del plugin
    if (plugin.cleanup) {
      await plugin.cleanup();
    }

    // Remover comandos
    if (plugin.commands) {
      for (const command of plugin.commands) {
        this.commands.delete(command.name);
        
        // Remover aliases
        if (command.aliases) {
          for (const alias of command.aliases) {
            this.commands.delete(alias);
          }
        }
      }
    }

    // Remover plugin
    this.plugins.delete(pluginName);

    this.logger.info({ plugin: pluginName }, 'Plugin descargado');
    this.emit('plugin.unloaded', plugin);
  }

  /**
   * Validar estructura del plugin
   */
  private validatePlugin(plugin: HepeinPlugin): void {
    if (!plugin.name) {
      throw new Error('Plugin debe tener nombre');
    }

    if (!plugin.version) {
      throw new Error('Plugin debe tener versión');
    }

    if (!plugin.initialize || typeof plugin.initialize !== 'function') {
      throw new Error('Plugin debe tener método initialize');
    }
  }

  /**
   * Registrar comando de plugin
   */
  private registerCommand(command: PluginCommand, pluginName: string): void {
    // Registrar comando principal
    if (this.commands.has(command.name)) {
      this.logger.warn(
        { command: command.name, plugin: pluginName },
        'Comando ya existe, sobrescribiendo'
      );
    }

    this.commands.set(command.name, command);

    // Registrar aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.commands.set(alias, command);
      }
    }

    this.logger.debug({ command: command.name, plugin: pluginName }, 'Comando registrado');
  }

  /**
   * Ejecutar comando
   */
  async executeCommand(commandName: string, context: MessageContext): Promise<boolean> {
    const command = this.commands.get(commandName);

    if (!command) {
      return false;
    }

    try {
      // Verificar permisos si los hay
      if (command.permissions && command.permissions.length > 0) {
        const hasPermission = await this.checkPermissions(context, command.permissions);
        
        if (!hasPermission) {
          await context.reply('❌ No tienes permisos para ejecutar este comando.');
          return true;
        }
      }

      // Ejecutar comando
      await command.handler(context);

      this.logger.debug({ command: commandName }, 'Comando ejecutado');
      this.emit('command.executed', commandName, context);

      return true;
    } catch (error) {
      this.logger.error({ error, command: commandName }, 'Error ejecutando comando');
      await context.reply('❌ Error ejecutando comando.');
      return false;
    }
  }

  /**
   * Verificar permisos
   */
  private async checkPermissions(
    context: MessageContext,
    permissions: string[]
  ): Promise<boolean> {
    // TODO: Implementar sistema de permisos robusto
    // Por ahora, solo verificar si es admin de grupo
    
    if (permissions.includes('admin') && context.metadata.isGroup) {
      // Verificar si es admin del grupo
      return true; // Placeholder
    }

    return true;
  }

  /**
   * Obtener plugin por nombre
   */
  getPlugin(name: string): HepeinPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Obtener todos los plugins cargados
   */
  getLoadedPlugins(): HepeinPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Obtener comando por nombre
   */
  getCommand(name: string): PluginCommand | undefined {
    return this.commands.get(name);
  }

  /**
   * Obtener todos los comandos
   */
  getAllCommands(): PluginCommand[] {
    const uniqueCommands = new Map<string, PluginCommand>();
    
    for (const [name, command] of this.commands) {
      if (!uniqueCommands.has(command.name)) {
        uniqueCommands.set(command.name, command);
      }
    }

    return Array.from(uniqueCommands.values());
  }

  /**
   * Listar plugins disponibles
   */
  async listAvailablePlugins(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.pluginsDir);
      return files.filter((file) => file.endsWith('.js') || file.endsWith('.ts'));
    } catch (error) {
      this.logger.error({ error }, 'Error listando plugins');
      return [];
    }
  }

  /**
   * Recargar plugin
   */
  async reloadPlugin(pluginName: string): Promise<void> {
    await this.unloadPlugin(pluginName);
    await this.loadPlugin(pluginName);
    this.logger.info({ plugin: pluginName }, 'Plugin recargado');
  }

  /**
   * Recargar todos los plugins
   */
  async reloadAllPlugins(): Promise<void> {
    const pluginNames = Array.from(this.plugins.keys());
    
    for (const name of pluginNames) {
      await this.reloadPlugin(name);
    }

    this.logger.info('Todos los plugins recargados');
  }

  /**
   * Obtener estadísticas
   */
  getStats() {
    return {
      totalPlugins: this.plugins.size,
      totalCommands: this.commands.size,
      plugins: this.getLoadedPlugins().map((p) => ({
        name: p.name,
        version: p.version,
        commands: p.commands?.length || 0,
        middlewares: p.middlewares?.length || 0,
      })),
    };
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    const pluginNames = Array.from(this.plugins.keys());

    for (const name of pluginNames) {
      await this.unloadPlugin(name);
    }

    this.logger.info('PluginManager limpiado');
  }
}

/**
 * Clase base para crear plugins fácilmente
 */
export class BasePlugin implements HepeinPlugin {
  name: string;
  version: string;
  description?: string;
  author?: string;
  commands?: PluginCommand[];

  constructor(config: {
    name: string;
    version: string;
    description?: string;
    author?: string;
  }) {
    this.name = config.name;
    this.version = config.version;
    this.description = config.description;
    this.author = config.author;
    this.commands = [];
  }

  /**
   * Agregar comando al plugin
   */
  addCommand(command: PluginCommand): void {
    if (!this.commands) {
      this.commands = [];
    }
    this.commands.push(command);
  }

  /**
   * Método de inicialización (debe ser sobrescrito)
   */
  async initialize(socket: HepeinSocket): Promise<void> {
    // Override en subclase
  }

  /**
   * Método de cleanup (opcional)
   */
  async cleanup(): Promise<void> {
    // Override en subclase si es necesario
  }
}

/**
 * Helper para crear comandos fácilmente
 */
export function createCommand(config: {
  name: string;
  aliases?: string[];
  description?: string;
  pattern: RegExp;
  handler: (context: MessageContext) => Promise<void>;
  permissions?: string[];
}): PluginCommand {
  return {
    name: config.name,
    aliases: config.aliases,
    description: config.description,
    pattern: config.pattern,
    handler: config.handler,
    permissions: config.permissions,
  };
}

export default PluginManager;
