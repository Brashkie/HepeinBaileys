#!/usr/bin/env node

/**
 * Setup Script para HepeinBaileys
 * Configura el proyecto automáticamente
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

// Colores para la terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.error(`${colors.red}✖${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) => console.log(`\n${colors.bright}${colors.blue}▶${colors.reset} ${msg}`),
};

// Crear interfaz para input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Función para preguntar
function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

// Crear directorio si no existe
function ensureDir(dir) {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    log.success(`Creado: ${dir}`);
  }
}

// Crear archivo si no existe
function ensureFile(file, content = '') {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, content);
    log.success(`Creado: ${file}`);
  }
}

// Ejecutar comando
function exec(command) {
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    return false;
  }
}

// Main setup
async function setup() {
  console.log(`
${colors.bright}${colors.magenta}╔════════════════════════════════════════╗
║    HepeinBaileys Setup Wizard         ║
║    Configuración Inicial del Bot      ║
╚════════════════════════════════════════╝${colors.reset}

${colors.cyan}Este asistente te ayudará a configurar tu bot de WhatsApp.${colors.reset}
  `);

  try {
    // 1. Verificar Node.js version
    log.step('1/8 Verificando Node.js...');
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

    if (majorVersion < 18) {
      log.error(`Node.js ${nodeVersion} no es compatible. Se requiere v18 o superior.`);
      process.exit(1);
    }
    log.success(`Node.js ${nodeVersion} ✓`);

    // 2. Crear estructura de directorios
    log.step('2/8 Creando estructura de directorios...');
    const dirs = [
      'auth_info',
      'logs',
      'cache',
      'plugins',
      'data',
      'uploads',
      'downloads',
    ];

    for (const dir of dirs) {
      ensureDir(dir);
    }

    // 3. Configurar .env
    log.step('3/8 Configurando variables de entorno...');
    
    const envExample = `# HepeinBaileys Configuration
# Copy this file to .env and fill in your values

# Node Environment
NODE_ENV=development

# WhatsApp Configuration
WA_AUTH_FOLDER=./auth_info
WA_LOG_LEVEL=info

# Cache Configuration
CACHE_ENABLED=true
CACHE_TYPE=memory
CACHE_MAX_SIZE=10000
CACHE_TTL=3600

# Redis Configuration (if using Redis cache)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Queue Configuration
QUEUE_ENABLED=true
QUEUE_CONCURRENCY=5
QUEUE_RATE_LIMIT=10

# Metrics Configuration
METRICS_ENABLED=true
PROMETHEUS_PORT=9090

# AI Configuration (Optional)
AI_ENABLED=false
AI_PROVIDER=openai
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=

# Business Configuration (Optional)
BUSINESS_ENABLED=false
BUSINESS_NAME=Mi Negocio
BUSINESS_CATEGORY=Tecnología
BUSINESS_EMAIL=contact@example.com
`;

    ensureFile('.env.example', envExample);

    if (!fs.existsSync('.env')) {
      console.log(`\n${colors.yellow}¿Deseas crear un archivo .env ahora? (s/n)${colors.reset}`);
      const createEnv = await question('> ');

      if (createEnv.toLowerCase() === 's' || createEnv.toLowerCase() === 'y') {
        // Preguntar configuración básica
        console.log(`\n${colors.cyan}Configuración básica:${colors.reset}`);

        const logLevel = await question('Nivel de log (info/debug/warn/error) [info]: ') || 'info';
        const cacheType = await question('Tipo de caché (memory/redis/file) [memory]: ') || 'memory';
        const aiEnabled = await question('¿Habilitar IA? (s/n) [n]: ') || 'n';

        let envContent = envExample.replace('NODE_ENV=development', 'NODE_ENV=development');
        envContent = envContent.replace('WA_LOG_LEVEL=info', `WA_LOG_LEVEL=${logLevel}`);
        envContent = envContent.replace('CACHE_TYPE=memory', `CACHE_TYPE=${cacheType}`);
        
        if (aiEnabled.toLowerCase() === 's' || aiEnabled.toLowerCase() === 'y') {
          envContent = envContent.replace('AI_ENABLED=false', 'AI_ENABLED=true');
          
          const aiProvider = await question('Proveedor de IA (openai/anthropic/google) [openai]: ') || 'openai';
          envContent = envContent.replace('AI_PROVIDER=openai', `AI_PROVIDER=${aiProvider}`);
          
          const apiKey = await question(`${aiProvider.toUpperCase()} API Key: `);
          const keyField = `${aiProvider.toUpperCase()}_API_KEY=`;
          envContent = envContent.replace(`${keyField}`, `${keyField}${apiKey}`);
        }

        fs.writeFileSync('.env', envContent);
        log.success('Archivo .env creado');
      }
    } else {
      log.info('.env ya existe, saltando...');
    }

    // 4. Configurar .gitignore
    log.step('4/8 Configurando .gitignore...');
    
    const gitignoreContent = `# Dependencies
node_modules/
package-lock.json

# Auth
auth_info/
auth_*/
*.json
!package.json
!tsconfig*.json

# Logs
logs/
*.log

# Cache
cache/

# Environment
.env
.env.local

# Build
dist/
build/
*.tsbuildinfo

# Data
data/
uploads/
downloads/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Testing
coverage/
.nyc_output/

# Misc
tmp/
temp/
`;

    if (!fs.existsSync('.gitignore')) {
      fs.writeFileSync('.gitignore', gitignoreContent);
      log.success('Archivo .gitignore creado');
    } else {
      log.info('.gitignore ya existe');
    }

    // 5. Configurar .npmrc
    log.step('5/8 Configurando .npmrc...');
    
    const npmrcContent = `package-lock=false
fund=false
audit=false
legacy-peer-deps=true
`;

    if (!fs.existsSync('.npmrc')) {
      fs.writeFileSync('.npmrc', npmrcContent);
      log.success('Archivo .npmrc creado');
    }

    // 6. Instalar dependencias
    log.step('6/8 Instalando dependencias...');
    console.log(`\n${colors.yellow}¿Deseas instalar las dependencias ahora? (s/n)${colors.reset}`);
    const installDeps = await question('> ');

    if (installDeps.toLowerCase() === 's' || installDeps.toLowerCase() === 'y') {
      log.info('Instalando dependencias (esto puede tardar un momento)...');
      if (exec('npm install')) {
        log.success('Dependencias instaladas');
      } else {
        log.error('Error al instalar dependencias');
      }
    }

    // 7. Crear ejemplo básico
    log.step('7/8 Creando ejemplo básico...');
    
    const basicExample = `import { HepeinBaileys } from './src';

async function main() {
  const bot = new HepeinBaileys({
    auth: {
      type: 'multi-file',
      folder: './auth_info'
    },
    logger: {
      level: 'info'
    }
  });

  await bot.initialize();

  bot.on('message', async ({ text, reply, from }) => {
    console.log(\`[\${from}] \${text}\`);

    if (text === '!ping') {
      await reply('🏓 Pong!');
    }

    if (text === '!hola') {
      await reply('¡Hola! 👋 Soy un bot de WhatsApp con HepeinBaileys');
    }
  });

  bot.on('connection.update', (update) => {
    if (update.connection === 'open') {
      console.log('✅ Bot conectado!');
    }
  });

  await bot.connect();
}

main().catch(console.error);
`;

    ensureFile('bot.example.ts', basicExample);

    // 8. Git init
    log.step('8/8 Inicializando Git...');
    
    if (!fs.existsSync('.git')) {
      console.log(`\n${colors.yellow}¿Deseas inicializar un repositorio Git? (s/n)${colors.reset}`);
      const initGit = await question('> ');

      if (initGit.toLowerCase() === 's' || initGit.toLowerCase() === 'y') {
        if (exec('git init')) {
          log.success('Repositorio Git inicializado');
          
          // Crear primer commit
          console.log(`\n${colors.yellow}¿Deseas hacer el primer commit? (s/n)${colors.reset}`);
          const firstCommit = await question('> ');
          
          if (firstCommit.toLowerCase() === 's' || firstCommit.toLowerCase() === 'y') {
            exec('git add .');
            exec('git commit -m "Initial commit - HepeinBaileys setup"');
            log.success('Primer commit creado');
          }
        }
      }
    } else {
      log.info('Git ya está inicializado');
    }

    // Mostrar resumen
    console.log(`
${colors.green}${colors.bright}╔════════════════════════════════════════╗
║       ✓ Setup Completado!             ║
╚════════════════════════════════════════╝${colors.reset}

${colors.cyan}Estructura creada:${colors.reset}
  ${colors.green}✓${colors.reset} auth_info/          (Autenticación)
  ${colors.green}✓${colors.reset} logs/               (Logs del bot)
  ${colors.green}✓${colors.reset} cache/              (Caché)
  ${colors.green}✓${colors.reset} plugins/            (Plugins personalizados)
  ${colors.green}✓${colors.reset} .env.example        (Ejemplo de configuración)
  ${colors.green}✓${colors.reset} .gitignore          (Git ignore)
  ${colors.green}✓${colors.reset} .npmrc              (NPM config)
  ${colors.green}✓${colors.reset} bot.example.ts      (Ejemplo de bot)

${colors.cyan}Próximos pasos:${colors.reset}

${colors.bright}1. Configurar variables de entorno:${colors.reset}
   ${colors.yellow}cp .env.example .env${colors.reset}
   ${colors.yellow}nano .env${colors.reset}

${colors.bright}2. Ejecutar el bot de ejemplo:${colors.reset}
   ${colors.yellow}npm run dev bot.example.ts${colors.reset}

${colors.bright}3. Escanear QR:${colors.reset}
   • Se mostrará un QR en la terminal
   • Escanéalo con WhatsApp Web
   • ¡Listo! Tu bot estará conectado

${colors.bright}4. Enviar comandos de prueba:${colors.reset}
   • !ping    (Responde con Pong!)
   • !hola    (Saludo del bot)

${colors.cyan}Documentación:${colors.reset}
  • README.md         (Guía completa)
  • docs/API.md       (Referencia de API)
  • docs/MIGRACION.md (Migrar desde Baileys)

${colors.cyan}Ayuda:${colors.reset}
  • Discord: https://discord.gg/hepein
  • GitHub:  https://github.com/Brashkie/HepeinBaileys
  • Issues:  https://github.com/Brashkie/HepeinBaileys/issues

${colors.green}¡Disfruta creando tu bot con HepeinBaileys!${colors.reset} 🚀
    `);

    rl.close();
    process.exit(0);
  } catch (error) {
    log.error(`Error inesperado: ${error.message}`);
    rl.close();
    process.exit(1);
  }
}

// Ejecutar setup
setup();
