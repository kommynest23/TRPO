import { useEffect, useRef, useState } from 'react';
import styles from './Timer.module.css';

interface Props {
  deadline: number;
  durationSec: number;
  onExpire: () => void;
}

const TICK_MS = 100;

/**
 * Таймер обратного отсчёта. Срок ответа общий для индикации и подсчёта очков.
 */
export function Timer({ deadline, durationSec, onExpire }: Props) {
  const [remainingMs, setRemainingMs] = useState(durationSec * 1000);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const left = Math.max(0, deadline - performance.now());
      setRemainingMs(left);
      if (left === 0) {
        window.clearInterval(id);
        onExpireRef.current();
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [deadline]);

  const fraction = remainingMs / (durationSec * 1000);
  const seconds = Math.ceil(remainingMs / 1000);
  const urgent = seconds <= 5;

  return (
    <div className={styles.timer} role="timer" aria-label={`Осталось ${seconds} секунд`}>
      <div className={styles.track}>
        <div
          className={`${styles.bar} ${urgent ? styles.urgent : ''}`}
          style={{ transform: `scaleX(${fraction})` }}
        />
      </div>
      <span className={`${styles.seconds} ${urgent ? styles.urgentText : ''}`}>{seconds}</span>
    </div>
  );
}
