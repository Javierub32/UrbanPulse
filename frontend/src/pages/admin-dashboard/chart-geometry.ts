export type Point = { x: number; y: number };

const round = (value: number) => Math.round(value * 100) / 100;

/** Curva monótona en X: suaviza sin sobrepasar los valores reales (nunca baja de cero). */
export function monotonePath(points: Point[]) {
  const count = points.length;
  if (count === 0) return '';
  if (count === 1) return `M ${round(points[0].x)} ${round(points[0].y)}`;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < count - 1; i++) {
    dx.push(points[i + 1].x - points[i].x);
    slope.push((points[i + 1].y - points[i].y) / dx[i]);
  }
  const tangent = new Array<number>(count);
  tangent[0] = slope[0];
  tangent[count - 1] = slope[count - 2];
  for (let i = 1; i < count - 1; i++) {
    tangent[i] =
      slope[i - 1] * slope[i] <= 0
        ? 0
        : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / slope[i - 1] + (dx[i] + 2 * dx[i - 1]) / slope[i]);
  }
  let path = `M ${round(points[0].x)} ${round(points[0].y)}`;
  for (let i = 0; i < count - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    path += ` C ${round(a.x + dx[i] / 3)} ${round(a.y + (tangent[i] * dx[i]) / 3)} ${round(b.x - dx[i] / 3)} ${round(b.y - (tangent[i + 1] * dx[i]) / 3)} ${round(b.x)} ${round(b.y)}`;
  }
  return path;
}

/** Máximo redondeado del eje vertical; su mitad también es un entero. */
export function niceMax(value: number) {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const factor = [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10].find((candidate) => candidate * magnitude >= value) ?? 10;
  return Math.round(factor * magnitude);
}
