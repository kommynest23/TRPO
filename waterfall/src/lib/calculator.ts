import {
  getPlan,
  LOCKER_PRICE,
  PROMO_CODE,
  PROMO_DISCOUNT_PERCENT,
  TERM_DISCOUNT_PERCENT,
  TOWEL_PRICE,
  TRAINING_BULK_PRICE,
  TRAINING_BULK_THRESHOLD,
  TRAINING_PRICE,
} from '../config/pricing';
import type { CalculatorDraft, MembershipConfig, PriceBreakdown } from '../types';
import { validateTrainings } from './validation';

/** Цена одной персональной тренировки в зависимости от их количества */
export function getTrainingPrice(count: number): number {
  return count >= TRAINING_BULK_THRESHOLD ? TRAINING_BULK_PRICE : TRAINING_PRICE;
}

/** Применяется ли промокод (пробелы по краям игнорируются) */
export function isPromoCodeApplied(code: string): boolean {
  return code.trim() === PROMO_CODE;
}

/** Расчёт стоимости абонемента по формуле из п. 3.2 ТЗ */
export function calculatePrice(config: MembershipConfig): PriceBreakdown {
  const { months, trainings } = config;
  const plan = getPlan(config.planId);

  const planCost = plan.pricePerMonth * months;
  const discountPercent = TERM_DISCOUNT_PERCENT[months];
  const discountedPlanCost = (planCost * (100 - discountPercent)) / 100;

  const extrasPerMonth = (config.locker ? LOCKER_PRICE : 0) + (config.towel ? TOWEL_PRICE : 0);
  const extrasCost = extrasPerMonth * months;

  const trainingPrice = getTrainingPrice(trainings);
  const trainingsCost = trainings * trainingPrice;

  const subtotal = discountedPlanCost + extrasCost + trainingsCost;
  const promoPercent = isPromoCodeApplied(config.promoCode) ? PROMO_DISCOUNT_PERCENT : 0;
  const total = Math.round((subtotal * (100 - promoPercent)) / 100);

  return {
    planCost,
    discountPercent,
    discountAmount: Math.round(planCost - discountedPlanCost),
    extrasCost,
    trainingPrice,
    trainingsCost,
    promoPercent,
    promoAmount: Math.round(subtotal) - total,
    total,
    perMonth: Math.round(total / months),
  };
}

/**
 * Преобразует значения полей калькулятора в конфигурацию для расчёта.
 * Возвращает null, если поле «Тренировки» заполнено некорректно.
 */
export function draftToConfig(draft: CalculatorDraft): MembershipConfig | null {
  const { trainingsInput, ...rest } = draft;
  if (!validateTrainings(trainingsInput).valid) {
    return null;
  }
  return { ...rest, trainings: Number(trainingsInput.trim()) };
}
