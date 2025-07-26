/* Utility to grab a random float in range */
const rand = (min, max) => Math.random() * (max - min) + min;

/* Create and launch a single ember */
function createEmber() {
  const ember = document.createElement('span');
  ember.className = 'ember';

  // Randomise size, horizontal position, speed, transparency
  const size = rand(2, 6);
  ember.style.width = ember.style.height = `${size}px`;
  ember.style.left = `${rand(0, 100)}vw`;
  ember.style.opacity = rand(0.6, 1);

  // Place ember at the bottom edge of the visible window (document coordinates)
  ember.style.top = `${window.scrollY + window.innerHeight}px`;

  const duration = rand(2.5, 5); // seconds
  ember.style.animationDuration = `${duration}s`;

  document.body.appendChild(ember);

  // Remove node once its animation completes to keep DOM tidy
  setTimeout(() => ember.remove(), duration * 1000);
}

/* Continually spawn embers */
setInterval(createEmber, 120); // lower = more embers

/* Optional: throttle when tab inactive to save CPU */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearInterval(spawner);
  else spawner = setInterval(createEmber, 120);
});
