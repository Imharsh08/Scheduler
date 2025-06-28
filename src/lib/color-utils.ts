
export const COLOR_PALETTE: string[] = [
  'bg-sky-300 border-sky-500',
  'bg-emerald-300 border-emerald-500',
  'bg-amber-300 border-amber-500',
  'bg-rose-300 border-rose-500',
  'bg-violet-300 border-violet-500',
  'bg-lime-300 border-lime-500',
  'bg-cyan-300 border-cyan-500',
  'bg-fuchsia-300 border-fuchsia-500',
  'bg-orange-300 border-orange-500',
  'bg-teal-300 border-teal-500',
  'bg-indigo-300 border-indigo-500',
  'bg-yellow-300 border-yellow-500',
  'bg-pink-300 border-pink-500',
  'bg-slate-300 border-slate-500',
];


/**
 * Gets the color class for a given die number.
 * It first checks for a user-defined color in the dieColors map.
 * If not found, it falls back to a default, programmatically assigned color.
 * @param dieNo The die number.
 * @param dieColors An optional map of user-defined colors for dies.
 * @returns A string of Tailwind CSS classes for the color.
 */
export const getDieColorClass = (dieNo: number, dieColors?: Record<number, string>): string => {
  // 1. Check for a user-defined color first.
  if (dieColors && dieColors[dieNo]) {
    return dieColors[dieNo];
  }

  // 2. Fallback to the default generative logic if no custom color is set.
  // Use a non-zero number for the modulo to avoid division by zero.
  const index = dieNo > 0 ? (dieNo - 1) % COLOR_PALETTE.length : 0;
  return COLOR_PALETTE[index];
};
