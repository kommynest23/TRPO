import { MAX_TRAININGS, MIN_TRAININGS, PROMO_CODE } from '../config/pricing';
import type { OrderFormErrors, OrderFormValues, ValidationResult } from '../types';

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 50;
const NAME_PATTERN = /^[A-Za-zА-Яа-яЁё -]+$/;
const PHONE_PATTERN = /^\+7\d{10}$/;
const PHONE_FORMATTING = /[\s()-]/g;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INTEGER_PATTERN = /^\d+$/;

const OK: ValidationResult = { valid: true };

function fail(error: string): ValidationResult {
  return { valid: false, error };
}

/** Имя: обязательно, 2–50 символов, буквы (кириллица/латиница), пробел, дефис */
export function validateName(value: string): ValidationResult {
  const name = value.trim();
  if (name === '') {
    return fail('Укажите имя');
  }
  if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
    return fail(`Имя должно содержать от ${NAME_MIN_LENGTH} до ${NAME_MAX_LENGTH} символов`);
  }
  if (!NAME_PATTERN.test(name)) {
    return fail('Имя может содержать только буквы, пробел и дефис');
  }
  return OK;
}

/** Телефон: обязателен, после удаления пробелов, скобок и дефисов — ^\+7\d{10}$ */
export function validatePhone(value: string): ValidationResult {
  if (value.trim() === '') {
    return fail('Укажите телефон');
  }
  const digits = value.replace(PHONE_FORMATTING, '');
  if (!PHONE_PATTERN.test(digits)) {
    return fail('Введите телефон в формате +7 (999) 123-45-67');
  }
  return OK;
}

/** Email: необязателен, если заполнен — корректный формат */
export function validateEmail(value: string): ValidationResult {
  const email = value.trim();
  if (email === '') {
    return OK;
  }
  if (!EMAIL_PATTERN.test(email)) {
    return fail('Введите корректный email, например name@example.ru');
  }
  return OK;
}

/** Согласие на обработку данных: обязательно */
export function validateConsent(checked: boolean): ValidationResult {
  return checked ? OK : fail('Необходимо согласие на обработку персональных данных');
}

/** Количество тренировок: целое число 0–20, введённое строкой */
export function validateTrainings(value: string): ValidationResult {
  const error = `Введите целое число от ${MIN_TRAININGS} до ${MAX_TRAININGS}`;
  const input = value.trim();
  if (!INTEGER_PATTERN.test(input)) {
    return fail(error);
  }
  const count = Number(input);
  if (count < MIN_TRAININGS || count > MAX_TRAININGS) {
    return fail(error);
  }
  return OK;
}

/** Промокод: необязателен, если заполнен — должен совпадать с действующим */
export function validatePromoCode(value: string): ValidationResult {
  const code = value.trim();
  if (code === '' || code === PROMO_CODE) {
    return OK;
  }
  return fail('Промокод не найден');
}

/** Проверка всей формы заявки; пустой объект — ошибок нет */
export function validateOrderForm(values: OrderFormValues): OrderFormErrors {
  const results: Record<keyof OrderFormValues, ValidationResult> = {
    name: validateName(values.name),
    phone: validatePhone(values.phone),
    email: validateEmail(values.email),
    consent: validateConsent(values.consent),
  };
  const errors: OrderFormErrors = {};
  for (const field of Object.keys(results) as (keyof OrderFormValues)[]) {
    const result = results[field];
    if (!result.valid) {
      errors[field] = result.error;
    }
  }
  return errors;
}
