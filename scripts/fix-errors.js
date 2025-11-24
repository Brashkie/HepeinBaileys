#!/usr/bin/env node

/**
 * Fix TypeScript Errors - HepeinBaileys
 * Corrige automáticamente todos los errores de TypeScript
 */

const fs = require('fs');
const path = require('path');

const fixes = [
  // 1. CacheManager.ts - unused parameter
  {
    file: 'src/cache/CacheManager.ts',
    find: '      dispose: (value, key) => {',
    replace: '      dispose: (_value, key) => {'
  },
  
  // 2. CacheManager.ts - not all code paths return
  {
    file: 'src/cache/CacheManager.ts',
    find: '    const operations = messages.map((msg) => {',
    replace: '    const operations = messages.map((msg): Promise<void> => {'
  },
  
  // 3. HepeinBaileys.ts - remove makeInMemoryStore import
  {
    file: 'src/core/HepeinBaileys.ts',
    find: 'import {\n  makeWASocket,\n  DisconnectReason,\n  useMultiFileAuthState,\n  makeInMemoryStore,',
    replace: 'import {\n  makeWASocket,\n  DisconnectReason,\n  useMultiFileAuthState,'
  },
  
  // 4. HepeinBaileys.ts - remove Middleware unused import
  {
    file: 'src/core/HepeinBaileys.ts',
    find: 'import type {\n  ConnectionState,\n  WAMessage,\n  GroupMetadata,\n  Middleware,',
    replace: 'import type {\n  ConnectionState,\n  WAMessage,\n  GroupMetadata,'
  },
  
  // 5. HepeinBaileys.ts - remove nanoid import
  {
    file: 'src/core/HepeinBaileys.ts',
    find: "import { nanoid } from 'nanoid';",
    replace: "// import { nanoid } from 'nanoid'; // Unused"
  },
  
  // 6. index.ts - remove makeInMemoryStore export
  {
    file: 'src/index.ts',
    find: 'export {\n  makeWASocket,\n  DisconnectReason,\n  useMultiFileAuthState,\n  makeInMemoryStore,',
    replace: 'export {\n  makeWASocket,\n  DisconnectReason,\n  useMultiFileAuthState,'
  },
  
  // 7. index.ts - fix type exports
  {
    file: 'src/index.ts',
    find: '  WASocket,\n  ConnectionState,\n  WAMessage,',
    replace: ''
  },
  
  // 8. validators.ts - remove duplicate exports
  {
    file: 'src/utils/validators.ts',
    find: 'export {\n  WhatsAppValidator,\n  WhatsAppFormatter,\n  MessageValidator,\n  TextUtils,\n  ArrayUtils,\n  DateUtils,\n};',
    replace: ''
  },
  
  // 9. MiddlewareStack.ts - unused parameters
  {
    file: 'src/middleware/MiddlewareStack.ts',
    find: '  return async (context, next) => {',
    replace: '  return async (_context, next) => {'
  },
  
  // 10. PluginManager.ts - unused parameters
  {
    file: 'src/plugins/PluginManager.ts',
    find: '    for (const [name, command] of this.commands) {',
    replace: '    for (const [_name, command] of this.commands) {'
  },
  
  // 11. AIService.ts - unused logger
  {
    file: 'src/services/AIService.ts',
    find: '  private logger: Logger;',
    replace: '  // private logger: Logger; // Unused'
  }
];

console.log('🔧 Corrigiendo errores de TypeScript...\n');

let fixed = 0;
let errors = 0;

for (const fix of fixes) {
  try {
    const filePath = path.join(__dirname, '..', fix.file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Archivo no encontrado: ${fix.file}`);
      continue;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes(fix.find)) {
      content = content.replace(fix.find, fix.replace);
      fs.writeFileSync(filePath, content);
      console.log(`✅ ${fix.file}`);
      fixed++;
    } else {
      console.log(`⏭️  Ya aplicado: ${fix.file}`);
    }
  } catch (error) {
    console.error(`❌ Error en ${fix.file}: ${error.message}`);
    errors++;
  }
}

console.log(`\n📊 Resultado: ${fixed} fixes aplicados, ${errors} errores`);
