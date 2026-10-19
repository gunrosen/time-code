export function toGray(n: number): number {
  return (n ^ (n >>> 1)) >>> 0;
}

export function fromGray(g: number): number {
  let n = g;
  for (let shift = g >>> 1; shift; shift >>>= 1) n ^= shift;
  return n >>> 0;
}

// Most significant bit first.
export function toBits(n: number, width: number): boolean[] {
  const bits: boolean[] = [];
  for (let i = width - 1; i >= 0; i--) bits.push(((n >>> i) & 1) === 1);
  return bits;
}
