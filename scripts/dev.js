#!/usr/bin/env node

/**
 * Dev Script para HepeinBaileys
 * Ejecuta el bot en modo desarrollo con hot-reload
 */

const { spawn } = require('child_process');
const path = require('path');

// Colores
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  bright: '\x1b[1m',
};

console.log(`
${colors.bright}${colors.cyan}╔════════════════════════════════════════╗
║    HepeinBaileys Dev Server           ║
╚════════════════════════════════════════╝${colors.reset}
`);

// Obtener archivo a ejecutar
const file = process.argv[2] || 'examples/basic.ts';
const fullPath = path.join(process.cwd(), file);

console.log(`${colors.cyan}Archivo:${colors.reset} ${file}`);
console.log(`${colors.cyan}Modo:${colors.reset} Desarrollo (hot-reload)`);
console.log(`${colors.yellow}Presiona Ctrl+C para detener${colors.reset}\n`);

// Ejecutar con tsx watch
const child = spawn('tsx', ['watch', fullPath], {
  stdio: 'inherit',
  shell: true,
});

child.on('error', (error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log(`\n${colors.green}Dev server detenido${colors.reset}`);
  process.exit(code || 0);
});

// Manejar señales
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Deteniendo dev server...${colors.reset}`);
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});
