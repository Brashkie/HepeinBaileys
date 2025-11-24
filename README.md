<div align="center">

# 🚀 HepeinBaileys

### Fork Profesional de Baileys para WhatsApp Web & Business

[![NPM Version](https://img.shields.io/npm/v/hepeinbaileys?style=flat-square)](https://www.npmjs.com/package/hepeinbaileys)
[![License](https://img.shields.io/github/license/Brashkie/HepeinBaileys?style=flat-square)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/Brashkie/HepeinBaileys/ci.yml?style=flat-square)](https://github.com/Brashkie/HepeinBaileys/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node.js-18%2B-green?style=flat-square&logo=node.js)](https://nodejs.org/)

**HepeinBaileys** es una biblioteca TypeScript profesional para crear bots de WhatsApp con arquitectura empresarial, soporte para IA, sistema de plugins, gestión avanzada de grupos y mucho más.

[🚀 Inicio Rápido](#-inicio-rápido) •
[📚 Documentación](#-documentación) •
[✨ Características](#-características) •
[💡 Ejemplos](#-ejemplos) •
[🤝 Contribuir](#-contribuir)

</div>

---

## 📖 Tabla de Contenidos

- [🎯 ¿Por Qué HepeinBaileys?](#-por-qué-hepeinbaileys)
- [✨ Características Principales](#-características-principales)
- [🚀 Inicio Rápido](#-inicio-rápido)
- [📦 Instalación](#-instalación)
- [💡 Ejemplos de Uso](#-ejemplos-de-uso)
  - [Bot Básico](#bot-básico)
  - [Bot con IA](#bot-con-ia)
  - [Bot de Grupos](#bot-de-grupos)
  - [Bot con Plugins](#bot-con-plugins)
  - [Envío Masivo](#envío-masivo)
- [🎨 Características Avanzadas](#-características-avanzadas)
  - [Sistema de Caché](#sistema-de-caché)
  - [Cola de Mensajes](#cola-de-mensajes)
  - [Métricas y Monitoreo](#métricas-y-monitoreo)
  - [Middleware](#middleware)
  - [AI Service](#ai-service)
  - [Plugin System](#plugin-system)
  - [Group Handler](#group-handler)
- [🛠️ Configuración](#️-configuración)
- [📊 Arquitectura](#-arquitectura)
- [🧪 Testing](#-testing)
- [🤝 Contribuir](#-contribuir)
- [📄 Licencia](#-licencia)
- [🙏 Créditos](#-créditos)

---

## 🎯 ¿Por Qué HepeinBaileys?

HepeinBaileys es más que un simple fork de Baileys. Es una **solución empresarial completa** para crear bots de WhatsApp profesionales:

| Característica | Baileys Original | HepeinBaileys |
|----------------|------------------|---------------|
| **Reconexión Automática** | Básica | ✅ Inteligente con backoff exponencial |
| **Sistema de Caché** | ❌ No | ✅ Redis, Memory, File con TTL |
| **Cola de Mensajes** | ❌ No | ✅ Prioridades, reintentos, delays |
| **Métricas** | ❌ No | ✅ Prometheus, performance, custom |
| **IA Integrada** | ❌ No | ✅ OpenAI, Anthropic, Google Gemini |
| **Sistema de Plugins** | ❌ No | ✅ Carga dinámica, hot-reload |
| **Gestión de Grupos** | Básica | ✅ 20+ métodos profesionales |
| **Middleware** | ❌ No | ✅ Stack completo customizable |
| **TypeScript** | Parcial | ✅ 100% tipado con generics |
| **Testing** | Básico | ✅ 65+ tests, coverage 70%+ |
| **CI/CD** | ❌ No | ✅ GitHub Actions completo |
| **Documentación** | Básica | ✅ Exhaustiva con ejemplos |

---

## ✨ Características Principales

### 🤖 **AI Service - Inteligencia Artificial Integrada**

```typescript
// Auto-respuestas inteligentes con IA
const bot = new HepeinBaileys({
  ai: {
    enabled: true,
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    autoReply: {
      enabled: true,
      patterns: [/¿.*\?/, /ayuda/i],
    }
  }
});
```

**Proveedores soportados:**
- ✅ OpenAI (GPT-4, GPT-3.5)
- ✅ Anthropic (Claude 3.5 Sonnet, Claude 3 Opus)
- ✅ Google (Gemini Pro, Gemini Ultra)
- ✅ Custom (Tu propia API)

**Funcionalidades:**
- 🧠 Generación de respuestas contextuales
- 💬 Auto-respuestas inteligentes
- 😊 Análisis de sentimientos
- 🎯 Extracción de intenciones (NLU)
- 🌍 Traducción automática
- 📝 Resumen de textos
- 🔮 Clasificación de mensajes

### 🔌 **Plugin System - Arquitectura Extensible**

```typescript
// Cargar plugins dinámicamente
await bot.plugins.loadPlugin('utils');
await bot.plugins.loadPlugin('music');
await bot.plugins.loadPlugin('games');

// Hot-reload sin reiniciar
await bot.plugins.reloadPlugin('utils');
```

**Comandos incluidos:**
- `!ping` - Verificar latencia
- `!info` - Información del chat
- `!help` - Ayuda de comandos
- `!calc` - Calculadora
- `!translate` - Traducción con IA
- `!sentiment` - Análisis de sentimientos

**Crear tu propio plugin:**

```typescript
import { BasePlugin } from 'hepeinbaileys';

export default class MyPlugin extends BasePlugin {
  constructor() {
    super({
      name: 'mi-plugin',
      version: '1.0.0',
      description: 'Mi plugin personalizado'
    });

    this.addCommand({
      name: 'saludo',
      pattern: /^!saludo/,
      handler: async (ctx) => {
        await ctx.reply('¡Hola! 👋');
      }
    });
  }
}
```

### 👥 **Group Handler - Gestión Profesional de Grupos**

```typescript
const groupHandler = bot.groupHandler;

// Crear grupo
const group = await groupHandler.createGroup(
  'Mi Grupo',
  ['51987654321@s.whatsapp.net']
);

// Gestión de miembros
await groupHandler.addParticipants(groupId, [jid1, jid2]);
await groupHandler.promoteToAdmin(groupId, [jid1]);
await groupHandler.banUser(groupId, jid2, 'Spam');

// Mencionar a todos
await groupHandler.mentionEveryone(groupId, '¡Atención todos! 📢');

// Estadísticas
const stats = await groupHandler.getGroupStats(groupId);
console.log(stats); 
// { totalParticipants: 50, totalAdmins: 3, botIsAdmin: true }
```

**20+ métodos disponibles:**
- Crear/modificar grupos
- Gestión de participantes
- Promoción/degradación de admins
- Links de invitación
- Configuración avanzada
- Moderación automática
- Blacklist de usuarios

### 💾 **Sistema de Caché - Alto Rendimiento**

```typescript
const bot = new HepeinBaileys({
  cache: {
    enabled: true,
    type: 'redis', // 'memory', 'redis', 'file'
    maxSize: 10000,
    ttl: 3600,
    redis: {
      host: 'localhost',
      port: 6379
    }
  }
});

// Uso automático
const message = await bot.cache.getMessage(messageKey);
const contact = await bot.cache.getContactInfo(jid);
const group = await bot.cache.getGroupInfo(groupId);

// Stats
const stats = await bot.cache.getStats();
// { hits: 850, misses: 150, hitRate: 85, size: 1000 }
```

**Características:**
- ✅ Múltiples backends (Memory, Redis, File)
- ✅ TTL (Time To Live) configurable
- ✅ LRU eviction automática
- ✅ Estadísticas en tiempo real
- ✅ Patrón getOrSet
- ✅ Cleanup automático

### 📬 **Cola de Mensajes - Envío Confiable**

```typescript
const bot = new HepeinBaileys({
  queue: {
    enabled: true,
    processing: {
      concurrency: 5,
      rateLimit: 10, // 10 por segundo
      batchSize: 100,
      batchDelay: 1000
    }
  }
});

// Agregar a la cola
await bot.queue.add({
  type: 'send',
  data: {
    to: jid,
    message: { text: 'Hola!' }
  },
  priority: 5,
  delay: 2000,
  attempts: 3
});

// Envío masivo
await bot.queue.addBulk(
  contacts.map(contact => ({
    type: 'send',
    data: { to: contact, message: { text: 'Newsletter' } }
  }))
);

// Stats
const stats = await bot.queue.getStats();
// { waiting: 50, active: 5, completed: 1000, failed: 10 }
```

**Características:**
- ✅ Prioridades (1-10)
- ✅ Reintentos automáticos con backoff
- ✅ Rate limiting inteligente
- ✅ Procesamiento por lotes
- ✅ Delays programados
- ✅ Pause/Resume
- ✅ Eventos en tiempo real

### 📊 **Métricas y Monitoreo**

```typescript
const bot = new HepeinBaileys({
  metrics: {
    enabled: true,
    detailed: true
  }
});

// Métricas automáticas
bot.metrics.increment('messages.received');
bot.metrics.gauge('connections.active', 1);
bot.metrics.histogram('message.latency', 150);

// Timing de operaciones
const result = await bot.metrics.measureTime(
  'database.query',
  () => database.query('SELECT * FROM users')
);

// Export Prometheus
const metrics = bot.metrics.exportPrometheus();

// Dashboard
const summary = bot.metrics.getSummary();
/*
{
  system: { uptime: 86400, memory: { used: 150MB, total: 512MB } },
  messages: { received: 10000, sent: 8500, errors: 15, successRate: 99.8 },
  cache: { hits: 8500, misses: 1500, hitRate: 85 },
  queue: { waiting: 10, active: 5, completed: 9985 }
}
*/
```

### 🎛️ **Middleware Stack**

```typescript
// Logging middleware
bot.middleware.use(async (ctx, next) => {
  console.log(`[${ctx.from}] ${ctx.text}`);
  await next();
});

// Authentication
bot.middleware.use(async (ctx, next) => {
  if (await isAuthorized(ctx.from)) {
    await next();
  } else {
    await ctx.reply('No autorizado');
  }
});

// Rate limiting
bot.middleware.use(async (ctx, next) => {
  if (await checkRateLimit(ctx.from)) {
    await next();
  } else {
    await ctx.reply('Demasiados mensajes, espera un momento');
  }
});

// Error handling
bot.middleware.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    console.error('Error:', error);
    await ctx.reply('Ocurrió un error');
  }
});
```

### 🔐 **Seguridad y Validación**

```typescript
import { Validator, Formatter, MessageValidator } from 'hepeinbaileys';

// Validar números
Validator.isValidNumber('51987654321'); // true
Validator.isValidJID('51987654321@s.whatsapp.net'); // true

// Formatear
Formatter.toJID('51987654321'); // '51987654321@s.whatsapp.net'
Formatter.formatNumber('51987654321'); // '+51 987 654 321'

// Validar mensajes
MessageValidator.isSpam(message); // Detecta spam
MessageValidator.hasInappropriateContent(message, blacklist);

// Extraer información
MessageValidator.extractURLs(text);
MessageValidator.extractMentions(text);
MessageValidator.extractPhoneNumbers(text);
```

---

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18.x o superior
- npm, yarn o pnpm
- TypeScript 5.x (opcional)

### Instalación Rápida

```bash
# Instalar
npm install hepeinbaileys

# Crear bot básico
npx hepeinbaileys init my-bot

# Ejecutar
cd my-bot
npm start
```

---

## 📦 Instalación

### NPM

```bash
npm install hepeinbaileys
```

### Yarn

```bash
yarn add hepeinbaileys
```

### PNPM

```bash
pnpm add hepeinbaileys
```

### Desde GitHub

```bash
npm install github:Brashkie/HepeinBaileys
```

---

## 💡 Ejemplos de Uso

### Bot Básico

```typescript
import { HepeinBaileys } from 'hepeinbaileys';

const bot = new HepeinBaileys({
  auth: {
    type: 'multi-file',
    folder: './auth_info'
  },
  logger: {
    level: 'info'
  }
});

// Iniciar bot
await bot.initialize();

// Escuchar mensajes
bot.on('message', async (message) => {
  const { from, text, reply } = message;
  
  console.log(`[${from}] ${text}`);
  
  if (text === '!ping') {
    await reply('🏓 Pong!');
  }
});

// Conectar
await bot.connect();
```

### Bot con IA

```typescript
import { HepeinBaileys } from 'hepeinbaileys';

const bot = new HepeinBaileys({
  ai: {
    enabled: true,
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4',
    autoReply: {
      enabled: true,
      patterns: [/¿.*\?/, /ayuda/i, /consulta/i],
      context: 'Eres un asistente virtual amigable y profesional.'
    }
  }
});

await bot.initialize();

// Comandos con IA
bot.on('message', async ({ text, reply }) => {
  // Auto-responde automáticamente con IA si match patterns
  
  // Comando manual
  if (text.startsWith('!ai ')) {
    const question = text.slice(4);
    const response = await bot.ai.generateResponse(question);
    await reply(response);
  }
  
  // Traducir
  if (text.startsWith('!translate ')) {
    const [lang, ...words] = text.slice(11).split(' ');
    const translated = await bot.ai.translate(
      words.join(' '),
      lang
    );
    await reply(translated);
  }
  
  // Análisis de sentimientos
  if (text.startsWith('!sentiment ')) {
    const toAnalyze = text.slice(11);
    const result = await bot.ai.analyzeSentiment(toAnalyze);
    await reply(
      `Sentimiento: ${result.sentiment} (${result.confidence}%)`
    );
  }
});

await bot.connect();
```

### Bot de Grupos

```typescript
import { HepeinBaileys } from 'hepeinbaileys';

const bot = new HepeinBaileys({
  /* config */
});

await bot.initialize();

bot.on('message', async ({ text, from, isGroup, groupId, reply }) => {
  if (!isGroup) return;
  
  const group = bot.groupHandler;
  
  // Crear grupo
  if (text === '!creategroup') {
    const newGroup = await group.createGroup(
      'Mi Nuevo Grupo',
      [from] // Agregar al remitente
    );
    await reply(`Grupo creado: ${newGroup.gid}`);
  }
  
  // Info del grupo
  if (text === '!groupinfo') {
    const stats = await group.getGroupStats(groupId);
    await reply(
      `📊 Estadísticas:\n` +
      `👥 Participantes: ${stats.totalParticipants}\n` +
      `👑 Admins: ${stats.totalAdmins}\n` +
      `🤖 Bot es admin: ${stats.botIsAdmin ? 'Sí' : 'No'}`
    );
  }
  
  // Mencionar a todos (solo admins)
  if (text.startsWith('!everyone ')) {
    const isAdmin = await group.isAdmin(groupId, from);
    if (!isAdmin) {
      await reply('❌ Solo admins pueden usar este comando');
      return;
    }
    
    const message = text.slice(10);
    await group.mentionEveryone(groupId, message);
  }
  
  // Banear usuario (solo admins)
  if (text.startsWith('!ban @')) {
    const isAdmin = await group.isAdmin(groupId, from);
    if (!isAdmin) {
      await reply('❌ Solo admins');
      return;
    }
    
    const mentions = message.mentions;
    if (mentions.length > 0) {
      await group.banUser(groupId, mentions[0], 'Baneado por admin');
      await reply('✅ Usuario baneado');
    }
  }
  
  // Cambiar nombre
  if (text.startsWith('!setname ')) {
    const newName = text.slice(9);
    await group.updateGroupName(groupId, newName);
    await reply(`✅ Nombre cambiado a: ${newName}`);
  }
  
  // Link de invitación
  if (text === '!link') {
    const link = await group.getInviteLink(groupId);
    await reply(`🔗 Link: ${link}`);
  }
});

await bot.connect();
```

### Bot con Plugins

```typescript
import { HepeinBaileys } from 'hepeinbaileys';

const bot = new HepeinBaileys({
  /* config */
});

await bot.initialize();

// Cargar plugins
await bot.plugins.loadPlugin('utils');
await bot.plugins.loadPlugin('music');
await bot.plugins.loadPlugin('games');

// Ver plugins cargados
console.log(bot.plugins.getStats());
// { loaded: 3, plugins: ['utils', 'music', 'games'] }

bot.on('message', async ({ text, reply }) => {
  // Los comandos de plugins se ejecutan automáticamente
  // !ping, !info, !calc, etc.
  
  // Ejecutar comando manualmente
  if (text.startsWith('!')) {
    const executed = await bot.plugins.executeCommand(text, {
      socket: bot.socket,
      message,
      reply
    });
    
    if (!executed) {
      await reply('❌ Comando no encontrado');
    }
  }
  
  // Listar comandos disponibles
  if (text === '!plugins') {
    const stats = bot.plugins.getStats();
    await reply(
      `🔌 Plugins cargados: ${stats.loaded}\n` +
      `📝 Comandos: ${stats.commands}\n` +
      `📋 Lista: ${stats.plugins.join(', ')}`
    );
  }
  
  // Recargar plugin (hot-reload)
  if (text.startsWith('!reload ')) {
    const pluginName = text.slice(8);
    await bot.plugins.reloadPlugin(pluginName);
    await reply(`✅ Plugin ${pluginName} recargado`);
  }
});

await bot.connect();

// Crear tu propio plugin
// plugins/mi-plugin.ts
import { BasePlugin, createCommand } from 'hepeinbaileys';

export default class MiPlugin extends BasePlugin {
  constructor() {
    super({
      name: 'mi-plugin',
      version: '1.0.0',
      description: 'Mi plugin personalizado',
      author: 'Tu Nombre'
    });
    
    // Comando simple
    this.addCommand(createCommand({
      name: 'hola',
      aliases: ['hi', 'hello'],
      description: 'Saluda al usuario',
      pattern: /^!(hola|hi|hello)$/i,
      handler: async (ctx) => {
        await ctx.reply(`¡Hola ${ctx.from}! 👋`);
      }
    }));
    
    // Comando con argumentos
    this.addCommand(createCommand({
      name: 'suma',
      pattern: /^!suma (\d+) (\d+)$/,
      handler: async (ctx) => {
        const [, a, b] = ctx.text.match(/^!suma (\d+) (\d+)$/);
        const result = parseInt(a) + parseInt(b);
        await ctx.reply(`${a} + ${b} = ${result}`);
      }
    }));
  }
  
  async initialize(socket: any) {
    console.log('Mi plugin inicializado');
  }
  
  async cleanup() {
    console.log('Mi plugin limpiado');
  }
}
```

### Envío Masivo

```typescript
import { HepeinBaileys } from 'hepeinbaileys';

const bot = new HepeinBaileys({
  queue: {
    enabled: true,
    processing: {
      concurrency: 5,
      rateLimit: 10,
      batchSize: 100
    }
  }
});

await bot.initialize();
await bot.connect();

// Lista de contactos
const contacts = [
  '51987654321@s.whatsapp.net',
  '51987654322@s.whatsapp.net',
  // ... más contactos
];

// Mensaje a enviar
const message = {
  text: '¡Hola! Este es un mensaje masivo 📢'
};

// Agregar todos a la cola
await bot.queue.addBulk(
  contacts.map(contact => ({
    type: 'send',
    data: {
      to: contact,
      message
    },
    priority: 5,
    attempts: 3
  }))
);

console.log('✅ Mensajes agregados a la cola');

// Monitorear progreso
setInterval(async () => {
  const stats = await bot.queue.getStats();
  console.log(`
    📊 Progreso:
    ⏳ En espera: ${stats.waiting}
    🔄 Procesando: ${stats.active}
    ✅ Completados: ${stats.completed}
    ❌ Fallidos: ${stats.failed}
    📈 Tasa de éxito: ${stats.successRate.toFixed(2)}%
  `);
}, 5000);

// Eventos de la cola
bot.queue.on('completed', (job) => {
  console.log(`✅ Mensaje enviado a ${job.data.to}`);
});

bot.queue.on('failed', (job, error) => {
  console.error(`❌ Falló envío a ${job.data.to}:`, error);
});
```

### Bot Completo con Todas las Features

```typescript
import { HepeinBaileys } from 'hepeinbaileys';

const bot = new HepeinBaileys({
  // Autenticación
  auth: {
    type: 'multi-file',
    folder: './auth_info'
  },
  
  // Logger
  logger: {
    level: 'info',
    file: './logs/bot.log'
  },
  
  // Caché
  cache: {
    enabled: true,
    type: 'redis',
    maxSize: 10000,
    ttl: 3600,
    redis: {
      host: 'localhost',
      port: 6379
    }
  },
  
  // Cola
  queue: {
    enabled: true,
    processing: {
      concurrency: 5,
      rateLimit: 10,
      batchSize: 100
    }
  },
  
  // Métricas
  metrics: {
    enabled: true,
    detailed: true
  },
  
  // IA
  ai: {
    enabled: true,
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    autoReply: {
      enabled: true,
      patterns: [/¿.*\?/, /ayuda/i]
    }
  }
});

// Middleware
bot.middleware.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  bot.metrics.histogram('message.processing_time', duration);
});

bot.middleware.use(async (ctx, next) => {
  console.log(`[${ctx.from}] ${ctx.text}`);
  await next();
});

// Inicializar
await bot.initialize();

// Cargar plugins
await bot.plugins.loadPlugins(['utils', 'music', 'games']);

// Comandos
bot.on('message', async (ctx) => {
  const { text, reply } = ctx;
  
  // Stats del bot
  if (text === '!stats') {
    const summary = bot.metrics.getSummary();
    await reply(
      `📊 Estadísticas del Bot:\n\n` +
      `⏱️ Uptime: ${formatUptime(summary.system.uptime)}\n` +
      `💾 Memoria: ${summary.system.memory.used}/${summary.system.memory.total}\n` +
      `📨 Mensajes recibidos: ${summary.messages.received}\n` +
      `📤 Mensajes enviados: ${summary.messages.sent}\n` +
      `✅ Tasa de éxito: ${summary.messages.successRate}%\n` +
      `💾 Cache hit rate: ${summary.cache.hitRate}%\n` +
      `📬 Cola: ${summary.queue.waiting} esperando`
    );
  }
});

// Conectar
await bot.connect();

console.log('✅ Bot iniciado correctamente');
console.log('📊 Dashboard: http://localhost:3000/metrics');
```

---

## 🎨 Características Avanzadas

### Reconexión Inteligente

```typescript
const bot = new HepeinBaileys({
  connection: {
    retries: 5,
    retryDelay: 3000,
    backoff: 'exponential' // 3s, 6s, 12s, 24s, 48s
  }
});

bot.on('connection.update', (update) => {
  if (update.connection === 'close') {
    console.log('Conexión cerrada, reconectando...');
  }
  if (update.connection === 'open') {
    console.log('✅ Conectado correctamente');
  }
});
```

### WhatsApp Business

```typescript
const bot = new HepeinBaileys({
  business: {
    enabled: true,
    profile: {
      name: 'Mi Negocio',
      category: 'Tecnología',
      description: 'Servicios de desarrollo',
      email: 'contacto@minegocio.com',
      website: 'https://minegocio.com',
      address: 'Lima, Perú'
    }
  }
});

// Actualizar perfil
await bot.business.updateProfile({
  description: 'Nueva descripción'
});

// Enviar mensaje de producto
await bot.sendMessage(jid, {
  product: {
    productId: '123',
    title: 'Mi Producto',
    description: 'Descripción del producto',
    price: '100.00',
    currency: 'PEN',
    image: Buffer.from(...)
  }
});
```

### Eventos Disponibles

```typescript
// Mensajes
bot.on('message', (ctx) => {});
bot.on('message.text', (ctx) => {});
bot.on('message.image', (ctx) => {});
bot.on('message.video', (ctx) => {});
bot.on('message.audio', (ctx) => {});
bot.on('message.document', (ctx) => {});

// Grupos
bot.on('group.join', (ctx) => {});
bot.on('group.leave', (ctx) => {});
bot.on('group.promote', (ctx) => {});
bot.on('group.demote', (ctx) => {});
bot.on('group.update', (ctx) => {});

// Conexión
bot.on('connection.update', (update) => {});
bot.on('connection.error', (error) => {});
bot.on('qr', (qr) => {});

// Presencia
bot.on('presence.update', (update) => {});

// Llamadas
bot.on('call', (call) => {});
```

---

## 🛠️ Configuración

### Configuración Completa

```typescript
import { HepeinBaileysConfig } from 'hepeinbaileys';

const config: HepeinBaileysConfig = {
  // Auth
  auth: {
    type: 'multi-file', // 'multi-file' | 'single' | 'database'
    folder: './auth_info',
    creds: './creds.json',
    database: {
      type: 'mongodb',
      url: 'mongodb://localhost:27017/whatsapp'
    }
  },
  
  // Logger
  logger: {
    level: 'info', // 'trace' | 'debug' | 'info' | 'warn' | 'error'
    file: './logs/bot.log',
    maxSize: '10MB',
    maxFiles: 5
  },
  
  // Connection
  connection: {
    retries: 5,
    retryDelay: 3000,
    timeout: 30000,
    keepAlive: true,
    backoff: 'exponential'
  },
  
  // Cache
  cache: {
    enabled: true,
    type: 'memory', // 'memory' | 'redis' | 'file'
    maxSize: 10000,
    ttl: 3600,
    redis: {
      host: 'localhost',
      port: 6379,
      password: 'secret',
      db: 0
    },
    file: {
      path: './cache'
    }
  },
  
  // Queue
  queue: {
    enabled: true,
    type: 'memory', // 'memory' | 'redis' | 'bullmq'
    processing: {
      concurrency: 5,
      rateLimit: 10,
      batchSize: 100,
      batchDelay: 1000
    },
    redis: {
      host: 'localhost',
      port: 6379
    }
  },
  
  // Metrics
  metrics: {
    enabled: true,
    detailed: true,
    interval: 60000,
    prometheus: {
      enabled: true,
      port: 9090
    }
  },
  
  // AI
  ai: {
    enabled: true,
    provider: 'openai', // 'openai' | 'anthropic' | 'google' | 'custom'
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4',
    autoReply: {
      enabled: true,
      patterns: [/¿.*\?/, /ayuda/i],
      context: 'Eres un asistente virtual amigable.'
    },
    temperature: 0.7,
    maxTokens: 1000
  },
  
  // Business
  business: {
    enabled: false,
    profile: {
      name: 'Mi Negocio',
      category: 'Tecnología',
      description: 'Descripción',
      email: 'contact@example.com',
      website: 'https://example.com',
      address: 'Dirección'
    }
  }
};

const bot = new HepeinBaileys(config);
```

### Variables de Entorno

```bash
# .env
NODE_ENV=production

# WhatsApp
WA_AUTH_FOLDER=./auth_info
WA_LOG_LEVEL=info

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=secret

# AI
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AI...

# Metrics
METRICS_ENABLED=true
PROMETHEUS_PORT=9090

# Business
BUSINESS_ENABLED=false
BUSINESS_NAME=Mi Negocio
```

---

## 📊 Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    HepeinBaileys Core                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐ │
│  │  Connection   │  │     Auth      │  │   Logger    │ │
│  │   Manager     │  │   Manager     │  │   System    │ │
│  └───────────────┘  └───────────────┘  └─────────────┘ │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                    Services Layer                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐ │
│  │     Cache     │  │     Queue     │  │   Metrics   │ │
│  │    Manager    │  │    Manager    │  │   Manager   │ │
│  └───────────────┘  └───────────────┘  └─────────────┘ │
│                                                          │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐ │
│  │  AI Service   │  │    Plugin     │  │    Group    │ │
│  │  (Multi-LLM)  │  │    Manager    │  │   Handler   │ │
│  └───────────────┘  └───────────────┘  └─────────────┘ │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                   Processing Layer                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐ │
│  │  Middleware   │  │   Message     │  │   Event     │ │
│  │     Stack     │  │   Handler     │  │  Emitter    │ │
│  └───────────────┘  └───────────────┘  └─────────────┘ │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                   Utils & Helpers                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Validators  │  Formatters  │  Crypto  │  File Utils   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Flujo de Mensajes

```
1. WhatsApp → Baileys Socket
2. Socket → Connection Manager
3. Connection Manager → Message Handler
4. Message Handler → Middleware Stack
   ├─ Logging Middleware
   ├─ Auth Middleware
   ├─ Rate Limit Middleware
   └─ Custom Middleware
5. Middleware → Cache Check
6. Cache → AI Service (si aplica)
7. AI Service → Plugin Manager (si aplica)
8. Plugin Manager → User Handler
9. User Handler → Response
10. Response → Queue Manager
11. Queue → Socket
12. Socket → WhatsApp
```

---

## 🧪 Testing

### Ejecutar Tests

```bash
# Todos los tests
npm test

# Tests unitarios
npm run test:unit

# Tests de integración
npm run test:integration

# Tests E2E
npm run test:e2e

# Coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Estructura de Tests

```
tests/
├── unit/
│   ├── cache.test.ts           # 15 tests
│   ├── queue.test.ts           # 15 tests
│   ├── metrics.test.ts         # 20 tests
│   └── middleware.test.ts      # 15 tests
├── integration/
│   ├── connection.test.ts
│   └── messaging.test.ts
└── e2e/
    └── bot.test.ts
```

### Coverage

```
Coverage Summary:
- Lines: 75%
- Functions: 72%
- Branches: 68%
- Statements: 75%
```

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! 🎉

### Cómo Contribuir

1. **Fork** el repositorio
2. **Crea** una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. **Commit** tus cambios (`git commit -m 'feat: add amazing feature'`)
4. **Push** a la rama (`git push origin feature/amazing-feature`)
5. **Abre** un Pull Request

### Guidelines

- Escribe tests para nuevas funcionalidades
- Mantén el código limpio y documentado
- Sigue el estilo de código existente
- Actualiza la documentación si es necesario

### Reportar Bugs

Abre un issue con:
- Descripción clara del problema
- Pasos para reproducir
- Versión de Node.js y HepeinBaileys
- Logs relevantes

---

## 📄 Licencia

MIT License - Ver [LICENSE](LICENSE) para más detalles.

---

## 🙏 Créditos

- **Baileys** - Biblioteca base de WhatsApp Web
- **@whiskeysockets** - Creador original de Baileys
- **Brashkie** - Creador de HepeinBaileys
- **Hepein Oficial** - Marca tecnológica

---

## 🔗 Links

- 📚 [Documentación Completa](https://brashkie.github.io/HepeinBaileys)
- 💬 [Discord](https://discord.gg/hepein)
- 🐛 [Reportar Bug](https://github.com/Brashkie/HepeinBaileys/issues)
- ⭐ [GitHub](https://github.com/Brashkie/HepeinBaileys)
- 📦 [NPM](https://www.npmjs.com/package/hepeinbaileys)

---

## 📞 Soporte

¿Necesitas ayuda? Contáctanos:

- 📧 Email: soporte@hepein.com
- 💬 Discord: [Hepein Community](https://discord.gg/hepein)
- 🐦 Twitter: [@HepeinOficial](https://twitter.com/HepeinOficial)

---

<div align="center">

**Made with ❤️ by [Brashkie](https://github.com/Brashkie) | [Hepein Oficial](https://hepein.com)**

⭐ Si te gusta el proyecto, dale una estrella en GitHub!

</div>
