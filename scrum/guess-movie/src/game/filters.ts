import {
  DIFFICULTY_LABELS,
  GENRE_LABELS,
  QUESTION_TYPE_LABELS,
  type Question,
} from '../types/question';

export const FILTER_OPTIONS = {
  type: QUESTION_TYPE_LABELS,
  genre: GENRE_LABELS,
  difficulty: DIFFICULTY_LABELS,
};

export type QuizFilters = Partial<Pick<Question, keyof typeof FILTER_OPTIONS>>;

function readOption<T extends string>(
  options: Record<T, string>,
  value: string | null,
): T | undefined {
  return value !== null && Object.prototype.hasOwnProperty.call(options, value)
    ? (value as T)
    : undefined;
}

export function readFilters(params: URLSearchParams): QuizFilters {
  return {
    type: readOption(FILTER_OPTIONS.type, params.get('type')),
    genre: readOption(FILTER_OPTIONS.genre, params.get('genre')),
    difficulty: readOption(FILTER_OPTIONS.difficulty, params.get('difficulty')),
  };
}

export function filterQuestions(bank: readonly Question[], filters: QuizFilters): Question[] {
  return bank.filter(
    (question) =>
      (!filters.type || question.type === filters.type) &&
      (!filters.genre || question.genre === filters.genre) &&
      (!filters.difficulty || question.difficulty === filters.difficulty),
  );
}
