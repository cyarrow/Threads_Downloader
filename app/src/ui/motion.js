import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { Easing } from 'react-native-reanimated';

// Motion tokens (Reanimated). The built-in curves are too weak for UI; these are
// the strong ones every animation in the app uses.
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1); // entering / exiting UI
// The same curve for Reanimated CSS transitions (press feedback).
export const EASE_OUT_CSS = 'cubic-bezier(0.23, 1, 0.32, 1)';

// Springs in Apple's two designer parameters (duration in ms, damping ratio).
export const SPRING_SETTLE = { duration: 400, dampingRatio: 0.8 }; // snap back after a drag
export const SPRING_SHEET = { duration: 300, dampingRatio: 0.8 }; // sheet open / snap home

export { project, rubberband } from './physics';

export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}
