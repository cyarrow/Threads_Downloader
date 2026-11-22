import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Apple describes springs by response (seconds) and damping ratio (1 = no overshoot).
// React Native's Animated.spring wants stiffness/damping, so convert (mass = 1).
export function spring(response = 0.35, dampingRatio = 1) {
  return {
    stiffness: (2 * Math.PI / response) ** 2,
    damping: (4 * Math.PI * dampingRatio) / response,
    mass: 1,
    useNativeDriver: true,
  };
}

export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}
