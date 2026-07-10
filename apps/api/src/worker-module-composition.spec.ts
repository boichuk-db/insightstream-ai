import { WorkerModule } from './worker.module';
import { AiWorkerModule } from './modules/ai/ai-worker.module';
import { AiModule } from './modules/ai/ai.module';
import { AiSweepModule } from './modules/ai/ai-sweep.module';
import { AiProcessor } from './modules/ai/ai.processor';
import { AiSweepService } from './modules/ai/ai-sweep.service';
import { ScheduleModule } from '@nestjs/schedule';
import { AppModule } from './app.module';

function getModuleImports(moduleClass: object): unknown[] {
  return Reflect.getMetadata('imports', moduleClass) ?? [];
}

function getModuleProviders(moduleClass: object): unknown[] {
  return Reflect.getMetadata('providers', moduleClass) ?? [];
}

describe('Worker/HTTP module composition (structural guard, no live infra)', () => {
  it('WorkerModule imports AiWorkerModule (which provides AiProcessor)', () => {
    const workerImports = getModuleImports(WorkerModule);
    expect(workerImports).toContain(AiWorkerModule);

    const aiWorkerProviders = getModuleProviders(AiWorkerModule);
    expect(aiWorkerProviders).toContain(AiProcessor);
  });

  it('WorkerModule never imports ScheduleModule (no cron in the worker process)', () => {
    const workerImports = getModuleImports(WorkerModule);
    const hasScheduleModule = workerImports.some(
      (imported) => imported === ScheduleModule,
    );
    expect(hasScheduleModule).toBe(false);
  });

  it('WorkerModule does not import AiSweepModule (the cron sweep must never run in the worker)', () => {
    const workerImports = getModuleImports(WorkerModule);
    expect(workerImports).not.toContain(AiSweepModule);
  });

  it('AiModule (imported by the HTTP-reachable FeedbackModule/AiSweepModule) no longer provides AiProcessor', () => {
    const aiModuleProviders = getModuleProviders(AiModule);
    expect(aiModuleProviders).not.toContain(AiProcessor);
  });

  it('AppModule imports AiSweepModule (the cron sweep belongs to the HTTP process)', () => {
    const appImports = getModuleImports(AppModule);
    expect(appImports).toContain(AiSweepModule);
  });

  it('AiSweepModule provides AiSweepService', () => {
    const providers = getModuleProviders(AiSweepModule);
    expect(providers).toContain(AiSweepService);
  });
});
