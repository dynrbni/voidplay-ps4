const paths = {
  pause: <path d="M8 5v14M16 5v14"/>,
  play: <path d="m8 4 12 8-12 8Z"/>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  retry: <><path d="M3 10a9 9 0 1 1 1 7M3 3v7h7"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/></>,
  settings: <><path d="m9 3-1 3-3 1-2 4 2 2v3l4 3 3-1 3 1 4-3v-3l2-2-2-4-3-1-1-3Z"/><circle cx="12" cy="11" r="3"/></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
  check: <path d="m5 12 4 4L20 5"/>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></>,
  back: <path d="m10 5-7 7 7 7M3 12h18"/>,
  right: <path d="m9 5 7 7-7 7"/>,
  left: <path d="m15 5-7 7 7 7"/>,
  library: <><path d="M4 4v16h5V4ZM13 5l5-1 3 15-5 1Z"/></>,
  grid: <path d="M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z"/>
};
export function Icon({ name }: { name: keyof typeof paths }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}
