import type { Logger } from 'pino';
import type { MetricsManager as IMetricsManager, HepeinBaileysConfig } from '../types';
import { EventEmitter } from 'events';

interface Metric {
  type: 'counter' | 'gauge' | 'histogram' | 'timing';
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

interface HistogramData {
  count: number;
  sum: number;
  min: number;
  max: number;
  mean: number;
  values: number[];
}

/**
 * Gestor de métricas y monitoreo
 */
export class MetricsManager extends EventEmitter implements IMetricsManager {
  private logger: Logger;
  private config: NonNullable<HepeinBaileysConfig['metrics']>;
  private metrics: Map<string, Metric>;
  private histograms: Map<string, HistogramData>;
  private startTime: number;
  private isEnabled: boolean;

  constructor(config: NonNullable<HepeinBaileysConfig['metrics']>, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.metrics = new Map();
    this.histograms = new Map();
    this.startTime = Date.now();
    this.isEnabled = config.enabled !== false;

    this.logger.info({ config }, 'MetricsManager inicializado');
  }

  /**
   * Inicializar métricas
   */
  initialize(): void {
    if (!this.isEnabled) {
      this.logger.info('Métricas deshabilitadas');
      return;
    }

    // Métricas iniciales
    this.gauge('system.uptime', 0);
    this.gauge('system.start_time', this.startTime);

    // Actualizar uptime cada minuto
    setInterval(() => {
      this.gauge('system.uptime', (Date.now() - this.startTime) / 1000);
    }, 60000);

    this.logger.info('Métricas inicializadas');
  }

  /**
   * Incrementar contador
   */
  increment(metric: string, value: number = 1): void {
    if (!this.isEnabled) return;

    const current = this.metrics.get(metric);

    if (current) {
      current.value += value;
      current.timestamp = Date.now();
    } else {
      this.metrics.set(metric, {
        type: 'counter',
        value,
        timestamp: Date.now(),
      });
    }

    if (this.config.detailed) {
      this.logger.trace({ metric, value }, 'Contador incrementado');
    }

    this.emit('metric.updated', metric, value);
  }

  /**
   * Decrementar contador
   */
  decrement(metric: string, value: number = 1): void {
    this.increment(metric, -value);
  }

  /**
   * Establecer gauge (valor absoluto)
   */
  gauge(metric: string, value: number): void {
    if (!this.isEnabled) return;

    this.metrics.set(metric, {
      type: 'gauge',
      value,
      timestamp: Date.now(),
    });

    if (this.config.detailed) {
      this.logger.trace({ metric, value }, 'Gauge establecido');
    }

    this.emit('metric.updated', metric, value);
  }

  /**
   * Registrar histograma
   */
  histogram(metric: string, value: number): void {
    if (!this.isEnabled) return;

    let histogram = this.histograms.get(metric);

    if (!histogram) {
      histogram = {
        count: 0,
        sum: 0,
        min: value,
        max: value,
        mean: 0,
        values: [],
      };
      this.histograms.set(metric, histogram);
    }

    // Actualizar estadísticas
    histogram.count++;
    histogram.sum += value;
    histogram.min = Math.min(histogram.min, value);
    histogram.max = Math.max(histogram.max, value);
    histogram.mean = histogram.sum / histogram.count;
    histogram.values.push(value);

    // Limitar tamaño del array de valores
    if (histogram.values.length > 1000) {
      histogram.values = histogram.values.slice(-1000);
    }

    // Actualizar métrica
    this.metrics.set(metric, {
      type: 'histogram',
      value: histogram.mean,
      timestamp: Date.now(),
    });

    if (this.config.detailed) {
      this.logger.trace({ metric, value, stats: histogram }, 'Histograma actualizado');
    }

    this.emit('metric.updated', metric, value);
  }

  /**
   * Registrar timing (alias de histogram)
   */
  timing(metric: string, value: number): void {
    this.histogram(metric, value);
  }

  /**
   * Medir tiempo de ejecución de una función
   */
  async measureTime<T>(metric: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.timing(metric, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.timing(`${metric}.error`, duration);
      throw error;
    }
  }

  /**
   * Crear timer para medir manualmente
   */
  startTimer(metric: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.timing(metric, duration);
      return duration;
    };
  }

  /**
   * Obtener valor de métrica
   */
  get(metric: string): number | undefined {
    return this.metrics.get(metric)?.value;
  }

  /**
   * Obtener todas las métricas
   */
  async getMetrics(): Promise<Record<string, any>> {
    const result: Record<string, any> = {};

    // Métricas básicas
    this.metrics.forEach((metric, name) => {
      result[name] = metric.value;
    });

    // Agregar estadísticas de histogramas
    if (this.config.detailed) {
      this.histograms.forEach((histogram, name) => {
        result[`${name}.count`] = histogram.count;
        result[`${name}.sum`] = histogram.sum;
        result[`${name}.min`] = histogram.min;
        result[`${name}.max`] = histogram.max;
        result[`${name}.mean`] = histogram.mean;
        result[`${name}.p50`] = this.calculatePercentile(histogram.values, 0.5);
        result[`${name}.p95`] = this.calculatePercentile(histogram.values, 0.95);
        result[`${name}.p99`] = this.calculatePercentile(histogram.values, 0.99);
      });
    }

    // Métricas del sistema
    result['system.uptime'] = (Date.now() - this.startTime) / 1000;
    result['system.memory_usage'] = process.memoryUsage().heapUsed;
    result['system.memory_total'] = process.memoryUsage().heapTotal;
    result['system.memory_percent'] =
      (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100;

    return result;
  }

  /**
   * Calcular percentil
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index] || 0;
  }

  /**
   * Resetear métrica
   */
  reset(metric?: string): void {
    if (metric) {
      this.metrics.delete(metric);
      this.histograms.delete(metric);
      this.logger.debug({ metric }, 'Métrica reseteada');
    } else {
      this.metrics.clear();
      this.histograms.clear();
      this.logger.info('Todas las métricas reseteadas');
    }
  }

  /**
   * Obtener métricas de rendimiento
   */
  getPerformanceMetrics() {
    return {
      uptime: (Date.now() - this.startTime) / 1000,
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        percent: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
      },
      cpu: process.cpuUsage(),
    };
  }

  /**
   * Obtener métricas de mensajes
   */
  getMessageMetrics() {
    return {
      received: this.get('messages.received') || 0,
      processed: this.get('messages.processed') || 0,
      sent: this.get('messages.sent') || 0,
      errors: this.get('messages.errors') || 0,
      sendFailed: this.get('messages.send_failed') || 0,
      successRate: this.calculateSuccessRate(),
    };
  }

  /**
   * Calcular tasa de éxito
   */
  private calculateSuccessRate(): number {
    const processed = this.get('messages.processed') || 0;
    const errors = this.get('messages.errors') || 0;
    const total = processed + errors;

    return total > 0 ? (processed / total) * 100 : 100;
  }

  /**
   * Obtener métricas de conexión
   */
  getConnectionMetrics() {
    return {
      established: this.get('connection.established') || 0,
      reconnectAttempts: this.get('connection.reconnect_attempts') || 0,
      disconnections: this.get('connection.disconnections') || 0,
    };
  }

  /**
   * Obtener métricas de cola
   */
  getQueueMetrics() {
    return {
      waiting: this.get('queue.waiting') || 0,
      active: this.get('queue.active') || 0,
      completed: this.get('queue.completed') || 0,
      failed: this.get('queue.failed') || 0,
      throughput: this.get('queue.throughput') || 0,
    };
  }

  /**
   * Obtener métricas de caché
   */
  getCacheMetrics() {
    return {
      hits: this.get('cache.hits') || 0,
      misses: this.get('cache.misses') || 0,
      size: this.get('cache.size') || 0,
      hitRate: this.get('cache.hit_rate') || 0,
    };
  }

  /**
   * Exportar métricas en formato Prometheus
   */
  exportPrometheus(): string {
    const lines: string[] = [];

    this.metrics.forEach((metric, name) => {
      const sanitizedName = name.replace(/\./g, '_');
      lines.push(`# TYPE ${sanitizedName} ${metric.type}`);
      lines.push(`${sanitizedName} ${metric.value}`);
    });

    return lines.join('\n');
  }

  /**
   * Obtener resumen de métricas
   */
  getSummary() {
    return {
      system: this.getPerformanceMetrics(),
      messages: this.getMessageMetrics(),
      connection: this.getConnectionMetrics(),
      queue: this.getQueueMetrics(),
      cache: this.getCacheMetrics(),
    };
  }

  /**
   * Log de métricas periódico
   */
  startPeriodicLogging(intervalMs: number = 60000): NodeJS.Timeout {
    return setInterval(async () => {
      const metrics = await this.getMetrics();
      this.logger.info({ metrics }, 'Métricas periódicas');
    }, intervalMs);
  }

  /**
   * Registrar evento personalizado
   */
  recordEvent(event: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    this.increment(`events.${event}`);

    if (this.config.detailed && metadata) {
      this.logger.debug({ event, metadata }, 'Evento registrado');
    }

    this.emit('event.recorded', event, metadata);
  }

  /**
   * Habilitar/deshabilitar métricas
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.logger.info({ enabled }, 'Métricas actualizadas');
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.reset();
    this.removeAllListeners();
    this.logger.info('MetricsManager limpiado');
  }

  /**
   * Crear snapshot de métricas
   */
  async createSnapshot() {
    return {
      timestamp: Date.now(),
      metrics: await this.getMetrics(),
      summary: this.getSummary(),
    };
  }

  /**
   * Obtener estadísticas de histograma
   */
  getHistogramStats(metric: string) {
    const histogram = this.histograms.get(metric);
    if (!histogram) return null;

    return {
      count: histogram.count,
      sum: histogram.sum,
      min: histogram.min,
      max: histogram.max,
      mean: histogram.mean,
      p50: this.calculatePercentile(histogram.values, 0.5),
      p75: this.calculatePercentile(histogram.values, 0.75),
      p95: this.calculatePercentile(histogram.values, 0.95),
      p99: this.calculatePercentile(histogram.values, 0.99),
    };
  }
}

export default MetricsManager;
