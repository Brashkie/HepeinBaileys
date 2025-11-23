import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MiddlewareStack } from '../../src/middleware/MiddlewareStack';
import type { MessageContext, Middleware } from '../../src/types';

// Mock context helper
const createMockContext = (overrides?: Partial<MessageContext>): MessageContext => ({
  socket: {} as any,
  message: {} as any,
  from: '51987654321@s.whatsapp.net',
  text: 'test message',
  type: 'text',
  metadata: {
    timestamp: Date.now(),
    isGroup: false,
    isBusiness: false,
    fromMe: false,
  },
  state: {},
  reply: vi.fn(),
  react: vi.fn(),
  ...overrides,
});

describe('MiddlewareStack', () => {
  let stack: MiddlewareStack;

  beforeEach(() => {
    stack = new MiddlewareStack();
  });

  describe('Basic Operations', () => {
    it('should add middleware to stack', () => {
      const middleware: Middleware = async (ctx, next) => {
        await next();
      };

      stack.use(middleware);

      expect(stack.size()).toBe(1);
    });

    it('should execute middlewares in order', async () => {
      const order: number[] = [];

      stack.use(async (ctx, next) => {
        order.push(1);
        await next();
      });

      stack.use(async (ctx, next) => {
        order.push(2);
        await next();
      });

      stack.use(async (ctx, next) => {
        order.push(3);
        await next();
      });

      const context = createMockContext();
      await stack.execute(context);

      expect(order).toEqual([1, 2, 3]);
    });

    it('should pass context through middleware chain', async () => {
      stack.use(async (ctx, next) => {
        ctx.state.value1 = 'set by middleware 1';
        await next();
      });

      stack.use(async (ctx, next) => {
        ctx.state.value2 = 'set by middleware 2';
        await next();
      });

      const context = createMockContext();
      await stack.execute(context);

      expect(context.state.value1).toBe('set by middleware 1');
      expect(context.state.value2).toBe('set by middleware 2');
    });

    it('should stop execution if next is not called', async () => {
      const called: number[] = [];

      stack.use(async (ctx, next) => {
        called.push(1);
        // No llama a next()
      });

      stack.use(async (ctx, next) => {
        called.push(2);
        await next();
      });

      const context = createMockContext();
      await stack.execute(context);

      expect(called).toEqual([1]); // Solo el primer middleware
    });
  });

  describe('Clear and Remove', () => {
    it('should clear all middlewares', () => {
      stack.use(async (ctx, next) => await next());
      stack.use(async (ctx, next) => await next());

      stack.clear();

      expect(stack.size()).toBe(0);
    });

    it('should remove specific middleware', () => {
      const mw1: Middleware = async (ctx, next) => await next();
      const mw2: Middleware = async (ctx, next) => await next();

      stack.use(mw1);
      stack.use(mw2);

      const removed = stack.remove(mw1);

      expect(removed).toBe(true);
      expect(stack.size()).toBe(1);
    });

    it('should return false when removing non-existent middleware', () => {
      const mw1: Middleware = async (ctx, next) => await next();
      const mw2: Middleware = async (ctx, next) => await next();

      stack.use(mw1);

      const removed = stack.remove(mw2);

      expect(removed).toBe(false);
      expect(stack.size()).toBe(1);
    });
  });

  describe('Get All', () => {
    it('should return all middlewares', () => {
      const mw1: Middleware = async (ctx, next) => await next();
      const mw2: Middleware = async (ctx, next) => await next();

      stack.use(mw1);
      stack.use(mw2);

      const all = stack.getAll();

      expect(all).toHaveLength(2);
      expect(all[0]).toBe(mw1);
      expect(all[1]).toBe(mw2);
    });

    it('should return copy of array', () => {
      const mw1: Middleware = async (ctx, next) => await next();

      stack.use(mw1);

      const all = stack.getAll();
      all.push(async (ctx, next) => await next());

      expect(stack.size()).toBe(1); // No afectó al original
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors', async () => {
      stack.use(async (ctx, next) => {
        throw new Error('Test error');
      });

      const context = createMockContext();

      await expect(stack.execute(context)).rejects.toThrow('Test error');
    });

    it('should catch errors in middleware', async () => {
      let errorCaught = false;

      stack.use(async (ctx, next) => {
        try {
          await next();
        } catch (error) {
          errorCaught = true;
        }
      });

      stack.use(async (ctx, next) => {
        throw new Error('Test error');
      });

      const context = createMockContext();
      await stack.execute(context);

      expect(errorCaught).toBe(true);
    });
  });

  describe('Async Operations', () => {
    it('should handle async middlewares', async () => {
      const delays: number[] = [];

      stack.use(async (ctx, next) => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        delays.push(50);
        await next();
      });

      stack.use(async (ctx, next) => {
        await new Promise((resolve) => setTimeout(resolve, 30));
        delays.push(30);
        await next();
      });

      const context = createMockContext();
      const start = Date.now();
      await stack.execute(context);
      const duration = Date.now() - start;

      expect(delays).toEqual([50, 30]);
      expect(duration).toBeGreaterThanOrEqual(80);
    });
  });

  describe('Context Modification', () => {
    it('should allow middleware to modify context', async () => {
      stack.use(async (ctx, next) => {
        ctx.text = 'modified';
        await next();
      });

      const context = createMockContext({ text: 'original' });
      await stack.execute(context);

      expect(context.text).toBe('modified');
    });

    it('should allow middleware to add to state', async () => {
      stack.use(async (ctx, next) => {
        ctx.state.userId = '123';
        ctx.state.userName = 'John';
        await next();
      });

      const context = createMockContext();
      await stack.execute(context);

      expect(context.state.userId).toBe('123');
      expect(context.state.userName).toBe('John');
    });
  });

  describe('Conditional Execution', () => {
    it('should conditionally execute middleware', async () => {
      let executed = false;

      stack.use(async (ctx, next) => {
        if (ctx.text === 'execute') {
          executed = true;
        }
        await next();
      });

      // No ejecutar
      let context = createMockContext({ text: 'skip' });
      await stack.execute(context);
      expect(executed).toBe(false);

      // Ejecutar
      context = createMockContext({ text: 'execute' });
      await stack.execute(context);
      expect(executed).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle many middlewares efficiently', async () => {
      // Agregar 100 middlewares
      for (let i = 0; i < 100; i++) {
        stack.use(async (ctx, next) => {
          ctx.state.count = (ctx.state.count || 0) + 1;
          await next();
        });
      }

      const context = createMockContext();
      const start = Date.now();
      await stack.execute(context);
      const duration = Date.now() - start;

      expect(context.state.count).toBe(100);
      expect(duration).toBeLessThan(100); // Debe ser rápido
    });
  });
});
