import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueueManager } from '../../src/queue/QueueManager';
import pino from 'pino';

describe('QueueManager', () => {
  let queueManager: QueueManager;
  let logger: pino.Logger;

  beforeEach(() => {
    logger = pino({ level: 'silent' });
    queueManager = new QueueManager(
      {
        enabled: true,
        type: 'memory',
        processing: {
          concurrency: 5,
          rateLimit: 10,
          batchSize: 10,
          batchDelay: 100,
        },
      },
      logger
    );
  });

  describe('Job Management', () => {
    it('should add job to queue', async () => {
      await queueManager.add({
        type: 'send',
        data: { message: 'test' },
      });

      const stats = await queueManager.getStats();
      expect(stats.waiting).toBe(1);
    });

    it('should generate job ID if not provided', async () => {
      await queueManager.add({
        type: 'send',
        data: { message: 'test' },
      });

      const jobs = queueManager.getJobsByState('waiting');
      expect(jobs[0]?.id).toBeDefined();
    });

    it('should add multiple jobs', async () => {
      await queueManager.addBulk([
        { type: 'send', data: { message: '1' } },
        { type: 'send', data: { message: '2' } },
        { type: 'send', data: { message: '3' } },
      ]);

      const stats = await queueManager.getStats();
      expect(stats.waiting).toBe(3);
    });

    it('should remove job from queue', async () => {
      await queueManager.add({
        id: 'job1',
        type: 'send',
        data: { message: 'test' },
      });

      const removed = await queueManager.removeJob('job1');
      expect(removed).toBe(true);

      const stats = await queueManager.getStats();
      expect(stats.waiting).toBe(0);
    });
  });

  describe('Job Priorities', () => {
    it('should process high priority jobs first', async () => {
      const results: number[] = [];

      queueManager.process(async (job) => {
        results.push(job.data.priority);
      });

      await queueManager.add({
        type: 'send',
        data: { priority: 1 },
        priority: 1,
      });

      await queueManager.add({
        type: 'send',
        data: { priority: 3 },
        priority: 3,
      });

      await queueManager.add({
        type: 'send',
        data: { priority: 2 },
        priority: 2,
      });

      // Esperar procesamiento
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(results).toEqual([3, 2, 1]);
    });
  });

  describe('Job Processing', () => {
    it('should process jobs with handler', async () => {
      const processed: any[] = [];

      queueManager.process(async (job) => {
        processed.push(job.data);
        return 'success';
      });

      await queueManager.add({
        type: 'send',
        data: { message: 'test1' },
      });

      await queueManager.add({
        type: 'send',
        data: { message: 'test2' },
      });

      // Esperar procesamiento
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(processed).toHaveLength(2);
      expect(processed[0]).toEqual({ message: 'test1' });
      expect(processed[1]).toEqual({ message: 'test2' });
    });

    it('should retry failed jobs', async () => {
      let attemptCount = 0;

      queueManager.process(async (job) => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Fail');
        }
        return 'success';
      });

      await queueManager.add({
        type: 'send',
        data: { message: 'test' },
        attempts: 3,
      });

      // Esperar reintentos
      await new Promise((resolve) => setTimeout(resolve, 5000));

      expect(attemptCount).toBe(3);
    });

    it('should mark job as failed after max attempts', async () => {
      queueManager.process(async () => {
        throw new Error('Always fail');
      });

      await queueManager.add({
        type: 'send',
        data: { message: 'test' },
        attempts: 2,
      });

      // Esperar reintentos
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const stats = await queueManager.getStats();
      expect(stats.failed).toBe(1);
    });
  });

  describe('Delayed Jobs', () => {
    it('should delay job execution', async () => {
      const processed: number[] = [];

      queueManager.process(async (job) => {
        processed.push(Date.now());
      });

      const startTime = Date.now();

      await queueManager.add({
        type: 'send',
        data: { message: 'delayed' },
        delay: 1000, // 1 segundo
      });

      // Esperar ejecución
      await new Promise((resolve) => setTimeout(resolve, 1500));

      expect(processed).toHaveLength(1);
      expect(processed[0]! - startTime).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('Pause and Resume', () => {
    it('should pause processing', async () => {
      await queueManager.pause();

      const stats = await queueManager.getStats();
      expect(stats.paused).toBe(true);
    });

    it('should resume processing', async () => {
      await queueManager.pause();
      await queueManager.resume();

      const stats = await queueManager.getStats();
      expect(stats.paused).toBe(false);
    });

    it('should not process jobs when paused', async () => {
      const processed: any[] = [];

      queueManager.process(async (job) => {
        processed.push(job.data);
      });

      await queueManager.pause();

      await queueManager.add({
        type: 'send',
        data: { message: 'test' },
      });

      // Esperar
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(processed).toHaveLength(0);
    });
  });

  describe('Statistics', () => {
    it('should track queue stats', async () => {
      await queueManager.add({ type: 'send', data: {} });
      await queueManager.add({ type: 'send', data: {} });

      const stats = await queueManager.getStats();

      expect(stats).toHaveProperty('waiting');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
    });

    it('should calculate success rate', async () => {
      queueManager.process(async (job) => {
        if (job.data.fail) throw new Error('Fail');
        return 'success';
      });

      await queueManager.addBulk([
        { type: 'send', data: { fail: false }, attempts: 1 },
        { type: 'send', data: { fail: false }, attempts: 1 },
        { type: 'send', data: { fail: true }, attempts: 1 },
      ]);

      // Esperar procesamiento
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const metrics = queueManager.getMetrics();
      expect(metrics['queue.success_rate']).toBeGreaterThan(0);
    });
  });

  describe('Clean', () => {
    it('should clean completed and failed jobs', async () => {
      queueManager.process(async () => 'success');

      await queueManager.add({ type: 'send', data: {} });

      // Esperar procesamiento
      await new Promise((resolve) => setTimeout(resolve, 500));

      let stats = await queueManager.getStats();
      expect(stats.completed).toBeGreaterThan(0);

      await queueManager.clean();

      stats = await queueManager.getStats();
      expect(stats.completed).toBe(0);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup properly', async () => {
      await queueManager.add({ type: 'send', data: {} });
      await queueManager.cleanup();

      const stats = await queueManager.getStats();
      expect(stats.paused).toBe(true);
    });
  });
});
