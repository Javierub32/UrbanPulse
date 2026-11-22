export function getTicketCutOffset(cutPosition: number, viewportHeight: number, currentOffset: number) {
  const position = cutPosition - currentOffset;
  const bottom = viewportHeight - Math.min(160, viewportHeight / 3);
  const top = Math.min(32, bottom / 2);
  return position > bottom || position < top
    ? Math.max(0, cutPosition - bottom)
    : currentOffset;
}
