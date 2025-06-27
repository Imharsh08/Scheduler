
// The original list of colors to be used as a fallback or default.
const defaultColors = [
  'bg-sky-100 border-sky-300',
  'bg-emerald-100 border-emerald-300',
  'bg-amber-100 border-amber-300',
  'bg-rose-100 border-rose-300',
  'bg-violet-100 border-violet-300',
  'bg-lime-100 border-lime-300',
  'bg-cyan-100 border-cyan-300',
  'bg-fuchsia-100 border-fuchsia-300',
  'bg-orange-100 border-orange-300',
  'bg-teal-100 border-teal-300',
];

/**
 * Gets the color class for a given press number.
 * It first checks for a user-defined color in the pressColors map.
 * If not found, it falls back to a default, programmatically assigned color.
 * @param pressNo The press number.
 * @param pressColors An optional map of user-defined colors for presses.
 * @returns A string of Tailwind CSS classes for the color.
 */
export const getPressColorClass = (pressNo: number, pressColors?: Record<number, string>): string => {
  // 1. Check for a user-defined color first.
  if (pressColors && pressColors[pressNo]) {
    return pressColors[pressNo];
  }

  // 2. Fallback to the default generative logic if no custom color is set.
  // Use a non-zero number for the modulo to avoid division by zero.
  const index = pressNo > 0 ? (pressNo - 1) % defaultColors.length : 0;
  return defaultColors[index];
};
