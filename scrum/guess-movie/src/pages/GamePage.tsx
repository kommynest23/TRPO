import { useCallback, useEffect, useReducer } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnswerOptions } from '../components/AnswerOptions';
import { QuestionMedia } from '../components/QuestionMedia';
import { RevealPanel, type RevealStatus } from '../components/RevealPanel';
import { Timer } from '../components/Timer';
import { QUESTIONS } from '../data/questions';
import {
  ANSWER_TIME_SEC,
  buildRound,
  createQuizState,
  quizReducer,
  REVEAL_TIME_SEC,
} from '../game/quiz';
import { QUESTION_TYPE_LABELS, QUESTION_TYPE_PROMPTS } from '../types/question';
import type { ResultState } from './ResultPage';
import styles from './GamePage.module.css';

export function GamePage() {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(quizReducer, undefined, () =>
    createQuizState(buildRound(QUESTIONS)),
  );

  const { questions, index, phase, answers, score } = state;
  const question = questions[index];
  const answer = phase === 'reveal' ? answers[index] : undefined;

  const handleSelect = useCallback((option: string) => dispatch({ type: 'answer', option }), []);
  const handleTimeout = useCallback(() => dispatch({ type: 'timeout' }), []);
  const handleNext = useCallback(() => dispatch({ type: 'next' }), []);

  // Автопереход к следующему вопросу после показа правильного ответа.
  useEffect(() => {
    if (phase !== 'reveal') return;
    const id = window.setTimeout(handleNext, REVEAL_TIME_SEC * 1000);
    return () => window.clearTimeout(id);
  }, [phase, index, handleNext]);

  // Новый вопрос — возвращаемся к началу страницы, если игрок прокрутил вниз.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [index]);

  // Конец раунда — на экран результата.
  useEffect(() => {
    if (phase !== 'finished') return;
    const result: ResultState = {
      score,
      total: questions.length,
      items: questions.map((q, i) => ({
        question: q,
        selected: answers[i]?.selected ?? null,
        correct: answers[i]?.correct ?? false,
      })),
    };
    navigate('/result', { replace: true, state: result });
  }, [phase, score, questions, answers, navigate]);

  // Ответ с клавиатуры: клавиши 1–4.
  useEffect(() => {
    if (phase !== 'answering') return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= question.options.length) handleSelect(question.options[n - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, question, handleSelect]);

  if (phase === 'finished') return null;

  let revealStatus: RevealStatus = 'timeout';
  if (answer?.correct) revealStatus = 'correct';
  else if (answer?.selected) revealStatus = 'wrong';

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          Угадай кино
        </Link>
        <div className={styles.meta}>
          <span className={styles.counter}>
            Вопрос <strong>{index + 1}</strong> / {questions.length}
          </span>
          <span className={styles.score}>Очки: {score}</span>
        </div>
      </header>

      {/* key по id: карточка пересоздаётся и плавно появляется на месте предыдущей. */}
      <section key={question.id} className={styles.card}>
        <div className={styles.prompt}>
          <span className={styles.badge}>{QUESTION_TYPE_LABELS[question.type]}</span>
          <h1 className={styles.question}>{QUESTION_TYPE_PROMPTS[question.type]}</h1>
        </div>

        <div className={styles.stage}>
          <QuestionMedia media={question.media} autoPlay />
          {phase === 'reveal' && (
            <RevealPanel
              status={revealStatus}
              title={question.correct}
              year={question.year}
              durationSec={REVEAL_TIME_SEC}
              isLast={index === questions.length - 1}
              onNext={handleNext}
            />
          )}
        </div>

        {/* Слот таймера фиксированной высоты — после ответа место остаётся, вёрстка не сдвигается. */}
        <div className={styles.timerSlot}>
          {phase === 'answering' && <Timer durationSec={ANSWER_TIME_SEC} onExpire={handleTimeout} />}
        </div>

        <AnswerOptions
          options={question.options}
          correct={question.correct}
          selected={answer?.selected ?? null}
          revealed={phase === 'reveal'}
          onSelect={handleSelect}
        />
      </section>
    </main>
  );
}
