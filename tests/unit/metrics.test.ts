import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsManager } from '../../src/services/MetricsManager';
import pino from 'pino';

describe('MetricsManager', () => {
  let metricsManager: MetricsManager;
  let logger: pino.Logger;

  beforeEach(() => {
    logger = pino({ level: 'silent' });
    metricsManager = new MetricsManager(
      {
        enabled: true,
        detailed: true,
      },
      logger
    );
    metricsManager.initialize();
  });

  describe('Counters', () => {
    it('should increment counter', () => {
      metricsManager.increment('test.counter');
      metricsManager.increment('test.counter');

      const value = metricsManager.get('test.counter');
      expect(value).toBe(2);
    });

    it('should increment by custom value', () => {
      metricsManager.increment('test.counter', 5);

      const value = metricsManager.get('test.counter');
      expect(value).toBe(5);
    });

    it('should decrement counter', () => {
      metricsManager.increment('test.counter', 10);
      metricsManager.decrement('test.counter', 3);

      const value = metricsManager.get('test.counter');
      expect(value).toBe(7);
    });
  });

  describe('Gauges', () => {
    it('should set gauge value', () => {
      metricsManager.gauge('test.gauge', 42);

      const value = metricsManager.get('test.gauge');
      expect(value).toBe(42);
    });

    it('should overwrite previous gauge value', () => {
      metricsManager.gauge('test.gauge', 10);
      metricsManager.gauge('test.gauge', 20);

      const value = metricsManager.get('test.gauge');
      expect(value).toBe(20);
    });
  });

  describe('Histograms', () => {
    it('should record histogram values', () => {
      metricsManager.histogram('test.histogram', 10);
      metricsManager.histogram('test.histogram', 20);
      metricsManager.histogram('test.histogram', 30);

      const stats = metricsManager.getHistogramStats('test.histogram');

      expect(stats).toBeDefined();
      expect(stats?.count).toBe(3);
      expect(stats?.min).toBe(10);
      expect(stats?.max).toBe(30);
      expect(stats?.mean).toBe(20);
    });

    it('should calculate percentiles', () => {
      // Agregar muchos valores
      for (let i = 1; i <= 100; i++) {
        metricsManager.histogram('test.percentiles', i);
      }

      const stats = metricsManager.getHistogramStats('test.percentiles');

      expect(stats?.p50).toBeGreaterThanOrEqual(45);
      expect(stats?.p50).toBeLessThanOrEqual(55);
      expect(stats?.p95).toBeGreaterThanOrEqual(90);
      expect(stats?.p99).toBeGreaterThanOrEqual(95);
    });
  });

  describe('Timing', () => {
    it('should record timing', () => {
      metricsManager.timing('test.timing', 100);
      metricsManager.timing('test.timing', 200);

      const stats = metricsManager.getHistogramStats('test.timing');

      expect(stats?.count).toBe(2);
      expect(stats?.mean).toBe(150);
    });

    it('should measure function execution time', async () => {
      const result = await metricsManager.measureTime('test.measure', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 'success';
      });

      expect(result).toBe('success');

      const stats = metricsManager.getHistogramStats('test.measure');
      expect(stats?.count).toBe(1);
      expect(stats?.mean).toBeGreaterThanOrEqual(100);
    });

    it('should create manual timer', async () => {
      const endTimer = metricsManager.startTimer('test.manual');

      await new Promise((resolve) => setTimeout(resolve, 50));

      const duration = endTimer();

      expect(duration).toBeGreaterThanOrEqual(50);

      const stats = metricsManager.getHistogramStats('test.manual');
      expect(stats?.count).toBe(1);
    });
  });

  describe('Get Metrics', () => {
    it('should get all metrics', async () => {
      metricsManager.increment('counter1');
      metricsManager.gauge('gauge1', 42);
      metricsManager.histogram('hist1', 100);

      const metrics = await metricsManager.getMetrics();

      expect(metrics).toHaveProperty('counter1');
      expect(metrics).toHaveProperty('gauge1');
      expect(metrics).toHaveProperty('hist1');
    });

    it('should include system metrics', async () => {
      const metrics = await metricsManager.getMetrics();

      expect(metrics).toHaveProperty('system.uptime');
      expect(metrics).toHaveProperty('system.memory_usage');
      expect(metrics).toHaveProperty('system.memory_total');
    });
  });

  describe('Specialized Metrics', () => {
    it('should get performance metrics', () => {
      const perfMetrics = metricsManager.getPerformanceMetrics();

      expect(perfMetrics).toHaveProperty('uptime');
      expect(perfMetrics).toHaveProperty('memory');
      expect(perfMetrics.memory).toHaveProperty('used');
      expect(perfMetrics.memory).toHaveProperty('total');
    });

    it('should get message metrics', () => {
      metricsManager.increment('messages.received', 10);
      metricsManager.increment('messages.sent', 8);
      metricsManager.increment('messages.errors', 2);

      const msgMetrics = metricsManager.getMessageMetrics();

      expect(msgMetrics.received).toBe(10);
      expect(msgMetrics.sent).toBe(8);
      expect(msgMetrics.errors).toBe(2);
    });

    it('should calculate success rate', () => {
      metricsManager.increment('messages.processed', 90);
      metricsManager.increment('messages.errors', 10);

      const msgMetrics = metricsManager.getMessageMetrics();

      expect(msgMetrics.successRate).toBe(90);
    });
  });

  describe('Reset', () => {
    it('should reset specific metric', () => {
      metricsManager.increment('test.counter', 10);
      metricsManager.reset('test.counter');

      const value = metricsManager.get('test.counter');
      expect(value).toBeUndefined();
    });

    it('should reset all metrics', () => {
      metricsManager.increment('counter1', 10);
      metricsManager.gauge('gauge1', 42);
      metricsManager.reset();

      const value1 = metricsManager.get('counter1');
      const value2 = metricsManager.get('gauge1');

      expect(value1).toBeUndefined();
      expect(value2).toBeUndefined();
    });
  });

  describe('Summary', () => {
    it('should get summary of metrics', () => {
      metricsManager.increment('messages.received', 100);
      metricsManager.increment('cache.hits', 50);
      metricsManager.gauge('queue.waiting', 5);

      const summary = metricsManager.getSummary();

      expect(summary).toHaveProperty('system');
      expect(summary).toHaveProperty('messages');
      expect(summary).toHaveProperty('cache');
      expect(summary).toHaveProperty('queue');
    });
  });

  describe('Snapshots', () => {
    it('should create snapshot', async () => {
      metricsManager.increment('test.counter', 42);

      const snapshot = await metricsManager.createSnapshot();

      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot).toHaveProperty('metrics');
      expect(snapshot).toHaveProperty('summary');
      expect(snapshot.metrics['test.counter']).toBe(42);
    });
  });

  describe('Events', () => {
    it('should record custom events', () => {
      metricsManager.recordEvent('user.login', { userId: '123' });

      const value = metricsManager.get('events.user.login');
      expect(value).toBe(1);
    });
  });

  describe('Enable/Disable', () => {
    it('should not record metrics when disabled', () => {
      metricsManager.setEnabled(false);
      metricsManager.increment('test.counter');

      const value = metricsManager.get('test.counter');
      expect(value).toBeUndefined();
    });

    it('should resume recording when enabled', () => {
      metricsManager.setEnabled(false);
      metricsManager.increment('test.counter');

      metricsManager.setEnabled(true);
      metricsManager.increment('test.counter');

      const value = metricsManager.get('test.counter');
      expect(value).toBe(1);
    });
  });

  describe('Prometheus Export', () => {
    it('should export in Prometheus format', () => {
      metricsManager.increment('test_counter', 42);
      metricsManager.gauge('test_gauge', 100);

      const prometheus = metricsManager.exportPrometheus();

      expect(prometheus).toContain('# TYPE test_counter counter');
      expect(prometheus).toContain('test_counter 42');
      expect(prometheus).toContain('# TYPE test_gauge gauge');
      expect(prometheus).toContain('test_gauge 100');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup properly', () => {
      metricsManager.increment('test.counter', 10);
      metricsManager.cleanup();

      const value = metricsManager.get('test.counter');
      expect(value).toBeUndefined();
    });
  });
});
