import styles from './AnswerOptions.module.css';

interface Props {
  options: readonly string[];
  correct: string;
  /** Выбранный игроком вариант; null — ещё не ответил или время вышло. */
  selected: string | null;
  /** Показывать ли правильный ответ (фаза показа ответа). */
  revealed: boolean;
  onSelect?: (option: string) => void;
}

export function AnswerOptions({ options, correct, selected, revealed, onSelect }: Props) {
  return (
    <div className={styles.grid}>
      {options.map((option, i) => {
        let state = '';
        if (revealed) {
          if (option === correct) state = styles.correct;
          else if (option === selected) state = styles.wrong;
          else state = styles.dimmed;
        }
        return (
          <button
            key={option}
            type="button"
            className={`${styles.option} ${state}`}
            onClick={() => onSelect?.(option)}
            disabled={revealed}
          >
            <span className={styles.key} aria-hidden="true">
              {i + 1}
            </span>
            <span className={styles.label}>{option}</span>
          </button>
        );
      })}
    </div>
  );
}
