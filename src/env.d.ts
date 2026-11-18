/// <reference path="../.astro/types.d.ts" />
/// <reference types="@astrojs/cloudflare" />
/// <reference types="@cloudflare/workers-types" />

import type { Env as AppEnv } from './lib/types';

declare global {
  namespace App {
    interface Locals {
      runtime: {
        env: AppEnv;
      };
    }
  }
}