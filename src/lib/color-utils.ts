
export const COLOR_NAMES = [
  'sky',
  'emerald',
  'amber',
  'rose',
  'violet',
  'lime',
  'cyan',
  'fuchsia',
  'orange',
  'teal',
  'indigo',
  'yellow',
  'pink',
  'slate',
];

export const COLOR_PALETTE = COLOR_NAMES.map(name => `color-swatch-${name}`);


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
