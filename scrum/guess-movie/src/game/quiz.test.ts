import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../data/questions';
import { ANSWER_TIME_SEC, buildRound, createQuizState, quizReducer, ROUND_SIZE } from './quiz';

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
  const start = 1000;
  const deadline = start + ANSWER_TIME_SEC * 1000;
  const newRound = () => createQuizState(questions, start);

  it('правильный ответ начисляет базовые очки и бонус за оставшееся время', () => {
    const s = quizReducer(newRound(), {
      type: 'answer',
      option: questions[0].correct,
      now: deadline - 6500,
    });
    expect(s.phase).toBe('reveal');
    expect(s.score).toBe(125);
    expect(s.answers[0]).toMatchObject({ selected: questions[0].correct, correct: true, points: 125 });
  });

  it.each([0, 1500, 2000])('сохраняет максимальный бонус через %i мс после начала вопроса', (elapsed) => {
    const s = quizReducer(newRound(), { type: 'answer', option: questions[0].correct, now: start + elapsed });
    expect(s.score).toBe(150);
  });

  it('быстрый верный ответ получает больше очков, чем верный ответ перед истечением времени', () => {
    const option = questions[0].correct;
    expect(quizReducer(newRound(), { type: 'answer', option, now: start + 2500 }).score).toBe(148);
    expect(quizReducer(newRound(), { type: 'answer', option, now: deadline - 1 }).score).toBe(100);
  });

  it('считает ответ на границе таймера пропущенным до срабатывания тика', () => {
    const s = quizReducer(newRound(), { type: 'answer', option: questions[0].correct, now: deadline });
    expect(s.score).toBe(0);
    expect(s.answers[0]).toMatchObject({ selected: null, correct: false, points: 0 });
  });

  it('неверный ответ и таймаут не дают очков', () => {
    const wrong = questions[0].options.find((o) => o !== questions[0].correct)!;
    let s = quizReducer(newRound(), { type: 'answer', option: wrong, now: start });
    expect(s.score).toBe(0);
    s = quizReducer(s, { type: 'next', now: deadline });
    expect(s.deadline).toBe(deadline + ANSWER_TIME_SEC * 1000);
    s = quizReducer(s, { type: 'timeout' });
    expect(s.score).toBe(0);
    expect(s.answers[1]).toMatchObject({ selected: null, correct: false });
  });

  it('повторный ответ на тот же вопрос игнорируется', () => {
    const action = { type: 'answer', option: questions[0].correct, now: start } as const;
    const s = quizReducer(quizReducer(newRound(), action), action);
    expect(s.score).toBe(150);
    expect(s.answers).toHaveLength(1);
  });

  it('после последнего вопроса раунд завершается', () => {
    let s = newRound();
    for (let i = 0; i < questions.length; i++) {
      s = quizReducer(s, { type: 'timeout' });
      s = quizReducer(s, { type: 'next', now: s.deadline });
    }
    expect(s.phase).toBe('finished');
  });
});
