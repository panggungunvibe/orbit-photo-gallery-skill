export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const TAU = Math.PI * 2;
export function wrapAngle(angle) { return ((angle + Math.PI) % TAU + TAU) % TAU - Math.PI; }
export function cardPose(index, count, angle, radius) {
  const theta = index * TAU / count + angle;
  const facing = Math.cos(theta);
  return { theta, x: Math.sin(theta) * radius, z: facing * radius, facing,
    opacity: facing > 0 ? .38 + .62 * Math.min(1, facing * 3) : .065 + .035 * (1 + facing),
    interactive: facing > .16 };
}
export function layoutFor(width, height, count = 12) {
  const mobile = width <= 700;
  const cardHeight = mobile ? clamp(height * .28, 150, 235) : Math.min(height * .44, width * .285, 450);
  const cardWidth = cardHeight * 2 / 3;
  const radius = (cardWidth + cardWidth * .1) / (2 * Math.tan(Math.PI / Math.max(8,count)));
  const fit = mobile ? Math.min(1, width * 1.12 / (radius * 2 + cardWidth)) : Math.min(1, width * .75 / (radius * 1.9));
  return { cardHeight, cardWidth, radius, fit, perspective: Math.max(850, width * 1.35), mobile };
}
