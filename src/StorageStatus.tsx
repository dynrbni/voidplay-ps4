import { useEffect, useState } from 'react';
import { desktopMockStorage } from './platform/adapters.ts';
import type { StorageReport } from './platform/interfaces.ts';
export function StorageStatus() {
  const [report, setReport] = useState<StorageReport>();
  useEffect(() => { let active = true; desktopMockStorage.inspect().then(value => { if (active) setReport(value); }, () => { if (active) setReport({ status: 'error', provenance: 'unavailable', target: null, message: 'Mock adapter failed.' }); }); return () => { active = false; }; }, []);
  return <section><h2>Storage · Desktop mock</h2><p>Demonstration values only. PS4 internal storage has not been measured.</p>{report?.status === 'available' ? <><p>{report.availableBytes / 1024 ** 3} GiB available / {report.totalBytes / 1024 ** 3} GiB total · Mock</p><p>{report.target}</p></> : <p>{report?.message ?? 'Loading mock adapter…'}</p>}</section>;
}
