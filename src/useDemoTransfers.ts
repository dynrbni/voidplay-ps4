import { useEffect, useState } from 'react';
import { advanceDemo, commandDemo, demoTransferKey, enqueueDemo, parseDemoTransfers } from './demoTransfers.ts';
import type { TransferCommand } from './demoTransfers.ts';

function readTransfers() {
  try { return { jobs: parseDemoTransfers(localStorage.getItem(demoTransferKey)), warning: '' }; }
  catch { return { jobs: [], warning: 'The saved demo queue could not be read. Start a new demo from a concept page.' }; }
}

export function useDemoTransfers() {
  const [initial] = useState(readTransfers);
  const [jobs, setJobs] = useState(initial.jobs);
  const [warning, setWarning] = useState(initial.warning);
  const running = jobs.some(job => job.status === 'downloading' || job.status === 'queued');
  useEffect(() => {
    if (!running) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const elapsed = now - previous;
      previous = now;
      setJobs(current => advanceDemo(current, elapsed));
    }, 500);
    return () => window.clearInterval(timer);
  }, [running]);
  useEffect(() => {
    if (jobs === initial.jobs) return;
    try {
      localStorage.setItem(demoTransferKey, JSON.stringify({ version: 1, jobs }));
      setWarning('');
    } catch { setWarning('The demo queue is kept for this session only because browser storage is unavailable.'); }
  }, [jobs, initial.jobs]);

  return {
    jobs, warning,
    start: (entryId: string) => setJobs(current => enqueueDemo(current, entryId, Date.now())),
    command: (entryId: string, command: TransferCommand) => setJobs(current => commandDemo(current, entryId, command)),
    clearFinished: () => setJobs(current => current.filter(job => job.status !== 'completed' && job.status !== 'cancelled'))
  };
}
