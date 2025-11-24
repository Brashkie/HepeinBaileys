#!/usr/bin/env node

/**
 * Clean Script para HepeinBaileys
 * Limpia archivos temporales y builds
 */

const fs = require('fs');
const path = require('path');

// Colores
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  bright: '\x1b[1m',
};

console.log(`
${colors.bright}${colors.cyan}╔════════════════════════════════════════╗
║    HepeinBaileys Clean Script         ║
╚════════════════════════════════════════╝${colors.reset}
`);

// Directorios y archivos a limpiar
const toClean = [
  'dist',
  'build',
  'coverage',
  '.nyc_output',
  '*.tsbuildinfo',
  'node_modules/.cache',
  'logs/*.log',
  'cache/*',
  'tmp',
  'temp',
];

let cleaned = 0;

function cleanPath(pattern) {
  try {
    const fullPath = path.join(process.cwd(), pattern);
    
    // Manejar wildcards
    if (pattern.includes('*')) {
      const dir = path.dirname(fullPath);
      const filePattern = path.basename(pattern);
      
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        const regex = new RegExp(filePattern.replace('*', '.*'));
        
        files.forEach(file => {
          if (regex.test(file)) {
            const filePath = path.join(dir, file);
            fs.rmSync(filePath, { recursive: true, force: true });
            console.log(`${colors.green}✓${colors.reset} Eliminado: ${path.relative(process.cwd(), filePath)}`);
            cleaned++;
          }
        });
      }
    } else {
      // Directorio o archivo específico
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`${colors.green}✓${colors.reset} Eliminado: ${pattern}`);
        cleaned++;
      }
    }
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Error limpiando ${pattern}: ${error.message}`);
  }
}

// Limpiar cada patrón
toClean.forEach(cleanPath);

console.log(`
${colors.green}${colors.bright}╔════════════════════════════════════════╗
║     ✓ Limpieza Completada!            ║
╚════════════════════════════════════════╝${colors.reset}

${colors.cyan}Archivos/Directorios eliminados:${colors.reset} ${cleaned}

${colors.cyan}Para reconstruir el proyecto:${colors.reset}
  npm install
  npm run build
`);
