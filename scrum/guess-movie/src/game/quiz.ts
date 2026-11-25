import type { Question, QuestionType } from '../types/question';
import { shuffle } from './shuffle';

export const ROUND_SIZE = 10;
export const ANSWER_TIME_SEC = 15;
export const REVEAL_TIME_SEC = 3;

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
}

export type QuizPhase = 'answering' | 'reveal' | 'finished';

export interface QuizState {
  questions: Question[];
  index: number;
  phase: QuizPhase;
  answers: AnswerRecord[];
  score: number;
}

export type QuizAction =
  | { type: 'answer'; option: string }
  | { type: 'timeout' }
  | { type: 'next' };

export function createQuizState(questions: Question[]): QuizState {
  return { questions, index: 0, phase: 'answering', answers: [], score: 0 };
}

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'answer':
    case 'timeout': {
      if (state.phase !== 'answering') return state;
      const question = state.questions[state.index];
      const selected = action.type === 'answer' ? action.option : null;
      const correct = selected === question.correct;
      return {
        ...state,
        phase: 'reveal',
        answers: [...state.answers, { questionId: question.id, selected, correct }],
        score: state.score + (correct ? 1 : 0),
      };
    }
    case 'next': {
      if (state.phase !== 'reveal') return state;
      const nextIndex = state.index + 1;
      if (nextIndex >= state.questions.length) return { ...state, phase: 'finished' };
      return { ...state, index: nextIndex, phase: 'answering' };
    }
  }
}

/** Короткий комментарий к итоговому счёту. */
export function resultVerdict(score: number, total: number): string {
  const ratio = total === 0 ? 0 : score / total;
  if (ratio === 1) return 'Безупречно! Вы настоящий киноман.';
  if (ratio >= 0.7) return 'Отличный результат — вы явно много смотрите.';
  if (ratio >= 0.4) return 'Неплохо! Ещё пара вечеров с кино — и будет рекорд.';
  return 'Есть куда расти. Попробуйте ещё раз!';
}
