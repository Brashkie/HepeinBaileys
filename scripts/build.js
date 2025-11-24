#!/usr/bin/env node

/**
 * Build Script para HepeinBaileys
 * Automatiza el proceso de build completo
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colores para la terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.error(`${colors.red}✖${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) => console.log(`\n${colors.bright}${colors.blue}▶${colors.reset} ${msg}`),
};

// Ejecutar comando y mostrar output
function exec(command, options = {}) {
  try {
    execSync(command, {
      stdio: 'inherit',
      ...options,
    });
    return true;
  } catch (error) {
    return false;
  }
}

// Limpiar directorio
function cleanDir(dir) {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true, force: true });
    log.success(`Limpiado: ${dir}`);
  }
}

// Verificar que exista un archivo
function checkFile(file) {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) {
    log.error(`No existe: ${file}`);
    return false;
  }
  return true;
}

// Main build process
async function build() {
  console.log(`
${colors.bright}${colors.cyan}╔════════════════════════════════════════╗
║     HepeinBaileys Build Script        ║
╚════════════════════════════════════════╝${colors.reset}
  `);

  const startTime = Date.now();

  try {
    // 1. Verificar archivos necesarios
    log.step('1/6 Verificando archivos...');
    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'src/index.ts',
    ];

    for (const file of requiredFiles) {
      if (!checkFile(file)) {
        log.error('Faltan archivos necesarios para el build');
        process.exit(1);
      }
    }
    log.success('Archivos verificados');

    // 2. Limpiar directorios antiguos
    log.step('2/6 Limpiando directorios antiguos...');
    cleanDir('dist');
    cleanDir('.tsbuildinfo');

    // 3. Build CommonJS
    log.step('3/6 Building CommonJS...');
    if (!exec('tsc -p tsconfig.cjs.json')) {
      log.error('Error en build CommonJS');
      process.exit(1);
    }
    log.success('CommonJS build completado');

    // 4. Build ESM
    log.step('4/6 Building ESM...');
    if (!exec('tsc -p tsconfig.esm.json')) {
      log.error('Error en build ESM');
      process.exit(1);
    }
    log.success('ESM build completado');

    // 5. Build Types
    log.step('5/6 Building Types...');
    if (!exec('tsc -p tsconfig.types.json')) {
      log.error('Error en build Types');
      process.exit(1);
    }
    log.success('Types build completado');

    // 6. Verificar outputs
    log.step('6/6 Verificando outputs...');
    const outputs = ['dist/cjs', 'dist/esm', 'dist/types'];
    let allExist = true;

    for (const output of outputs) {
      if (fs.existsSync(path.join(process.cwd(), output))) {
        log.success(`✓ ${output}`);
      } else {
        log.error(`✗ ${output}`);
        allExist = false;
      }
    }

    if (!allExist) {
      log.error('Algunos outputs no se generaron correctamente');
      process.exit(1);
    }

    // Calcular tamaño del build
    const distPath = path.join(process.cwd(), 'dist');
    const getDirectorySize = (dir) => {
      let size = 0;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          size += getDirectorySize(filePath);
        } else {
          size += stats.size;
        }
      }
      return size;
    };

    const totalSize = getDirectorySize(distPath);
    const sizeMB = (totalSize / 1024 / 1024).toFixed(2);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Success message
    console.log(`
${colors.green}${colors.bright}╔════════════════════════════════════════╗
║          ✓ Build Exitoso!             ║
╚════════════════════════════════════════╝${colors.reset}

${colors.cyan}Estadísticas:${colors.reset}
  • Tiempo: ${duration}s
  • Tamaño: ${sizeMB} MB
  • Outputs: CJS, ESM, Types
  • Ubicación: ./dist/

${colors.cyan}Próximos pasos:${colors.reset}
  • npm run test       (Ejecutar tests)
  • npm publish        (Publicar a npm)
  • git tag v1.x.x     (Crear release)
    `);

    process.exit(0);
  } catch (error) {
    log.error(`Error inesperado: ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar build
build();
