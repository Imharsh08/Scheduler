export const getPressColorClass = (pressNo: number): string => {
  const colors = [
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
  
  // Use a non-zero number for the modulo to avoid division by zero.
  const index = pressNo > 0 ? (pressNo - 1) % colors.length : 0;
  return colors[index];
};
