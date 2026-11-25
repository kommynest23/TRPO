import { useEffect, useRef, useState } from 'react';
import styles from './Timer.module.css';

interface Props {
  durationSec: number;
  onExpire: () => void;
}

const TICK_MS = 100;

/**
 * Таймер обратного отсчёта. Отсчёт идёт с момента монтирования;
 * для нового вопроса родитель пересоздаёт компонент через `key`.
 */
export function Timer({ durationSec, onExpire }: Props) {
  const [remainingMs, setRemainingMs] = useState(durationSec * 1000);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const deadline = Date.now() + durationSec * 1000;
    const id = window.setInterval(() => {
      const left = Math.max(0, deadline - Date.now());
      setRemainingMs(left);
      if (left === 0) {
        window.clearInterval(id);
        onExpireRef.current();
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [durationSec]);

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
