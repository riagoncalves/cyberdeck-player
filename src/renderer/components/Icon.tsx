// Line icons on a 24-unit grid, drawn for this app.
const PATHS = {
  play: 'M7 4.5v15l12-7.5z',
  pause: 'M7 4.5h3.5v15H7zM13.5 4.5H17v15h-3.5z',
  next: 'M5 5v14l9-7zM17 5h2v14h-2z',
  prev: 'M19 5v14l-9-7zM5 5h2v14H5z',
  shuffle: 'M3 7h4l10 10h4M17 4l4 3-4 3M3 17h4l3-3M14 10l3-3h4M17 14l4 3-4 3',
  repeat: 'M4 11V8a2 2 0 0 1 2-2h13l-3-3M20 13v3a2 2 0 0 1-2 2H5l3 3',
  volume: 'M4 9.5h4L13 5v14l-5-4.5H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12',
  mute: 'M4 9.5h4L13 5v14l-5-4.5H4zM17 9.5l5 5M22 9.5l-5 5',
  heart: 'M12 20s-8-4.8-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.2 12 20 12 20z',
  home: 'M3.5 11L12 3.5l8.5 7.5M6 9.5V20h12V9.5',
  search: 'M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM15.5 15.5L21 21',
  library: 'M4 4h3v16H4zM10 4h3v16h-3zM15.5 5l3-1 3 15.5-3 1z',
  podcast: 'M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7',
  album: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z',
  queue: 'M4 6h12M4 11h12M4 16h7M18 13v7M15 17l3 3 3-3',
  devices: 'M3 5h13v10H3zM7 19h5M9.5 15v4M18 9h3v10h-3z',
  back: 'M15 5l-7 7 7 7',
  forward: 'M9 5l7 7-7 7',
  close: 'M6 6l12 12M18 6L6 18',
  minimize: 'M5 12h14',
  maximize: 'M5 5h14v14H5z',
  plus: 'M12 5v14M5 12h14',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps {
  name: IconName;
  size?: number;
  filled?: boolean;
  className?: string;
}

export function Icon({ name, size = 18, filled = false, className }: IconProps) {
  const solid = filled || name === 'play' || name === 'pause' || name === 'next' || name === 'prev';
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill={solid ? 'currentColor' : 'none'}
      stroke='currentColor'
      strokeWidth={solid ? 0 : 1.8}
      strokeLinecap='square'
      strokeLinejoin='miter'
      aria-hidden='true'
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
