import { useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { ReviewSlider, type ReviewItem } from '../components/ReviewSlider';
import { resultVerdict } from '../game/quiz';
import { QUESTION_TYPE_LABELS } from '../types/question';
import styles from './ResultPage.module.css';

/** Данные, которые экран игры передаёт сюда через состояние роутера. */
export interface ResultState {
  score: number;
  total: number;
  items: ReviewItem[];
}

export function ResultPage() {
  const navigate = useNavigate();
  const result = useLocation().state as ResultState | null;
  const [slide, setSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Зашли на /result напрямую, без сыгранного раунда.
  if (!result) return <Navigate to="/" replace />;

  const { score, total, items } = result;

  const openInSlider = (i: number) => {
    setSlide(i);
    sliderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <main className={styles.page}>
      <p className={styles.eyebrow}>Раунд завершён</p>
      <div className={styles.score}>
        <span className={styles.scoreValue}>{score}</span>
        <span className={styles.scoreTotal}>/ {total}</span>
      </div>
      <p className={styles.verdict}>{resultVerdict(score, total)}</p>

      <div className={styles.actions}>
        <Button size="lg" onClick={() => navigate('/play')} autoFocus>
          ↻ Сыграть ещё
        </Button>
        <Button variant="secondary" onClick={() => navigate('/')}>
          На главную
        </Button>
      </div>

      <ol className={styles.list}>
        {items.map(({ question, correct }, i) => (
          <li key={question.id}>
            <button
              type="button"
              className={`${styles.item} ${i === slide ? styles.itemActive : ''}`}
              onClick={() => openInSlider(i)}
              title="Открыть вопрос в слайдере"
            >
              <span className={correct ? styles.ok : styles.fail} aria-label={correct ? 'Верно' : 'Неверно'}>
                {correct ? '✓' : '✗'}
              </span>
              <span className={styles.itemTitle}>
                {question.correct} <span className={styles.muted}>({question.year})</span>
              </span>
              <span className={styles.itemType}>{QUESTION_TYPE_LABELS[question.type]}</span>
            </button>
          </li>
        ))}
      </ol>

      <h2 className={styles.sectionTitle}>Разбор вопросов</h2>
      <div ref={sliderRef} className={styles.sliderAnchor}>
        <ReviewSlider items={items} index={slide} onIndexChange={setSlide} />
      </div>
    </main>
  );
}
