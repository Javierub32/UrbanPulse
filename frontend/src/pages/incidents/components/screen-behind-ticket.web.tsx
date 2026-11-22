import type { PropsWithChildren } from 'react';

export function ScreenBehindTicket({ hidden, children }: PropsWithChildren<{ hidden: boolean }>) {
  return <div inert={hidden} aria-hidden={hidden} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, position: 'relative' }}>{children}</div>;
}
