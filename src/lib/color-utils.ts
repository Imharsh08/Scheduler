
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

// New palette with corresponding hex codes for chart fills.
// These are the base colors (e.g., sky-300) from the classes above.
export const CHART_COLOR_PALETTE: string[] = [
  '#7DD3FC', // sky-300
  '#6EE7B7', // emerald-300
  '#FCD34D', // amber-300
  '#FDA4AF', // rose-300
  '#C4B5FD', // violet-300
  '#86EFAC', // lime-300
  '#67E8F9', // cyan-300
  '#F0ABFC', // fuchsia-300
  '#FDBA74', // orange-300
  '#5EEAD4', // teal-300
  '#A5B4FC', // indigo-300
  '#FDE047', // yellow-300
  '#F9A8D4', // pink-300
  '#CBD5E1', // slate-300
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

/**
 * Gets the chart-compatible color value (e.g., hex code) for a given die number.
 * It maps the selected CSS class to a corresponding hex color.
 * @param dieNo The die number.
 * @param dieColors An optional map of user-defined colors for dies (maps to CSS classes).
 * @returns A string with the hex color code.
 */
export const getDieChartColor = (dieNo: number, dieColors?: Record<number, string>): string => {
  // 1. Check for a user-defined color and map it to a chart color.
  if (dieColors && dieColors[dieNo]) {
    const className = dieColors[dieNo];
    const colorIndex = COLOR_PALETTE.indexOf(className);
    if (colorIndex !== -1 && colorIndex < CHART_COLOR_PALETTE.length) {
        return CHART_COLOR_PALETTE[colorIndex];
    }
  }

  // 2. Fallback to the default generative logic if no custom color is set or found.
  const index = dieNo > 0 ? (dieNo - 1) % CHART_COLOR_PALETTE.length : 0;
  return CHART_COLOR_PALETTE[index];
};
