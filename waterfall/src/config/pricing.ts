import type { CalculatorDraft, Months, Plan, PlanId } from '../types';

/** Тарифы клуба. Используются и карточками «Тарифы», и калькулятором. */
export const PLANS: readonly Plan[] = [
  {
    id: 'basic',
    name: 'Базовый',
    pricePerMonth: 2500,
    summary: 'тренажёрный зал',
    features: ['Тренажёрный зал'],
  },
  {
    id: 'standard',
    name: 'Стандарт',
    pricePerMonth: 3500,
    summary: 'зал + групповые занятия',
    features: ['Тренажёрный зал', 'Групповые занятия'],
  },
  {
    id: 'premium',
    name: 'Премиум',
    pricePerMonth: 5000,
    summary: 'всё + бассейн и сауна',
    features: ['Тренажёрный зал', 'Групповые занятия', 'Бассейн', 'Сауна'],
  },
];

/** Доступные сроки абонемента, мес. */
export const TERMS: readonly Months[] = [1, 3, 6, 12];

/** Скидка за срок, % */
export const TERM_DISCOUNT_PERCENT: Readonly<Record<Months, number>> = {
  1: 0,
  3: 5,
  6: 10,
  12: 15,
};

/** Действующий промокод (моковый) */
export const PROMO_CODE = '12345';

/** Скидка по промокоду на итоговую сумму, % */
export const PROMO_DISCOUNT_PERCENT = 3;

/** Шкафчик, ₽/мес (без скидки) */
export const LOCKER_PRICE = 500;

/** Полотенце, ₽/мес (без скидки) */
export const TOWEL_PRICE = 300;

/** Персональная тренировка, ₽/шт (без скидки) */
export const TRAINING_PRICE = 1500;

/** Персональная тренировка при количестве от TRAINING_BULK_THRESHOLD, ₽/шт */
export const TRAINING_BULK_PRICE = 1300;

/** С какого количества тренировок действует сниженная цена */
export const TRAINING_BULK_THRESHOLD = 10;

/** Допустимый диапазон количества тренировок */
export const MIN_TRAININGS = 0;
export const MAX_TRAININGS = 20;

/** Начальные значения калькулятора */
export const INITIAL_DRAFT: CalculatorDraft = {
  planId: 'standard',
  months: 1,
  locker: false,
  towel: false,
  trainingsInput: '0',
  promoCode: '',
};

/** Возвращает тариф по идентификатору */
export function getPlan(id: PlanId): Plan {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) {
    throw new Error(`Неизвестный тариф: ${id}`);
  }
  return plan;
}
