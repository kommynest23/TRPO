/** Тип вопроса: кадр из фильма, постер, цитата или саундтрек. */
export type QuestionType = 'frame' | 'poster' | 'quote' | 'soundtrack';

export type Genre =
  | 'drama'
  | 'comedy'
  | 'action'
  | 'sci-fi'
  | 'fantasy'
  | 'animation'
  | 'thriller'
  | 'crime';

export type Difficulty = 'easy' | 'medium' | 'hard';

/** Медиа вопроса: картинка, аудиофрагмент или текст (цитата). */
export type QuestionMedia =
  | { kind: 'image'; src: string; alt: string }
  | { kind: 'audio'; src: string }
  | { kind: 'text'; text: string };

export interface Question {
  id: string;
  type: QuestionType;
  media: QuestionMedia;
  /** Ровно четыре варианта, один из них совпадает с `correct`. */
  options: [string, string, string, string];
  /** Название фильма — правильный ответ. */
  correct: string;
  /** Год выхода — показывается на экране правильного ответа. */
  year: number;
  genre: Genre;
  difficulty: Difficulty;
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  frame: 'Кадр',
  poster: 'Постер',
  quote: 'Цитата',
  soundtrack: 'Саундтрек',
};

export const QUESTION_TYPE_PROMPTS: Record<QuestionType, string> = {
  frame: 'Из какого фильма этот кадр?',
  poster: 'Чей это постер?',
  quote: 'Из какого фильма эта цитата?',
  soundtrack: 'Из какого фильма эта музыка?',
};
