import type { Logger } from 'pino';
import type { AIProviderConfig, AIResponse, HepeinBaileysConfig } from '../types';

/**
 * Servicio de IA con soporte para múltiples proveedores
 */
export class AIService {
  private logger: Logger;
  private config: NonNullable<HepeinBaileysConfig['ai']>;
  private provider: AIProvider;

  constructor(config: NonNullable<HepeinBaileysConfig['ai']>, logger: Logger) {
    this.config = config;
    this.logger = logger;

    // Inicializar proveedor
    this.provider = this.createProvider();
    
    this.logger.info({ provider: config.provider }, 'AIService inicializado');
  }

  /**
   * Crear proveedor de IA
   */
  private createProvider(): AIProvider {
    switch (this.config.provider) {
      case 'openai':
        return new OpenAIProvider(this.config, this.logger);
      case 'anthropic':
        return new AnthropicProvider(this.config, this.logger);
      case 'google':
        return new GoogleProvider(this.config, this.logger);
      case 'custom':
        return new CustomProvider(this.config, this.logger);
      default:
        throw new Error(`Provider no soportado: ${this.config.provider}`);
    }
  }

  /**
   * Generar respuesta usando IA
   */
  async generateResponse(
    prompt: string,
    options?: {
      context?: string;
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      this.logger.debug({ prompt: prompt.substring(0, 100) }, 'Generando respuesta IA');

      const response = await this.provider.generateResponse(prompt, options);

      const duration = Date.now() - startTime;
      this.logger.info({ duration, tokensUsed: response.tokensUsed }, 'Respuesta IA generada');

      return response;
    } catch (error) {
      this.logger.error({ error }, 'Error generando respuesta IA');
      throw error;
    }
  }

  /**
   * Analizar sentimiento del texto
   */
  async analyzeSentiment(text: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    score: number;
    confidence: number;
  }> {
    const prompt = `Analiza el sentimiento del siguiente texto y responde SOLO con JSON:
Texto: "${text}"

Formato de respuesta:
{
  "sentiment": "positive/negative/neutral",
  "score": número entre -1 y 1,
  "confidence": número entre 0 y 1
}`;

    const response = await this.generateResponse(prompt, {
      systemPrompt: 'Eres un analizador de sentimientos. Responde solo con JSON válido.',
      maxTokens: 100,
      temperature: 0.1,
    });

    try {
      const result = JSON.parse(response.text);
      return result;
    } catch (error) {
      this.logger.error({ error, text: response.text }, 'Error parseando sentimiento');
      return { sentiment: 'neutral', score: 0, confidence: 0 };
    }
  }

  /**
   * Extraer intenciones del mensaje
   */
  async extractIntent(text: string): Promise<{
    intent: string;
    confidence: number;
    entities: Record<string, any>;
  }> {
    const prompt = `Analiza el siguiente mensaje y extrae la intención del usuario:
Mensaje: "${text}"

Responde SOLO con JSON:
{
  "intent": "nombre_de_la_intención",
  "confidence": número entre 0 y 1,
  "entities": { objetos o entidades mencionadas }
}`;

    const response = await this.generateResponse(prompt, {
      systemPrompt: 'Eres un sistema de NLU. Responde solo con JSON válido.',
      maxTokens: 200,
      temperature: 0.2,
    });

    try {
      const result = JSON.parse(response.text);
      return result;
    } catch (error) {
      this.logger.error({ error }, 'Error parseando intent');
      return { intent: 'unknown', confidence: 0, entities: {} };
    }
  }

  /**
   * Generar auto-respuesta contextual
   */
  async generateAutoReply(
    message: string,
    context?: {
      conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
      userInfo?: any;
      customContext?: string;
    }
  ): Promise<string> {
    let prompt = message;

    // Agregar contexto de conversación
    if (context?.conversationHistory && context.conversationHistory.length > 0) {
      const history = context.conversationHistory
        .slice(-5) // Últimos 5 mensajes
        .map((msg) => `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`)
        .join('\n');

      prompt = `Contexto de conversación anterior:
${history}

Mensaje actual del usuario: ${message}`;
    }

    const systemPrompt = context?.customContext || this.config.autoReply?.context || 
      'Eres un asistente útil de WhatsApp. Responde de forma amigable, concisa y natural.';

    const response = await this.generateResponse(prompt, {
      systemPrompt,
      maxTokens: 500,
      temperature: 0.7,
    });

    return response.text;
  }

  /**
   * Traducir texto
   */
  async translate(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<string> {
    const sourceLang = sourceLanguage ? `desde ${sourceLanguage}` : 'automáticamente';
    
    const prompt = `Traduce ${sourceLang} al ${targetLanguage}:
"${text}"

Responde SOLO con la traducción, sin explicaciones.`;

    const response = await this.generateResponse(prompt, {
      systemPrompt: 'Eres un traductor profesional.',
      maxTokens: text.length * 2,
      temperature: 0.3,
    });

    return response.text;
  }

  /**
   * Resumir texto largo
   */
  async summarize(text: string, maxLength: number = 100): Promise<string> {
    const prompt = `Resume el siguiente texto en máximo ${maxLength} palabras:

"${text}"

Responde SOLO con el resumen.`;

    const response = await this.generateResponse(prompt, {
      systemPrompt: 'Eres un experto en crear resúmenes concisos.',
      maxTokens: maxLength * 2,
      temperature: 0.5,
    });

    return response.text;
  }

  /**
   * Verificar si el mensaje necesita respuesta automática
   */
  shouldAutoReply(message: string): boolean {
    if (!this.config.autoReply?.enabled) {
      return false;
    }

    const patterns = this.config.autoReply.patterns || [];
    
    return patterns.some((pattern) => pattern.test(message));
  }

  /**
   * Obtener estadísticas del servicio
   */
  getStats() {
    return this.provider.getStats();
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    await this.provider.cleanup();
    this.logger.info('AIService limpiado');
  }
}

/**
 * Interface para proveedores de IA
 */
interface AIProvider {
  generateResponse(
    prompt: string,
    options?: any
  ): Promise<AIResponse>;
  getStats(): any;
  cleanup(): Promise<void>;
}

/**
 * Proveedor de OpenAI
 */
class OpenAIProvider implements AIProvider {
  private config: AIProviderConfig;
  private logger: Logger;
  private requestCount = 0;
  private totalTokens = 0;

  constructor(config: any, logger: Logger) {
    this.config = {
      type: 'openai',
      apiKey: config.apiKey,
      model: config.model || 'gpt-4',
    };
    this.logger = logger;
  }

  async generateResponse(prompt: string, options?: any): Promise<AIResponse> {
    this.requestCount++;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            ...(options?.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
            { role: 'user', content: prompt },
          ],
          max_tokens: options?.maxTokens || 1000,
          temperature: options?.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.choices[0].message.content;
      const tokensUsed = data.usage.total_tokens;

      this.totalTokens += tokensUsed;

      return {
        text,
        tokensUsed,
        confidence: 0.9,
        metadata: {
          model: this.config.model,
          provider: 'openai',
        },
      };
    } catch (error) {
      this.logger.error({ error }, 'Error en OpenAI');
      throw error;
    }
  }

  getStats() {
    return {
      provider: 'openai',
      requestCount: this.requestCount,
      totalTokens: this.totalTokens,
      model: this.config.model,
    };
  }

  async cleanup(): Promise<void> {
    // Cleanup si es necesario
  }
}

/**
 * Proveedor de Anthropic (Claude)
 */
class AnthropicProvider implements AIProvider {
  private config: AIProviderConfig;
  private logger: Logger;
  private requestCount = 0;
  private totalTokens = 0;

  constructor(config: any, logger: Logger) {
    this.config = {
      type: 'anthropic',
      apiKey: config.apiKey,
      model: config.model || 'claude-3-5-sonnet-20241022',
    };
    this.logger = logger;
  }

  async generateResponse(prompt: string, options?: any): Promise<AIResponse> {
    this.requestCount++;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: options?.maxTokens || 1000,
          temperature: options?.temperature || 0.7,
          system: options?.systemPrompt,
          messages: [
            { role: 'user', content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.content[0].text;
      const tokensUsed = data.usage.input_tokens + data.usage.output_tokens;

      this.totalTokens += tokensUsed;

      return {
        text,
        tokensUsed,
        confidence: 0.95,
        metadata: {
          model: this.config.model,
          provider: 'anthropic',
        },
      };
    } catch (error) {
      this.logger.error({ error }, 'Error en Anthropic');
      throw error;
    }
  }

  getStats() {
    return {
      provider: 'anthropic',
      requestCount: this.requestCount,
      totalTokens: this.totalTokens,
      model: this.config.model,
    };
  }

  async cleanup(): Promise<void> {
    // Cleanup si es necesario
  }
}

/**
 * Proveedor de Google (Gemini)
 */
class GoogleProvider implements AIProvider {
  private config: AIProviderConfig;
  private logger: Logger;
  private requestCount = 0;

  constructor(config: any, logger: Logger) {
    this.config = {
      type: 'google',
      apiKey: config.apiKey,
      model: config.model || 'gemini-pro',
    };
    this.logger = logger;
  }

  async generateResponse(prompt: string, options?: any): Promise<AIResponse> {
    this.requestCount++;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                ],
              },
            ],
            generationConfig: {
              maxOutputTokens: options?.maxTokens || 1000,
              temperature: options?.temperature || 0.7,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Google API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates[0].content.parts[0].text;

      return {
        text,
        confidence: 0.85,
        metadata: {
          model: this.config.model,
          provider: 'google',
        },
      };
    } catch (error) {
      this.logger.error({ error }, 'Error en Google');
      throw error;
    }
  }

  getStats() {
    return {
      provider: 'google',
      requestCount: this.requestCount,
      model: this.config.model,
    };
  }

  async cleanup(): Promise<void> {
    // Cleanup si es necesario
  }
}

/**
 * Proveedor personalizado
 */
class CustomProvider implements AIProvider {
  private config: AIProviderConfig;
  private logger: Logger;

  constructor(config: any, logger: Logger) {
    this.config = {
      type: 'custom',
      apiKey: config.apiKey,
      model: config.model || 'custom',
      endpoint: config.endpoint,
    };
    this.logger = logger;
  }

  async generateResponse(prompt: string, options?: any): Promise<AIResponse> {
    throw new Error('Custom provider not implemented. Override this method.');
  }

  getStats() {
    return {
      provider: 'custom',
      model: this.config.model,
    };
  }

  async cleanup(): Promise<void> {
    // Cleanup si es necesario
  }
}

export default AIService;
