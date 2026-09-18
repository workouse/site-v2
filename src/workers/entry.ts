import astroWorker from '../../dist/_worker.js/index.js';
import auditConsumer from './audit-consumer';
import { purgeExpiredAudits } from '../lib/cleanup-engine';

export { AuditStatusDO } from '../objects/AuditStatusDO';

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const reqUrl = new URL(request.url);
    if (reqUrl.hostname === 'www.workouse.com') {
      reqUrl.hostname = 'workouse.com';
      return Response.redirect(reqUrl.toString(), 301);
    }

    const handler =
      typeof (astroWorker as any)?.fetch === 'function'
        ? (astroWorker as any).fetch
        : typeof (astroWorker as any)?.default?.fetch === 'function'
        ? (astroWorker as any).default.fetch
        : typeof (astroWorker as any)?.default === 'function'
        ? (astroWorker as any).default
        : null;

    if (!handler) {
      console.error('Astro fetch handler resolution error. Module structure:', astroWorker);
      return new Response('Astro SSR Handler Unresolved', { status: 500 });
    }

    // Safety fallback for env.ASSETS binding to prevent runtime fetch TypeError
    if (env && !env.ASSETS) {
      env.ASSETS = {
        fetch: async (_req: any) => new Response(null, { status: 404 }),
      };
    }

    return handler(request, env, ctx);
  },

  async queue(batch: any, env: any): Promise<void> {
    return auditConsumer.queue(batch, env);
  },

  // Cron schedule handler to purge reports > 30 days old automatically
  async scheduled(_event: any, env: any, ctx: any): Promise<void> {
    ctx.waitUntil(purgeExpiredAudits(env, 30));
  },
};
