import type { Logger } from 'pino';
import type {
  QueueManager as IQueueManager,
  QueueJob,
  QueueJobHandler,
  QueueStats,
  HepeinBaileysConfig,
} from '../types';
import { EventEmitter } from 'events';
import { nanoid } from 'nanoid';

/**
 * Gestor de cola de mensajes con soporte para grandes volúmenes
 */
export class QueueManager extends EventEmitter implements IQueueManager {
  private logger: Logger;
  private config: NonNullable<HepeinBaileysConfig['queue']>;
  private jobs: Map<string, QueueJob>;
  private waitingJobs: QueueJob[];
  private activeJobs: Map<string, QueueJob>;
  private completedJobs: QueueJob[];
  private failedJobs: QueueJob[];
  private delayedJobs: QueueJob[];
  private isPaused: boolean;
  private isProcessing: boolean;
  private handler?: QueueJobHandler;
  private processingInterval?: NodeJS.Timeout;
  private stats: QueueStats;

  constructor(config: NonNullable<HepeinBaileysConfig['queue']>, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;

    this.jobs = new Map();
    this.waitingJobs = [];
    this.activeJobs = new Map();
    this.completedJobs = [];
    this.failedJobs = [];
    this.delayedJobs = [];
    this.isPaused = false;
    this.isProcessing = false;

    this.stats = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: false,
    };

    this.logger.info({ config }, 'QueueManager inicializado');
  }

  /**
   * Inicializar cola
   */
  async initialize(): Promise<void> {
    if (this.config.type === 'redis') {
      // TODO: Implementar Bull con Redis
      this.logger.warn('Redis queue no implementado aún, usando memoria');
    }

    this.logger.info('Cola inicializada');
  }

  /**
   * Agregar trabajo a la cola
   */
  async add(job: QueueJob): Promise<void> {
    // Generar ID si no existe
    if (!job.id) {
      job.id = nanoid();
    }

    // Validar trabajo
    if (this.jobs.has(job.id)) {
      throw new Error(`Job with id ${job.id} already exists`);
    }

    // Guardar trabajo
    this.jobs.set(job.id, job);

    // Agregar a cola correspondiente
    if (job.delay && job.delay > 0) {
      this.delayedJobs.push(job);
      this.stats.delayed++;
      this.scheduleDelayedJob(job);
    } else {
      this.addToWaitingQueue(job);
    }

    this.logger.trace({ jobId: job.id, type: job.type }, 'Trabajo agregado a la cola');
    this.emit('job.added', job);
  }

  /**
   * Agregar a cola de espera con priorización
   */
  private addToWaitingQueue(job: QueueJob): void {
    const priority = job.priority || 0;

    // Insertar ordenado por prioridad (mayor prioridad primero)
    const index = this.waitingJobs.findIndex((j) => (j.priority || 0) < priority);

    if (index === -1) {
      this.waitingJobs.push(job);
    } else {
      this.waitingJobs.splice(index, 0, job);
    }

    this.stats.waiting++;
  }

  /**
   * Programar trabajo retrasado
   */
  private scheduleDelayedJob(job: QueueJob): void {
    setTimeout(() => {
      // Mover de delayed a waiting
      const index = this.delayedJobs.findIndex((j) => j.id === job.id);
      if (index !== -1) {
        this.delayedJobs.splice(index, 1);
        this.stats.delayed--;
        this.addToWaitingQueue(job);
        this.logger.trace({ jobId: job.id }, 'Trabajo movido de delayed a waiting');
      }
    }, job.delay);
  }

  /**
   * Procesar trabajos de la cola
   */
  process(handler: QueueJobHandler): void {
    if (this.handler) {
      throw new Error('Handler already registered');
    }

    this.handler = handler;
    this.startProcessing();
    this.logger.info('Procesamiento de cola iniciado');
  }

  /**
   * Iniciar procesamiento de trabajos
   */
  private startProcessing(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    const concurrency = this.config.processing?.concurrency || 10;
    const rateLimit = this.config.processing?.rateLimit || 50;

    // Calcular intervalo basado en rate limit
    const intervalMs = Math.max(1000 / rateLimit, 10);

    this.processingInterval = setInterval(async () => {
      if (this.isPaused || !this.handler) return;

      // Procesar hasta alcanzar concurrencia máxima
      while (
        this.activeJobs.size < concurrency &&
        this.waitingJobs.length > 0
      ) {
        const job = this.waitingJobs.shift();
        if (job) {
          this.stats.waiting--;
          this.executeJob(job);
        }
      }
    }, intervalMs);

    this.logger.info({ concurrency, rateLimit }, 'Procesamiento configurado');
  }

  /**
   * Ejecutar trabajo individual
   */
  private async executeJob(job: QueueJob): Promise<void> {
    this.activeJobs.set(job.id!, job);
    this.stats.active++;
    this.emit('job.active', job);

    const maxAttempts = job.attempts || 3;
    let attempt = 0;
    let lastError: Error | undefined;

    while (attempt < maxAttempts) {
      attempt++;

      try {
        this.logger.trace(
          { jobId: job.id, attempt, maxAttempts },
          'Ejecutando trabajo'
        );

        const result = await this.handler!(job);

        // Éxito
        this.activeJobs.delete(job.id!);
        this.stats.active--;
        this.completedJobs.push(job);
        this.stats.completed++;

        this.logger.trace({ jobId: job.id }, 'Trabajo completado');
        this.emit('job.completed', job, result);
        return;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          { jobId: job.id, attempt, error },
          'Error ejecutando trabajo'
        );

        // Si no es el último intento, esperar antes de reintentar
        if (attempt < maxAttempts) {
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);
        }
      }
    }

    // Falló después de todos los intentos
    this.activeJobs.delete(job.id!);
    this.stats.active--;
    this.failedJobs.push(job);
    this.stats.failed++;

    this.logger.error({ jobId: job.id, error: lastError }, 'Trabajo falló');
    this.emit('job.failed', job, lastError);
  }

  /**
   * Calcular delay de reintento (backoff exponencial)
   */
  private calculateRetryDelay(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt - 1), 30000);
  }

  /**
   * Pausar procesamiento
   */
  async pause(): Promise<void> {
    this.isPaused = true;
    this.stats.paused = true;
    this.logger.info('Cola pausada');
    this.emit('queue.paused');
  }

  /**
   * Reanudar procesamiento
   */
  async resume(): Promise<void> {
    this.isPaused = false;
    this.stats.paused = false;
    this.logger.info('Cola reanudada');
    this.emit('queue.resumed');
  }

  /**
   * Obtener estadísticas
   */
  async getStats(): Promise<QueueStats> {
    return { ...this.stats };
  }

  /**
   * Limpiar trabajos completados
   */
  async clean(): Promise<void> {
    const completedCount = this.completedJobs.length;
    const failedCount = this.failedJobs.length;

    this.completedJobs = [];
    this.failedJobs = [];
    this.stats.completed = 0;
    this.stats.failed = 0;

    this.logger.info(
      { completed: completedCount, failed: failedCount },
      'Trabajos limpiados'
    );
  }

  /**
   * Obtener trabajo por ID
   */
  getJob(id: string): QueueJob | undefined {
    return this.jobs.get(id);
  }

  /**
   * Remover trabajo de la cola
   */
  async removeJob(id: string): Promise<boolean> {
    const job = this.jobs.get(id);
    if (!job) return false;

    // Remover de waiting
    const waitingIndex = this.waitingJobs.findIndex((j) => j.id === id);
    if (waitingIndex !== -1) {
      this.waitingJobs.splice(waitingIndex, 1);
      this.stats.waiting--;
    }

    // Remover de delayed
    const delayedIndex = this.delayedJobs.findIndex((j) => j.id === id);
    if (delayedIndex !== -1) {
      this.delayedJobs.splice(delayedIndex, 1);
      this.stats.delayed--;
    }

    // No podemos remover activos
    if (this.activeJobs.has(id)) {
      this.logger.warn({ jobId: id }, 'No se puede remover trabajo activo');
      return false;
    }

    this.jobs.delete(id);
    this.logger.trace({ jobId: id }, 'Trabajo removido');
    return true;
  }

  /**
   * Agregar múltiples trabajos (bulk)
   */
  async addBulk(jobs: QueueJob[]): Promise<void> {
    const operations = jobs.map((job) => this.add(job));
    await Promise.all(operations);
    this.logger.info({ count: jobs.length }, 'Trabajos agregados en bulk');
  }

  /**
   * Obtener trabajos por estado
   */
  getJobsByState(state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed') {
    switch (state) {
      case 'waiting':
        return [...this.waitingJobs];
      case 'active':
        return Array.from(this.activeJobs.values());
      case 'completed':
        return [...this.completedJobs];
      case 'failed':
        return [...this.failedJobs];
      case 'delayed':
        return [...this.delayedJobs];
      default:
        return [];
    }
  }

  /**
   * Retry trabajos fallidos
   */
  async retryFailed(): Promise<void> {
    const failedJobs = [...this.failedJobs];
    this.failedJobs = [];
    this.stats.failed = 0;

    await this.addBulk(failedJobs);
    this.logger.info({ count: failedJobs.length }, 'Trabajos fallidos reintentados');
  }

  /**
   * Obtener métricas para monitoreo
   */
  getMetrics() {
    return {
      'queue.waiting': this.stats.waiting,
      'queue.active': this.stats.active,
      'queue.completed': this.stats.completed,
      'queue.failed': this.stats.failed,
      'queue.delayed': this.stats.delayed,
      'queue.total': this.jobs.size,
      'queue.paused': this.stats.paused ? 1 : 0,
      'queue.success_rate':
        this.stats.completed + this.stats.failed > 0
          ? (this.stats.completed / (this.stats.completed + this.stats.failed)) * 100
          : 100,
    };
  }

  /**
   * Obtener throughput (trabajos por segundo)
   */
  private lastThroughputCheck = Date.now();
  private lastCompletedCount = 0;

  getThroughput(): number {
    const now = Date.now();
    const elapsed = (now - this.lastThroughputCheck) / 1000;
    const completed = this.stats.completed - this.lastCompletedCount;

    this.lastThroughputCheck = now;
    this.lastCompletedCount = this.stats.completed;

    return elapsed > 0 ? completed / elapsed : 0;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.isProcessing = false;
    await this.pause();
    await this.clean();

    this.logger.info('QueueManager limpiado');
  }

  /**
   * Obtener información detallada
   */
  getInfo() {
    return {
      config: this.config,
      stats: this.stats,
      throughput: this.getThroughput(),
      isPaused: this.isPaused,
      isProcessing: this.isProcessing,
      totalJobs: this.jobs.size,
    };
  }
}

export default QueueManager;
