import { useState } from 'react';
import {
  getPlan,
  LOCKER_PRICE,
  MAX_TRAININGS,
  MIN_TRAININGS,
  PLANS,
  PROMO_DISCOUNT_PERCENT,
  TERM_DISCOUNT_PERCENT,
  TERMS,
  TOWEL_PRICE,
  TRAINING_BULK_PRICE,
  TRAINING_BULK_THRESHOLD,
  TRAINING_PRICE,
} from '../config/pricing';
import { isPromoCodeApplied } from '../lib/calculator';
import { formatMonths, formatRub } from '../lib/format';
import { validatePromoCode } from '../lib/validation';
import type { CalculatorDraft, MembershipConfig, PriceBreakdown } from '../types';
import '../styles/calculator.css';

export interface CalculatorProps {
  /** Текущие значения полей */
  draft: CalculatorDraft;
  /** Ошибка поля «Тренировки», если ввод некорректен */
  trainingsError?: string;
  /** Последняя корректная конфигурация, по которой выполнен расчёт */
  config: MembershipConfig;
  /** Последний корректный расчёт */
  breakdown: PriceBreakdown;
  onChange: (draft: CalculatorDraft) => void;
}

export function Calculator({ draft, trainingsError, config, breakdown, onChange }: CalculatorProps) {
  const [promoTouched, setPromoTouched] = useState(false);

  const update = <K extends keyof CalculatorDraft>(field: K, value: CalculatorDraft[K]) => {
    onChange({ ...draft, [field]: value });
  };

  const plan = getPlan(config.planId);
  const trainingsInvalid = Boolean(trainingsError);
  const promoApplied = isPromoCodeApplied(draft.promoCode);
  const promoError = promoTouched ? validatePromoCode(draft.promoCode).error : undefined;

  return (
    <section id="calculator" className="section" aria-labelledby="calculator-title">
      <div className="container">
        <h2 id="calculator-title" className="section__title">
          Калькулятор абонемента
        </h2>

        <div className="calculator">
          <div className="calculator__fields">
            <fieldset className="calculator__group">
              <legend className="calculator__legend">Тариф</legend>
              <div className="calculator__options calculator__options--plans">
                {PLANS.map((p) => (
                  <label key={p.id} className="option">
                    <input
                      className="option__input"
                      type="radio"
                      name="plan"
                      value={p.id}
                      checked={draft.planId === p.id}
                      onChange={() => update('planId', p.id)}
                    />
                    <span className="option__box">
                      <span className="option__title">{p.name}</span>
                      <span className="option__text">
                        {formatRub(p.pricePerMonth)}/мес · {p.summary}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="calculator__group">
              <legend className="calculator__legend">Срок</legend>
              <div className="calculator__options calculator__options--terms">
                {TERMS.map((months) => (
                  <label key={months} className="option">
                    <input
                      className="option__input"
                      type="radio"
                      name="months"
                      value={months}
                      checked={draft.months === months}
                      onChange={() => update('months', months)}
                    />
                    <span className="option__box">
                      <span className="option__title">{formatMonths(months)}</span>
                      <span className="option__text">
                        {TERM_DISCOUNT_PERCENT[months] > 0
                          ? `скидка ${TERM_DISCOUNT_PERCENT[months]}\u00A0%`
                          : 'без скидки'}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="calculator__group">
              <legend className="calculator__legend">Дополнительно</legend>
              <div className="calculator__checks">
                <label className="check">
                  <input
                    className="check__input"
                    type="checkbox"
                    checked={draft.locker}
                    onChange={(e) => update('locker', e.target.checked)}
                  />
                  <span>Шкафчик — {formatRub(LOCKER_PRICE)}/мес</span>
                </label>
                <label className="check">
                  <input
                    className="check__input"
                    type="checkbox"
                    checked={draft.towel}
                    onChange={(e) => update('towel', e.target.checked)}
                  />
                  <span>Полотенце — {formatRub(TOWEL_PRICE)}/мес</span>
                </label>
              </div>
            </fieldset>

            <div className="field">
              <label className="field__label" htmlFor="trainings">
                Персональные тренировки, шт.
              </label>
              <input
                id="trainings"
                className={`field__input field__input--short${trainingsInvalid ? ' field__input--invalid' : ''}`}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={draft.trainingsInput}
                aria-invalid={trainingsInvalid}
                aria-describedby={trainingsInvalid ? 'trainings-hint trainings-error' : 'trainings-hint'}
                onChange={(e) => update('trainingsInput', e.target.value)}
              />
              <p id="trainings-hint" className="field__hint">
                От {MIN_TRAININGS} до {MAX_TRAININGS}. {formatRub(TRAINING_PRICE)} за тренировку, от{' '}
                {TRAINING_BULK_THRESHOLD} шт. — {formatRub(TRAINING_BULK_PRICE)}.
              </p>
              {trainingsInvalid && (
                <p id="trainings-error" className="field__error">
                  {trainingsError}
                </p>
              )}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="promo">
                Промокод
              </label>
              <input
                id="promo"
                className={`field__input field__input--short${promoError ? ' field__input--invalid' : ''}`}
                type="text"
                autoComplete="off"
                value={draft.promoCode}
                aria-invalid={Boolean(promoError)}
                aria-describedby={promoError ? 'promo-error' : promoApplied ? 'promo-success' : undefined}
                onChange={(e) => update('promoCode', e.target.value)}
                onBlur={() => setPromoTouched(true)}
              />
              {promoError && (
                <p id="promo-error" className="field__error">
                  {promoError}
                </p>
              )}
              {promoApplied && (
                <p id="promo-success" className="field__success">
                  Промокод применён: скидка {PROMO_DISCOUNT_PERCENT}&nbsp;% на итоговую сумму
                </p>
              )}
            </div>
          </div>

          <aside className="calculator__summary" aria-labelledby="summary-title">
            <h3 id="summary-title" className="calculator__summary-title">
              Расчёт стоимости
            </h3>
            <dl className="breakdown">
              <div className="breakdown__row">
                <dt>
                  Тариф «{plan.name}», {formatMonths(config.months)}
                </dt>
                <dd>{formatRub(breakdown.planCost)}</dd>
              </div>
              <div className="breakdown__row">
                <dt>Скидка за срок {breakdown.discountPercent}&nbsp;%</dt>
                <dd>{breakdown.discountAmount > 0 ? `−${formatRub(breakdown.discountAmount)}` : formatRub(0)}</dd>
              </div>
              <div className="breakdown__row">
                <dt>Доп. услуги</dt>
                <dd>{formatRub(breakdown.extrasCost)}</dd>
              </div>
              <div className="breakdown__row">
                <dt>
                  Тренировки: {config.trainings} × {formatRub(breakdown.trainingPrice)}
                </dt>
                <dd>{formatRub(breakdown.trainingsCost)}</dd>
              </div>
              {breakdown.promoPercent > 0 && (
                <div className="breakdown__row">
                  <dt>Промокод {breakdown.promoPercent}&nbsp;%</dt>
                  <dd>−{formatRub(breakdown.promoAmount)}</dd>
                </div>
              )}
              <div className="breakdown__row breakdown__row--total">
                <dt>Итого</dt>
                <dd data-testid="total" aria-live="polite">
                  {formatRub(breakdown.total)}
                </dd>
              </div>
              <div className="breakdown__row breakdown__row--month">
                <dt>В месяц</dt>
                <dd data-testid="per-month">{formatRub(breakdown.perMonth)}</dd>
              </div>
            </dl>
            {trainingsInvalid && (
              <p className="calculator__note">Исправьте ошибку в поле «Тренировки» — показан последний корректный расчёт.</p>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
