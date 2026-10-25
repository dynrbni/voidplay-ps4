import { z } from 'zod';

export const demoTransferKey = 'voidplay.demo-transfers.v1';
const MiB = 1024 * 1024;
const base = z.object({
  entryId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  mode: z.literal('demo'), totalBytes: z.number().int().min(1).max(1024 * MiB),
  receivedBytes: z.number().int().nonnegative(), createdAt: z.number().int().nonnegative()
});
const jobSchema = z.discriminatedUnion('status', [
  base.extend({ status: z.literal('downloading'), bytesPerSecond: z.number().int().positive().max(100 * MiB) }).strict(),
  base.extend({ status: z.enum(['queued', 'paused', 'completed', 'cancelled']), bytesPerSecond: z.literal(0) }).strict()
]).refine(job => job.receivedBytes <= job.totalBytes && (job.status !== 'completed' || job.receivedBytes === job.totalBytes));
const storedSchema = z.strictObject({ version: z.literal(1), jobs: z.array(jobSchema).max(500) })
  .refine(value => new Set(value.jobs.map(job => job.entryId)).size === value.jobs.length);
export type DemoTransfer = z.infer<typeof jobSchema>;
export type TransferCommand = 'pause' | 'resume' | 'cancel' | 'retry';

export function parseDemoTransfers(raw: string | null): DemoTransfer[] {
  if (raw === null) return [];
  return storedSchema.parse(JSON.parse(raw)).jobs.map(job => job.status === 'downloading' || job.status === 'queued'
    ? { ...job, status: 'paused', bytesPerSecond: 0 } : job);
}

export function enqueueDemo(jobs: DemoTransfer[], entryId: string, now: number): DemoTransfer[] {
  const existing = jobs.find(job => job.entryId === entryId);
  if (existing && existing.status !== 'cancelled' && existing.status !== 'completed') return jobs;
  const seed = [...entryId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const next: DemoTransfer = { entryId, mode: 'demo', status: 'queued', totalBytes: (96 + seed % 64) * MiB, receivedBytes: 0, bytesPerSecond: 0, createdAt: now };
  return [...jobs.filter(job => job.entryId !== entryId), next];
}

export function commandDemo(jobs: DemoTransfer[], entryId: string, command: TransferCommand): DemoTransfer[] {
  return jobs.map(job => {
    if (job.entryId !== entryId) return job;
    if (command === 'pause' && (job.status === 'downloading' || job.status === 'queued')) return { ...job, status: 'paused', bytesPerSecond: 0 };
    if (command === 'resume' && job.status === 'paused') return { ...job, status: 'queued', bytesPerSecond: 0 };
    if (command === 'cancel' && ['downloading', 'queued', 'paused'].includes(job.status)) return { ...job, status: 'cancelled', bytesPerSecond: 0 };
    if (command === 'retry' && (job.status === 'cancelled' || job.status === 'completed')) return { ...job, status: 'queued', receivedBytes: 0, bytesPerSecond: 0 };
    return job;
  });
}

export function advanceDemo(jobs: DemoTransfer[], elapsedMs: number): DemoTransfer[] {
  const active = jobs.findIndex(job => job.status === 'downloading');
  const index = active === -1 ? jobs.findIndex(job => job.status === 'queued') : active;
  if (index === -1 || elapsedMs <= 0) return jobs;
  return jobs.map((job, position) => {
    if (position !== index) return job;
    const bytesPerSecond = (8 + Math.floor(job.receivedBytes / (16 * MiB)) % 4) * MiB;
    const receivedBytes = Math.min(job.totalBytes, job.receivedBytes + Math.floor(bytesPerSecond * Math.min(elapsedMs, 1000) / 1000));
    return receivedBytes === job.totalBytes
      ? { ...job, status: 'completed', receivedBytes, bytesPerSecond: 0 }
      : { ...job, status: 'downloading', receivedBytes, bytesPerSecond };
  });
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * MiB) return `${(bytes / (1024 * MiB)).toFixed(1)} GiB`;
  if (bytes >= MiB) return `${(bytes / MiB).toFixed(1)} MiB`;
  return `${Math.round(bytes / 1024)} KiB`;
}
