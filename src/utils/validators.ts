/**
 * Utilidades avanzadas de validación y formateo
 */

/**
 * Validador de números de WhatsApp
 */
export class WhatsAppValidator {
  /**
   * Validar número de WhatsApp
   */
  static isValidNumber(number: string): boolean {
    const cleaned = number.replace(/\D/g, '');
    return /^\d{10,15}$/.test(cleaned);
  }

  /**
   * Validar JID
   */
  static isValidJID(jid: string): boolean {
    return /^\d+@(s\.whatsapp\.net|g\.us)$/.test(jid);
  }

  /**
   * Validar JID de grupo
   */
  static isGroupJID(jid: string): boolean {
    return jid.endsWith('@g.us');
  }

  /**
   * Validar JID de usuario
   */
  static isUserJID(jid: string): boolean {
    return jid.endsWith('@s.whatsapp.net');
  }

  /**
   * Validar código de invitación
   */
  static isValidInviteCode(code: string): boolean {
    return /^[A-Za-z0-9]{20,25}$/.test(code);
  }

  /**
   * Validar URL de WhatsApp
   */
  static isWhatsAppURL(url: string): boolean {
    return /^https?:\/\/(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\//.test(url);
  }
}

/**
 * Formateador de números y JIDs
 */
export class WhatsAppFormatter {
  /**
   * Formatear número a JID
   */
  static toJID(number: string): string {
    const cleaned = number.replace(/\D/g, '');
    return `${cleaned}@s.whatsapp.net`;
  }

  /**
   * Formatear a JID de grupo
   */
  static toGroupJID(id: string): string {
    return `${id}@g.us`;
  }

  /**
   * Extraer número de JID
   */
  static fromJID(jid: string): string {
    return jid.split('@')[0] || '';
  }

  /**
   * Formatear número para mostrar
   */
  static formatNumber(number: string): string {
    const cleaned = number.replace(/\D/g, '');
    
    if (cleaned.length === 11) {
      // Formato: +51 987 654 321
      return `+${cleaned.substring(0, 2)} ${cleaned.substring(2, 5)} ${cleaned.substring(5, 8)} ${cleaned.substring(8)}`;
    }

    // Formato genérico
    return `+${cleaned}`;
  }

  /**
   * Formatear link de WhatsApp
   */
  static formatWhatsAppLink(number: string, message?: string): string {
    const cleaned = number.replace(/\D/g, '');
    const base = `https://wa.me/${cleaned}`;
    
    if (message) {
      return `${base}?text=${encodeURIComponent(message)}`;
    }

    return base;
  }

  /**
   * Formatear duración en texto legible
   */
  static formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Formatear tamaño de archivo
   */
  static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Formatear fecha relativa
   */
  static formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return new Date(timestamp).toLocaleDateString();
    }
    if (days > 0) {
      return `hace ${days} día${days > 1 ? 's' : ''}`;
    }
    if (hours > 0) {
      return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
    }
    if (minutes > 0) {
      return `hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    }
    return 'hace un momento';
  }

  /**
   * Sanitizar texto para WhatsApp
   */
  static sanitizeText(text: string): string {
    return text
      .trim()
      .substring(0, 65536) // Límite de WhatsApp
      .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remover caracteres invisibles
  }

  /**
   * Formatear texto en negrita
   */
  static bold(text: string): string {
    return `*${text}*`;
  }

  /**
   * Formatear texto en cursiva
   */
  static italic(text: string): string {
    return `_${text}_`;
  }

  /**
   * Formatear texto tachado
   */
  static strikethrough(text: string): string {
    return `~${text}~`;
  }

  /**
   * Formatear texto monoespaciado
   */
  static monospace(text: string): string {
    return `\`\`\`${text}\`\`\``;
  }

  /**
   * Crear mención
   */
  static mention(jid: string, name?: string): string {
    const number = this.fromJID(jid);
    return `@${name || number}`;
  }
}

/**
 * Validador de mensajes
 */
export class MessageValidator {
  /**
   * Validar longitud de mensaje
   */
  static isValidLength(text: string): boolean {
    return text.length > 0 && text.length <= 65536;
  }

  /**
   * Detectar spam
   */
  static isSpam(text: string): boolean {
    // Detectar repetición excesiva de caracteres
    if (/(.)\1{10,}/.test(text)) {
      return true;
    }

    // Detectar mayúsculas excesivas
    const upperCount = (text.match(/[A-Z]/g) || []).length;
    if (upperCount > text.length * 0.7 && text.length > 20) {
      return true;
    }

    // Detectar URLs excesivas
    const urlCount = (text.match(/https?:\/\//g) || []).length;
    if (urlCount > 3) {
      return true;
    }

    return false;
  }

  /**
   * Detectar contenido inapropiado (palabras clave)
   */
  static hasInappropriateContent(
    text: string,
    blacklist: string[]
  ): boolean {
    const lowerText = text.toLowerCase();
    return blacklist.some((word) => lowerText.includes(word.toLowerCase()));
  }

  /**
   * Validar comando
   */
  static isValidCommand(text: string, prefix: string = '!'): boolean {
    return text.startsWith(prefix) && text.length > prefix.length;
  }

  /**
   * Extraer comando y argumentos
   */
  static parseCommand(
    text: string,
    prefix: string = '!'
  ): { command: string; args: string[] } | null {
    if (!this.isValidCommand(text, prefix)) {
      return null;
    }

    const parts = text.slice(prefix.length).trim().split(/\s+/);
    const command = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    return { command: command || '', args };
  }

  /**
   * Detectar menciones en texto
   */
  static extractMentions(text: string): string[] {
    const mentions = text.match(/@\d+/g) || [];
    return mentions.map((m) => `${m.substring(1)}@s.whatsapp.net`);
  }

  /**
   * Detectar URLs en texto
   */
  static extractURLs(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  }

  /**
   * Detectar emails en texto
   */
  static extractEmails(text: string): string[] {
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
    return text.match(emailRegex) || [];
  }

  /**
   * Detectar números de teléfono
   */
  static extractPhoneNumbers(text: string): string[] {
    const phoneRegex = /\+?\d{10,15}/g;
    return text.match(phoneRegex) || [];
  }
}

/**
 * Utilidades de texto
 */
export class TextUtils {
  /**
   * Truncar texto
   */
  static truncate(text: string, maxLength: number, suffix: string = '...'): string {
    if (text.length <= maxLength) {
      return text;
    }

    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  /**
   * Capitalizar primera letra
   */
  static capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  /**
   * Capitalizar cada palabra
   */
  static titleCase(text: string): string {
    return text
      .split(' ')
      .map((word) => this.capitalize(word))
      .join(' ');
  }

  /**
   * Convertir a slug
   */
  static slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Contar palabras
   */
  static countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  /**
   * Contar caracteres (sin espacios)
   */
  static countCharacters(text: string): number {
    return text.replace(/\s/g, '').length;
  }

  /**
   * Generar extracto
   */
  static excerpt(text: string, wordCount: number = 50): string {
    const words = text.split(/\s+/);
    
    if (words.length <= wordCount) {
      return text;
    }

    return words.slice(0, wordCount).join(' ') + '...';
  }

  /**
   * Remover acentos
   */
  static removeAccents(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Escapar caracteres especiales de regex
   */
  static escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Generar hash simple de texto
   */
  static simpleHash(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

/**
 * Utilidades de array
 */
export class ArrayUtils {
  /**
   * Chunkar array
   */
  static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Barajar array (shuffle)
   */
  static shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    return shuffled;
  }

  /**
   * Obtener elementos únicos
   */
  static unique<T>(array: T[]): T[] {
    return [...new Set(array)];
  }

  /**
   * Obtener elemento aleatorio
   */
  static random<T>(array: T[]): T | undefined {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Dividir array en dos grupos
   */
  static partition<T>(
    array: T[],
    predicate: (item: T) => boolean
  ): [T[], T[]] {
    const truthy: T[] = [];
    const falsy: T[] = [];

    for (const item of array) {
      if (predicate(item)) {
        truthy.push(item);
      } else {
        falsy.push(item);
      }
    }

    return [truthy, falsy];
  }
}

/**
 * Utilidades de fecha
 */
export class DateUtils {
  /**
   * Formatear fecha
   */
  static format(date: Date, format: string = 'DD/MM/YYYY HH:mm:ss'): string {
    const pad = (n: number) => n.toString().padStart(2, '0');

    const replacements: Record<string, string> = {
      YYYY: date.getFullYear().toString(),
      MM: pad(date.getMonth() + 1),
      DD: pad(date.getDate()),
      HH: pad(date.getHours()),
      mm: pad(date.getMinutes()),
      ss: pad(date.getSeconds()),
    };

    let formatted = format;
    for (const [key, value] of Object.entries(replacements)) {
      formatted = formatted.replace(key, value);
    }

    return formatted;
  }

  /**
   * Agregar días a fecha
   */
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Diferencia en días
   */
  static diffInDays(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Verificar si es hoy
   */
  static isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }
}

export {
  WhatsAppValidator as Validator,
  WhatsAppFormatter as Formatter,
  //MessageValidator,
  //TextUtils,
  //ArrayUtils,
  //DateUtils,
};
