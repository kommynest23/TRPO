import { describe, expect, it } from 'vitest';
import {
  validateConsent,
  validateEmail,
  validateName,
  validateOrderForm,
  validatePhone,
  validatePromoCode,
  validateTrainings,
} from '../src/lib/validation';

describe('validateTrainings — граничные значения', () => {
  it.each([
    ['0', true],
    ['1', true],
    ['19', true],
    ['20', true],
    [' 5 ', true],
    ['-1', false],
    ['21', false],
    ['2.5', false],
    ['2,5', false],
    ['', false],
    ['   ', false],
    ['abc', false],
    ['1e1', false],
  ])('«%s» → %s', (value, valid) => {
    const result = validateTrainings(value);
    expect(result.valid).toBe(valid);
    expect(result.error).toBe(valid ? undefined : 'Введите целое число от 0 до 20');
  });
});

describe('validateName', () => {
  it('пустое имя — «Укажите имя»', () => {
    expect(validateName('')).toEqual({ valid: false, error: 'Укажите имя' });
    expect(validateName('   ').error).toBe('Укажите имя');
  });

  it.each([
    [1, false],
    [2, true],
    [50, true],
    [51, false],
  ])('длина %i → %s', (length, valid) => {
    const result = validateName('Я'.repeat(length));
    expect(result.valid).toBe(valid);
    if (!valid) {
      expect(result.error).toBe('Имя должно содержать от 2 до 50 символов');
    }
  });

  it.each(['Анна', 'Anna', 'Анна-Мария', 'Иван Петров', 'Пётр', 'Mary-Jane Watson'])('«%s» — корректно', (name) => {
    expect(validateName(name).valid).toBe(true);
  });

  it('пробелы по краям не учитываются в длине', () => {
    expect(validateName(' Я ').valid).toBe(false);
    expect(validateName('  Ян  ').valid).toBe(true);
  });

  it.each(['Анна1', 'Anna_', 'Иван!', "O'Brien", 'Ян.'])('«%s» — недопустимые символы', (name) => {
    expect(validateName(name)).toEqual({
      valid: false,
      error: 'Имя может содержать только буквы, пробел и дефис',
    });
  });
});

describe('validatePhone — граничные значения', () => {
  it.each([
    ['+7999123456', false, '9 цифр после +7'],
    ['+79991234567', true, '10 цифр после +7'],
    ['+799912345678', false, '11 цифр после +7'],
    ['+7 (999) 123-45-67', true, 'с форматированием'],
    ['+7 999 123 45 67', true, 'с пробелами'],
    ['89991234567', false, 'начинается с 8'],
    ['+8 (999) 123-45-67', false, 'код страны не +7'],
    ['+7 (999) 123-45-6a', false, 'буква'],
    ['+7.999.123.45.67', false, 'точки не удаляются'],
  ])('«%s» → %s (%s)', (phone, valid) => {
    const result = validatePhone(phone);
    expect(result.valid).toBe(valid);
    if (!valid) {
      expect(result.error).toBe('Введите телефон в формате +7 (999) 123-45-67');
    }
  });

  it('пустой телефон — «Укажите телефон»', () => {
    expect(validatePhone('')).toEqual({ valid: false, error: 'Укажите телефон' });
    expect(validatePhone('  ').error).toBe('Укажите телефон');
  });
});

describe('validateEmail', () => {
  it('пустой email допустим (поле необязательное)', () => {
    expect(validateEmail('').valid).toBe(true);
    expect(validateEmail('   ').valid).toBe(true);
  });

  it.each(['name@example.ru', 'a.b-c@mail.example.com', ' user@test.org '])('«%s» — корректный', (email) => {
    expect(validateEmail(email).valid).toBe(true);
  });

  it.each(['name', 'name@', '@example.ru', 'name@example', 'name@example.r', 'na me@example.ru', 'a@@b.ru'])(
    '«%s» — некорректный',
    (email) => {
      expect(validateEmail(email)).toEqual({
        valid: false,
        error: 'Введите корректный email, например name@example.ru',
      });
    },
  );
});

describe('validateConsent', () => {
  it('отмечен — корректно', () => {
    expect(validateConsent(true).valid).toBe(true);
  });

  it('не отмечен — ошибка', () => {
    expect(validateConsent(false)).toEqual({
      valid: false,
      error: 'Необходимо согласие на обработку персональных данных',
    });
  });
});

describe('validatePromoCode', () => {
  it.each(['', '  ', '12345', ' 12345 '])('«%s» — без ошибки', (code) => {
    expect(validatePromoCode(code).valid).toBe(true);
  });

  it.each(['1234', '54321', 'PROMO'])('«%s» — «Промокод не найден»', (code) => {
    expect(validatePromoCode(code)).toEqual({ valid: false, error: 'Промокод не найден' });
  });
});

describe('validateOrderForm', () => {
  it('корректная форма — ошибок нет', () => {
    expect(
      validateOrderForm({ name: 'Анна', phone: '+7 (999) 123-45-67', email: '', consent: true }),
    ).toEqual({});
  });

  it('пустая форма — ошибки у всех обязательных полей, email не проверяется', () => {
    const errors = validateOrderForm({ name: '', phone: '', email: '', consent: false });
    expect(Object.keys(errors).sort()).toEqual(['consent', 'name', 'phone']);
  });

  it('некорректный email попадает в ошибки', () => {
    const errors = validateOrderForm({ name: 'Анна', phone: '+79991234567', email: 'bad', consent: true });
    expect(errors).toEqual({ email: 'Введите корректный email, например name@example.ru' });
  });
});
