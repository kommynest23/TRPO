import { describe, expect, it } from 'vitest';
import { formatMonths, formatRub } from '../src/lib/format';

/** Заменяет неразрывные пробелы обычными, чтобы сравнивать строки */
const plain = (s: string) => s.replace(/\s/g, ' ');

describe('formatRub', () => {
  it.each([
    [0, '0 ₽'],
    [500, '500 ₽'],
    [11475, '11 475 ₽'],
    [49470, '49 470 ₽'],
    [1234567, '1 234 567 ₽'],
    [2474.5, '2 475 ₽'],
  ])('%d → «%s»', (value, expected) => {
    expect(plain(formatRub(value))).toBe(expected);
  });

  it('знак ₽ отделён неразрывным пробелом', () => {
    expect(formatRub(100)).toBe('100\u00A0₽');
  });
});

describe('formatMonths', () => {
  it.each([
    [1, '1 месяц'],
    [3, '3 месяца'],
    [6, '6 месяцев'],
    [12, '12 месяцев'],
    [11, '11 месяцев'],
    [21, '21 месяц'],
    [22, '22 месяца'],
    [14, '14 месяцев'],
  ])('%i → «%s»', (count, expected) => {
    expect(plain(formatMonths(count))).toBe(expected);
  });
});
