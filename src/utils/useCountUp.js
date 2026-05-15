import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion.js';

export function useCountUp(target, { start, enabled = false, duration = 520, onComplete } = {}) {
  const reducedMotion = usePrefersReducedMotion();
  const onCompleteRef = useRef(onComplete);
  const from = start ?? target;
  const [value, setValue] = useState(enabled && !reducedMotion ? from : target);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!enabled || reducedMotion) {
      setValue(target);
      return undefined;
    }

    if (from === target) {
      setValue(target);
      onCompleteRef.current?.();
      return undefined;
    }

    let frame = 0;
    let startTime = 0;
    setValue(from);

    const tick = (now) => {
      if (!startTime) startTime = now;
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(from + (target - from) * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setValue(target);
        onCompleteRef.current?.();
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, from, enabled, duration, reducedMotion]);

  return value;
}
