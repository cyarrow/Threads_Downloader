// Gesture physics shared by the UI thread (as worklets) and by plain-JS rules
// that Node tests import, so no React Native imports here.

// Where a flick would come to rest if it kept decelerating (Apple's exponential
// decay). `velocity` in points per second, as gesture handlers report it.
export function project(velocity, decelerationRate = 0.998) {
  'worklet';
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

// Past an edge the element follows less and less instead of stopping dead.
export function rubberband(overshoot, dimension, constant = 0.55) {
  'worklet';
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
