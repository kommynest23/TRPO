/** Идентификатор тарифа */
export type PlanId = 'basic' | 'standard' | 'premium';

/** Допустимые сроки абонемента, мес. */
export type Months = 1 | 3 | 6 | 12;

/** Тариф клуба */
export interface Plan {
  id: PlanId;
  name: string;
  /** Цена за месяц, ₽ */
  pricePerMonth: number;
  /** Краткое описание для калькулятора, например «зал + групповые занятия» */
  summary: string;
  /** Состав тарифа для карточки */
  features: string[];
}

/** Корректная конфигурация абонемента — вход для расчёта */
export interface MembershipConfig {
  planId: PlanId;
  months: Months;
  locker: boolean;
  towel: boolean;
  /** Целое число 0–20 */
  trainings: number;
  /** Промокод, как его ввёл пользователь; пустая строка — без промокода */
  promoCode: string;
}

/**
 * Состояние полей калькулятора, как его ввёл пользователь.
 * Отличается от MembershipConfig тем, что число тренировок хранится строкой
 * и может быть некорректным.
 */
export type CalculatorDraft = Omit<MembershipConfig, 'trainings'> & {
  trainingsInput: string;
};

/** Результат расчёта стоимости, все суммы в целых рублях */
export interface PriceBreakdown {
  /** Стоимость тарифа без скидки: цена × месяцы */
  planCost: number;
  /** Скидка за срок, % */
  discountPercent: number;
  /** Размер скидки за срок, ₽ */
  discountAmount: number;
  /** Шкафчик и полотенце за весь срок, ₽ */
  extrasCost: number;
  /** Цена одной тренировки, ₽ (1 500 или 1 300) */
  trainingPrice: number;
  /** Стоимость тренировок, ₽ */
  trainingsCost: number;
  /** Скидка по промокоду, % (0, если промокод не применён) */
  promoPercent: number;
  /** Размер скидки по промокоду, ₽ */
  promoAmount: number;
  /** Итого, ₽ */
  total: number;
  /** Итого в месяц, ₽ */
  perMonth: number;
}

/** Результат проверки одного поля */
export interface ValidationResult {
  valid: boolean;
  /** Текст ошибки, если valid === false */
  error?: string;
}

/** Значения полей формы заявки */
export interface OrderFormValues {
  name: string;
  phone: string;
  email: string;
  consent: boolean;
}

/** Ошибки полей формы заявки */
export type OrderFormErrors = Partial<Record<keyof OrderFormValues, string>>;

/** Объект заявки, который выводится в console.log при отправке */
export interface OrderPayload {
  form: OrderFormValues;
  config: MembershipConfig;
  total: number;
}
