import { describe, expect, it } from 'vitest';
import { getPlan, INITIAL_DRAFT, PLANS, TERMS } from '../src/config/pricing';
import { calculatePrice, draftToConfig, getTrainingPrice, isPromoCodeApplied } from '../src/lib/calculator';
import type { MembershipConfig, Months, PlanId } from '../src/types';

/** Конфигурация без доп. опций с возможностью переопределить поля */
function config(overrides: Partial<MembershipConfig> = {}): MembershipConfig {
  return {
    planId: 'basic',
    months: 1,
    locker: false,
    towel: false,
    trainings: 0,
    promoCode: '',
    ...overrides,
  };
}

describe('getTrainingPrice', () => {
  it.each([
    [0, 1500],
    [1, 1500],
    [9, 1500],
    [10, 1300],
    [20, 1300],
  ])('%i тренировок → %i ₽ за штуку', (count, price) => {
    expect(getTrainingPrice(count)).toBe(price);
  });
});

describe('isPromoCodeApplied', () => {
  it.each([
    ['12345', true],
    ['  12345  ', true],
    ['', false],
    ['   ', false],
    ['1234', false],
    ['123456', false],
    ['54321', false],
  ])('«%s» → %s', (code, applied) => {
    expect(isPromoCodeApplied(code)).toBe(applied);
  });
});

describe('calculatePrice — контрольные значения (п. 3.5 ТЗ)', () => {
  it.each<[number, string, MembershipConfig, number]>([
    [1, 'Премиум, 12 мес, промокод', config({ planId: 'premium', months: 12, promoCode: '12345' }), 49470],
    [2, 'Стандарт, 3 мес, шкафчик', config({ planId: 'standard', months: 3, locker: true }), 11475],
    [3, 'Базовый, 1 мес, 10 тренировок', config({ trainings: 10 }), 15500],
    [4, 'Базовый, 1 мес, 9 тренировок', config({ trainings: 9 }), 16000],
    [5, 'Базовый, 6 мес, полотенце, промокод', config({ months: 6, towel: true, promoCode: '12345' }), 14841],
    [6, 'Стандарт, 12 мес', config({ planId: 'standard', months: 12 }), 35700],
  ])('№%i: %s → %i ₽', (_n, _title, cfg, total) => {
    expect(calculatePrice(cfg).total).toBe(total);
  });
});

describe('calculatePrice — каждый тариф и срок', () => {
  const termDiscount: Record<Months, number> = { 1: 0, 3: 5, 6: 10, 12: 15 };
  const cases = PLANS.flatMap((plan) => TERMS.map((months) => [plan.id, plan.pricePerMonth, months] as const));

  it.each(cases)('%s, %i ₽/мес, %i мес', (planId, price, months) => {
    const result = calculatePrice(config({ planId: planId as PlanId, months }));
    const planCost = price * months;
    const expectedTotal = Math.round((planCost * (100 - termDiscount[months])) / 100);

    expect(result.planCost).toBe(planCost);
    expect(result.discountPercent).toBe(termDiscount[months]);
    expect(result.discountAmount).toBe(planCost - expectedTotal);
    expect(result.total).toBe(expectedTotal);
    expect(result.perMonth).toBe(Math.round(expectedTotal / months));
  });
});

describe('calculatePrice — доп. услуги', () => {
  it('без доп. услуг стоимость услуг 0', () => {
    expect(calculatePrice(config({ months: 3 })).extrasCost).toBe(0);
  });

  it('шкафчик 500 ₽/мес умножается на срок и не получает скидку за срок', () => {
    const result = calculatePrice(config({ months: 6, locker: true }));
    expect(result.extrasCost).toBe(3000);
    expect(result.total).toBe(13500 + 3000);
  });

  it('полотенце 300 ₽/мес умножается на срок', () => {
    expect(calculatePrice(config({ months: 3, towel: true })).extrasCost).toBe(900);
  });

  it('шкафчик и полотенце вместе — 800 ₽/мес', () => {
    const result = calculatePrice(config({ months: 12, locker: true, towel: true }));
    expect(result.extrasCost).toBe(9600);
    expect(result.total).toBe(25500 + 9600);
  });
});

describe('calculatePrice — тренировки', () => {
  it('0 тренировок — стоимость 0, цена 1 500 ₽', () => {
    const result = calculatePrice(config());
    expect(result.trainingsCost).toBe(0);
    expect(result.trainingPrice).toBe(1500);
  });

  it('граница 9/10: 9 × 1 500 = 13 500, 10 × 1 300 = 13 000', () => {
    expect(calculatePrice(config({ trainings: 9 })).trainingsCost).toBe(13500);
    expect(calculatePrice(config({ trainings: 10 })).trainingsCost).toBe(13000);
  });

  it('20 тренировок × 1 300 ₽', () => {
    expect(calculatePrice(config({ trainings: 20 })).trainingsCost).toBe(26000);
  });

  it('тренировки не получают скидку за срок', () => {
    const result = calculatePrice(config({ months: 12, trainings: 5 }));
    expect(result.total).toBe(25500 + 7500);
  });
});

describe('calculatePrice — промокод', () => {
  const base = config({ planId: 'standard', months: 3, locker: true, trainings: 10 });
  // 10 500 × 0,95 + 1 500 + 13 000 = 24 475
  const subtotal = 24475;

  it('без промокода скидка 0', () => {
    const result = calculatePrice(base);
    expect(result.promoPercent).toBe(0);
    expect(result.promoAmount).toBe(0);
    expect(result.total).toBe(subtotal);
  });

  it('действующий промокод — 3 % на всю сумму, включая услуги и тренировки', () => {
    const result = calculatePrice({ ...base, promoCode: '12345' });
    expect(result.promoPercent).toBe(3);
    expect(result.total).toBe(Math.round(subtotal * 0.97));
    expect(result.promoAmount).toBe(subtotal - result.total);
  });

  it('промокод с пробелами по краям применяется', () => {
    expect(calculatePrice({ ...base, promoCode: ' 12345 ' }).promoPercent).toBe(3);
  });

  it('недействующий промокод не применяется', () => {
    const result = calculatePrice({ ...base, promoCode: '00000' });
    expect(result.promoPercent).toBe(0);
    expect(result.total).toBe(subtotal);
  });

  it('стоимость в месяц считается от итога с промокодом', () => {
    const result = calculatePrice(config({ planId: 'premium', months: 12, promoCode: '12345' }));
    expect(result.perMonth).toBe(Math.round(49470 / 12));
  });
});

describe('draftToConfig', () => {
  it('корректный ввод → конфигурация с числом тренировок', () => {
    expect(draftToConfig({ ...INITIAL_DRAFT, trainingsInput: ' 7 ' })).toEqual({
      planId: INITIAL_DRAFT.planId,
      months: INITIAL_DRAFT.months,
      locker: false,
      towel: false,
      promoCode: '',
      trainings: 7,
    });
  });

  it.each(['', '-1', '21', '2.5', 'abc'])('некорректные тренировки «%s» → null', (input) => {
    expect(draftToConfig({ ...INITIAL_DRAFT, trainingsInput: input })).toBeNull();
  });
});

describe('getPlan', () => {
  it('возвращает тариф по идентификатору', () => {
    expect(getPlan('premium').pricePerMonth).toBe(5000);
  });

  it('неизвестный тариф → исключение', () => {
    expect(() => getPlan('vip' as PlanId)).toThrow('Неизвестный тариф');
  });
});
