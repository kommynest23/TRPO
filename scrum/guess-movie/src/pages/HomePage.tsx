import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { ScoringRules } from '../components/ScoringRules';
import { ANSWER_TIME_SEC, ROUND_SIZE } from '../game/quiz';
import { QUESTION_TYPE_LABELS } from '../types/question';
import styles from './HomePage.module.css';

const TYPE_ICONS = { frame: '🎞', poster: '🖼', quote: '💬', soundtrack: '♫' } as const;

export function HomePage() {
  const navigate = useNavigate();

  return (
    <main className={styles.page}>
      <p className={styles.eyebrow}>Кино-викторина</p>
      <h1 className={styles.title}>Угадай кино</h1>
      <p className={styles.lead}>
        {ROUND_SIZE} вопросов вперемешку: кадры, постеры, цитаты и саундтреки. На каждый вопрос —{' '}
        {ANSWER_TIME_SEC} секунд и четыре варианта ответа.
      </p>

      <ScoringRules />

      <div className={styles.actions}>
        <Button size="lg" onClick={() => navigate('/play')} autoFocus>
          ▶ Играть
        </Button>
        <Button size="lg" variant="secondary" onClick={() => navigate('/catalog')}>
          Каталог викторин
        </Button>
      </div>

      <ul className={styles.types}>
        {(Object.keys(QUESTION_TYPE_LABELS) as (keyof typeof QUESTION_TYPE_LABELS)[]).map((type) => (
          <li key={type} className={styles.type}>
            <span aria-hidden="true">{TYPE_ICONS[type]}</span> {QUESTION_TYPE_LABELS[type]}
          </li>
        ))}
      </ul>
    </main>
  );
}
