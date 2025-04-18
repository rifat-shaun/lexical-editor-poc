export const darkenColor = (color: string, amount: number): string => {
  // Handle special cases
  if (color === '#000000' || color === '#000') return '#ffffff';
  if (color === '#ffffff' || color === '#fff') return '#000000';

  // Remove the # if present
  const hex = color.replace('#', '');

  // Convert to RGB
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  // Darken each component
  r = Math.max(0, Math.round(r * (1 - amount)));
  g = Math.max(0, Math.round(g * (1 - amount)));
  b = Math.max(0, Math.round(b * (1 - amount)));

  // Convert back to hex
  const darkened =
    '#' +
    r.toString(16).padStart(2, '0') +
    g.toString(16).padStart(2, '0') +
    b.toString(16).padStart(2, '0');

  return darkened;
};
