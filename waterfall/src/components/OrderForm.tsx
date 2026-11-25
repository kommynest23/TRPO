import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { getPlan } from '../config/pricing';
import { formatMonths, formatRub } from '../lib/format';
import { validateOrderForm } from '../lib/validation';
import type { MembershipConfig, OrderFormValues, OrderPayload, PriceBreakdown } from '../types';
import '../styles/order-form.css';

export interface OrderFormProps {
  /** Последняя корректная конфигурация калькулятора */
  config: MembershipConfig;
  breakdown: PriceBreakdown;
}

type Field = keyof OrderFormValues;

const FIELDS: Field[] = ['name', 'phone', 'email', 'consent'];

const EMPTY_VALUES: OrderFormValues = { name: '', phone: '', email: '', consent: false };

export function OrderForm({ config, breakdown }: OrderFormProps) {
  const [values, setValues] = useState<OrderFormValues>(EMPTY_VALUES);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [sent, setSent] = useState(false);
  const inputs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});

  const errors = validateOrderForm(values);
  const errorOf = (field: Field) => (touched[field] ? errors[field] : undefined);

  const update = <K extends Field>(field: K, value: OrderFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setSent(false);
  };

  const touch = (field: Field) => setTouched((prev) => ({ ...prev, [field]: true }));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const firstInvalid = FIELDS.find((field) => errors[field]);
    if (firstInvalid) {
      setTouched({ name: true, phone: true, email: true, consent: true });
      inputs.current[firstInvalid]?.focus();
      return;
    }

    const payload: OrderPayload = {
      form: {
        name: values.name.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        consent: values.consent,
      },
      config,
      total: breakdown.total,
    };
    console.log('Заявка PulseFit:', payload);

    setValues(EMPTY_VALUES);
    setTouched({});
    setSent(true);
  };

  /** Атрибуты доступности и обработчики для текстового поля */
  const textFieldProps = (field: Exclude<Field, 'consent'>) => {
    const error = errorOf(field);
    return {
      id: `order-${field}`,
      name: field,
      className: `field__input${error ? ' field__input--invalid' : ''}`,
      value: values[field],
      'aria-invalid': Boolean(error),
      'aria-describedby': error ? `order-${field}-error` : undefined,
      ref: (el: HTMLInputElement | null) => {
        inputs.current[field] = el;
      },
      onChange: (e: ChangeEvent<HTMLInputElement>) => update(field, e.target.value),
      onBlur: () => touch(field),
    };
  };

  const renderError = (field: Field) => {
    const error = errorOf(field);
    return error ? (
      <p id={`order-${field}-error`} className="field__error">
        {error}
      </p>
    ) : null;
  };

  const consentError = errorOf('consent');

  return (
    <section id="order" className="section section--alt" aria-labelledby="order-title">
      <div className="container">
        <h2 id="order-title" className="section__title">
          Оставить заявку
        </h2>

        <form className="order-form card" noValidate onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label" htmlFor="order-name">
              Имя <span aria-hidden="true">*</span>
            </label>
            <input type="text" autoComplete="name" required {...textFieldProps('name')} />
            {renderError('name')}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="order-phone">
              Телефон <span aria-hidden="true">*</span>
            </label>
            <input
              type="tel"
              autoComplete="tel"
              placeholder="+7 (999) 123-45-67"
              required
              {...textFieldProps('phone')}
            />
            {renderError('phone')}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="order-email">
              Email
            </label>
            <input type="email" autoComplete="email" placeholder="name@example.ru" {...textFieldProps('email')} />
            {renderError('email')}
          </div>

          <div className="field">
            <label className="check">
              <input
                id="order-consent"
                name="consent"
                className="check__input"
                type="checkbox"
                required
                checked={values.consent}
                aria-invalid={Boolean(consentError)}
                aria-describedby={consentError ? 'order-consent-error' : undefined}
                ref={(el) => {
                  inputs.current.consent = el;
                }}
                onChange={(e) => update('consent', e.target.checked)}
                onBlur={() => touch('consent')}
              />
              <span>
                Согласен(-на) на обработку персональных данных <span aria-hidden="true">*</span>
              </span>
            </label>
            {renderError('consent')}
          </div>

          <p className="order-form__summary">
            Ваш абонемент: <strong>{getPlan(config.planId).name}</strong>, {formatMonths(config.months)} — итого{' '}
            <strong>{formatRub(breakdown.total)}</strong>
            {breakdown.promoPercent > 0 && ' (с промокодом)'}
          </p>

          <button type="submit" className="button button--primary button--large order-form__submit">
            Отправить заявку
          </button>

          <p className="order-form__status" role="status">
            {sent && 'Заявка отправлена'}
          </p>
        </form>
      </div>
    </section>
  );
}
