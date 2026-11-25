import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../data/questions';
import { buildRound, createQuizState, quizReducer, ROUND_SIZE } from './quiz';

describe('банк вопросов', () => {
  it('у каждого вопроса 4 уникальных варианта и среди них правильный', () => {
    for (const q of QUESTIONS) {
      expect(new Set(q.options).size, q.id).toBe(4);
      expect(q.options, q.id).toContain(q.correct);
    }
  });

  it('id вопросов уникальны', () => {
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
  });
});

describe('buildRound', () => {
  it('собирает раунд нужного размера без повторов', () => {
    const round = buildRound(QUESTIONS);
    expect(round).toHaveLength(ROUND_SIZE);
    expect(new Set(round.map((q) => q.id)).size).toBe(ROUND_SIZE);
  });

  it('в раунде есть вопросы всех четырёх типов', () => {
    const round = buildRound(QUESTIONS);
    expect(new Set(round.map((q) => q.type))).toEqual(
      new Set(['frame', 'poster', 'quote', 'soundtrack']),
    );
  });

  it('не падает, если вопросов в банке меньше размера раунда', () => {
    expect(buildRound(QUESTIONS.slice(0, 3), 10)).toHaveLength(3);
  });

  it('перемешивание не теряет правильный ответ', () => {
    for (const q of buildRound(QUESTIONS)) expect(q.options).toContain(q.correct);
  });
});

describe('quizReducer', () => {
  const questions = QUESTIONS.slice(0, 2);

  it('правильный ответ даёт очко и переводит в фазу показа ответа', () => {
    const s = quizReducer(createQuizState(questions), { type: 'answer', option: questions[0].correct });
    expect(s.phase).toBe('reveal');
    expect(s.score).toBe(1);
    expect(s.answers[0]).toMatchObject({ selected: questions[0].correct, correct: true });
  });

  it('неверный ответ и таймаут не дают очков', () => {
    const wrong = questions[0].options.find((o) => o !== questions[0].correct)!;
    let s = quizReducer(createQuizState(questions), { type: 'answer', option: wrong });
    expect(s.score).toBe(0);
    s = quizReducer(s, { type: 'next' });
    s = quizReducer(s, { type: 'timeout' });
    expect(s.score).toBe(0);
    expect(s.answers[1]).toMatchObject({ selected: null, correct: false });
  });

  it('повторный ответ на тот же вопрос игнорируется', () => {
    let s = quizReducer(createQuizState(questions), { type: 'answer', option: questions[0].correct });
    s = quizReducer(s, { type: 'answer', option: questions[0].correct });
    expect(s.score).toBe(1);
    expect(s.answers).toHaveLength(1);
  });

  it('после последнего вопроса раунд завершается', () => {
    let s = createQuizState(questions);
    for (let i = 0; i < questions.length; i++) {
      s = quizReducer(s, { type: 'timeout' });
      s = quizReducer(s, { type: 'next' });
    }
    expect(s.phase).toBe('finished');
  });
});
