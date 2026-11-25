import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import type { Question } from '../types/question';
import { QUESTION_TYPE_LABELS, QUESTION_TYPE_PROMPTS } from '../types/question';
import { AnswerOptions } from './AnswerOptions';
import { QuestionMedia } from './QuestionMedia';
import styles from './ReviewSlider.module.css';

export interface ReviewItem {
  question: Question;
  /** null — время вышло. */
  selected: string | null;
  correct: boolean;
}

interface Props {
  items: ReviewItem[];
  index: number;
  onIndexChange: (index: number) => void;
}

const SWIPE_THRESHOLD_PX = 50;

/** Слайдер для просмотра вопросов раунда после игры: стрелки, точки, клавиши ←/→, свайп. */
export function ReviewSlider({ items, index, onIndexChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const swipeStartX = useRef<number | null>(null);

  const go = (next: number) => onIndexChange(Math.min(items.length - 1, Math.max(0, next)));

  // При смене слайда останавливаем аудио, которое играло на предыдущем.
  useEffect(() => {
    trackRef.current?.querySelectorAll('audio').forEach((audio) => audio.pause());
  }, [index]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') go(index - 1);
    if (e.key === 'ArrowRight') go(index + 1);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') swipeStartX.current = e.clientX;
  };

  const onPointerUp = (e: PointerEvent) => {
    if (swipeStartX.current === null) return;
    const dx = e.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (Math.abs(dx) > SWIPE_THRESHOLD_PX) go(index + (dx < 0 ? 1 : -1));
  };

  return (
    <section
      className={styles.slider}
      aria-roledescription="карусель"
      aria-label="Вопросы раунда"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className={styles.toolbar}>
        <button type="button" className={styles.arrow} onClick={() => go(index - 1)} disabled={index === 0} aria-label="Предыдущий вопрос">
          ←
        </button>
        <span className={styles.counter}>
          Вопрос <strong>{index + 1}</strong> из {items.length}
        </span>
        <button
          type="button"
          className={styles.arrow}
          onClick={() => go(index + 1)}
          disabled={index === items.length - 1}
          aria-label="Следующий вопрос"
        >
          →
        </button>
      </div>

      <div className={styles.viewport} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        <div ref={trackRef} className={styles.track} style={{ transform: `translateX(-${index * 100}%)` }}>
          {items.map(({ question, selected, correct }, i) => (
            <article
              key={question.id}
              className={styles.slide}
              aria-roledescription="слайд"
              aria-label={`${i + 1} из ${items.length}`}
              inert={i !== index}
            >
              <div className={styles.prompt}>
                <span className={styles.badge}>{QUESTION_TYPE_LABELS[question.type]}</span>
                <span className={styles.question}>{QUESTION_TYPE_PROMPTS[question.type]}</span>
              </div>

              <QuestionMedia media={question.media} />

              <p className={`${styles.verdict} ${correct ? styles.ok : styles.fail}`}>
                {correct ? '✓ Верно' : selected ? `✗ Ваш ответ: ${selected}` : '✗ Время вышло'}
                <span className={styles.answer}>
                  {question.correct} ({question.year})
                </span>
              </p>

              <AnswerOptions options={question.options} correct={question.correct} selected={selected} revealed />
            </article>
          ))}
        </div>
      </div>

      <div className={styles.dots}>
        {items.map((item, i) => (
          <button
            key={item.question.id}
            type="button"
            className={`${styles.dot} ${item.correct ? styles.dotOk : styles.dotFail} ${i === index ? styles.dotActive : ''}`}
            onClick={() => go(i)}
            aria-label={`Вопрос ${i + 1}`}
            aria-current={i === index}
          />
        ))}
      </div>
    </section>
  );
}
