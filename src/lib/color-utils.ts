
export const COLOR_PALETTE = [
  'bg-sky-200 border-sky-400',
  'bg-emerald-200 border-emerald-400',
  'bg-amber-200 border-amber-400',
  'bg-rose-200 border-rose-400',
  'bg-violet-200 border-violet-400',
  'bg-lime-200 border-lime-400',
  'bg-cyan-200 border-cyan-400',
  'bg-fuchsia-200 border-fuchsia-400',
  'bg-orange-200 border-orange-400',
  'bg-teal-200 border-teal-400',
  'bg-indigo-200 border-indigo-400',
  'bg-yellow-200 border-yellow-400',
  'bg-pink-200 border-pink-400',
  'bg-slate-200 border-slate-400',
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
