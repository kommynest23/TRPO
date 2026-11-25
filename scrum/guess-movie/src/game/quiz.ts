import type { Question, QuestionType } from '../types/question';
import { shuffle } from './shuffle';

export const ROUND_SIZE = 10;
export const ANSWER_TIME_SEC = 15;
export const REVEAL_TIME_SEC = 3;
export const BASE_POINTS = 100;
export const MAX_SPEED_BONUS = 50;
export const SPEED_BONUS_GRACE_SEC = 2;
export const SPEED_BONUS_DECAY_SEC = ANSWER_TIME_SEC - SPEED_BONUS_GRACE_SEC;

/**
 * Собирает смешанный раунд: вопросы разных типов берутся по очереди
 * (кадр, цитата, постер, …), чтобы в раунде были все типы, затем порядок
 * перемешивается. Варианты ответа в каждом вопросе тоже перемешиваются.
 */
export function buildRound(
  bank: readonly Question[],
  size: number = ROUND_SIZE,
  rng: () => number = Math.random,
): Question[] {
  const groups = new Map<QuestionType, Question[]>();
  for (const q of shuffle(bank, rng)) {
    const group = groups.get(q.type) ?? [];
    group.push(q);
    groups.set(q.type, group);
  }

  const picked: Question[] = [];
  const queues = shuffle([...groups.values()], rng);
  while (picked.length < size && queues.some((g) => g.length > 0)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next && picked.length < size) picked.push(next);
    }
  }

  return shuffle(picked, rng).map((q) => ({
    ...q,
    options: shuffle(q.options, rng) as Question['options'],
  }));
}

export interface AnswerRecord {
  questionId: string;
  /** null — время вышло, ответа не было. */
  selected: string | null;
  correct: boolean;
  points: number;
}

export type QuizPhase = 'answering' | 'reveal' | 'finished';

export interface QuizState {
  questions: Question[];
  index: number;
  phase: QuizPhase;
  deadline: number;
  answers: AnswerRecord[];
  score: number;
}

export type QuizAction =
  | { type: 'answer'; option: string; now: number }
  | { type: 'timeout' }
  | { type: 'next'; now: number };

export function createQuizState(questions: Question[], now: number): QuizState {
  return {
    questions,
    index: 0,
    phase: 'answering',
    deadline: now + ANSWER_TIME_SEC * 1000,
    answers: [],
    score: 0,
  };
}

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'answer':
    case 'timeout': {
      if (state.phase !== 'answering') return state;
      const question = state.questions[state.index];
      const remainingMs = action.type === 'answer' ? state.deadline - action.now : 0;
      const selected = action.type === 'answer' && remainingMs > 0 ? action.option : null;
      const correct = selected === question.correct;
      const fraction = Math.min(1, remainingMs / (SPEED_BONUS_DECAY_SEC * 1000));
      const points = correct ? BASE_POINTS + Math.round(MAX_SPEED_BONUS * fraction) : 0;
      return {
        ...state,
        phase: 'reveal',
        answers: [...state.answers, { questionId: question.id, selected, correct, points }],
        score: state.score + points,
      };
    }
    case 'next': {
      if (state.phase !== 'reveal') return state;
      const nextIndex = state.index + 1;
      if (nextIndex >= state.questions.length) return { ...state, phase: 'finished' };
      return {
        ...state,
        index: nextIndex,
        phase: 'answering',
        deadline: action.now + ANSWER_TIME_SEC * 1000,
      };
    }
  }
}

/** Короткий комментарий к доле верных ответов. */
export function resultVerdict(correctCount: number, total: number): string {
  const ratio = total === 0 ? 0 : correctCount / total;
  if (ratio === 1) return 'Безупречно! Вы настоящий киноман.';
  if (ratio >= 0.7) return 'Отличный результат — вы явно много смотрите.';
  if (ratio >= 0.4) return 'Неплохо! Ещё пара вечеров с кино — и будет рекорд.';
  return 'Есть куда расти. Попробуйте ещё раз!';
}
