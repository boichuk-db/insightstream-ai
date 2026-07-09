import { BullRootModuleOptions } from '@nestjs/bullmq';

export function getBullConfig(): BullRootModuleOptions {
  return {
    connection: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
  };
}
