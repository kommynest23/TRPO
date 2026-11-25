import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../data/questions';
import { filterQuestions, readFilters } from './filters';
import { buildRound } from './quiz';

describe('фильтры каталога', () => {
  it.each([
    ['type', 'frame'],
    ['genre', 'drama'],
    ['difficulty', 'easy'],
  ] as const)('фильтрует вопросы по %s отдельно', (name, value) => {
    const filters = readFilters(new URLSearchParams([[name, value]]));
    const matches = QUESTIONS.filter((question) => question[name] === value);
    expect(matches.length).toBeGreaterThan(0);
    expect(filterQuestions(QUESTIONS, filters)).toEqual(matches);
  });

  it('сочетает все три условия и передаёт только совпадения в укороченный раунд', () => {
    const { type, genre, difficulty } = QUESTIONS[0];
    const filters = readFilters(new URLSearchParams({ type, genre, difficulty }));
    const matches = QUESTIONS.filter(
      (q) => q.type === type && q.genre === genre && q.difficulty === difficulty,
    );
    const round = buildRound(filterQuestions(QUESTIONS, filters));
    expect(round).toHaveLength(matches.length);
    expect(round.map((question) => question.id).sort()).toEqual(matches.map((q) => q.id).sort());
  });

  it('возвращает пустой список при отсутствии совпадений', () => {
    const [question] = QUESTIONS;
    const type = question.type === 'frame' ? 'quote' : 'frame';
    expect(filterQuestions([question], { type })).toEqual([]);
  });

  it('игнорирует неизвестные параметры, сохраняя распознанные фильтры', () => {
    const filters = readFilters(new URLSearchParams('type=toString&genre=drama&difficulty=extra'));
    expect(filterQuestions(QUESTIONS, filters)).toEqual(filterQuestions(QUESTIONS, { genre: 'drama' }));
  });
});
