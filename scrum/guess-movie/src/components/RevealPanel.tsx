import { Button } from './Button';
import styles from './RevealPanel.module.css';

export type RevealStatus = 'correct' | 'wrong' | 'timeout';

interface Props {
  status: RevealStatus;
  title: string;
  year: number;
  points: number;
  /** Через сколько секунд произойдёт автопереход (для полоски прогресса). */
  durationSec: number;
  isLast: boolean;
  onNext: () => void;
}

const STATUS_TEXT: Record<RevealStatus, string> = {
  correct: 'Верно!',
  wrong: 'Мимо',
  timeout: 'Время вышло',
};

/** Экран правильного ответа: название фильма и отсчёт до следующего вопроса. */
export function RevealPanel({ status, title, year, points, durationSec, isLast, onNext }: Props) {
  return (
    <section className={`${styles.panel} ${styles[status]}`} aria-live="polite">
      <div className={styles.body}>
        <p className={styles.status}>
          {STATUS_TEXT[status]}{points > 0 && ` +${points} очков`}
        </p>
        <h2 className={styles.title}>
          {title} <span className={styles.year}>({year})</span>
        </h2>
      </div>
      <Button variant="secondary" onClick={onNext}>
        {isLast ? 'Итоги' : 'Дальше'} →
      </Button>
      <div className={styles.progress} style={{ animationDuration: `${durationSec}s` }} />
    </section>
  );
}
