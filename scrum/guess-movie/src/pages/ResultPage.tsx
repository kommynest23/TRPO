import { useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { ReviewSlider, type ReviewItem } from '../components/ReviewSlider';
import { ScoringRules } from '../components/ScoringRules';
import { BASE_POINTS, MAX_SPEED_BONUS, resultVerdict } from '../game/quiz';
import { QUESTION_TYPE_LABELS } from '../types/question';
import styles from './ResultPage.module.css';

/** Данные, которые экран игры передаёт сюда через состояние роутера. */
export interface ResultState {
  points: number;
  total: number;
  items: ReviewItem[];
}

export function ResultPage() {
  const navigate = useNavigate();
  const { state, search } = useLocation();
  const result = state as ResultState | null;
  const [slide, setSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Зашли на /result напрямую, без сыгранного раунда.
  if (!result) return <Navigate to="/" replace />;

  const { points, total, items } = result;
  const correctCount = items.filter(({ correct }) => correct).length;

  const openInSlider = (i: number) => {
    setSlide(i);
    sliderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <main className={styles.page}>
      <p className={styles.eyebrow}>Раунд завершён</p>
      <div className={styles.score} aria-label={`Верных ответов: ${correctCount} из ${total}`}>
        <span className={styles.scoreValue}>{correctCount}</span>
        <span className={styles.scoreTotal}>/ {total}</span>
      </div>
      <p className={styles.verdict}>{resultVerdict(correctCount, total)}</p>
      {typeof points === 'number' && (
        <>
          <p className={styles.points}>
            Очки: <strong>{points}</strong> из {total * (BASE_POINTS + MAX_SPEED_BONUS)}
            {' · '}Бонус за скорость: +{points - correctCount * BASE_POINTS}
          </p>
          <ScoringRules />
        </>
      )}

      <div className={styles.actions}>
        <Button size="lg" onClick={() => navigate({ pathname: '/play', search })} autoFocus>
          ↻ Сыграть ещё
        </Button>
        <Button variant="secondary" onClick={() => navigate({ pathname: '/catalog', search })}>
          В каталог
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
