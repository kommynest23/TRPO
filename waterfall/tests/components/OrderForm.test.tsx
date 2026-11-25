import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrderForm } from '../../src/components/OrderForm';
import { calculatePrice } from '../../src/lib/calculator';
import type { MembershipConfig } from '../../src/types';

const config: MembershipConfig = {
  planId: 'standard',
  months: 3,
  locker: true,
  towel: false,
  trainings: 0,
  promoCode: '',
};

const plain = (s: string | null) => (s ?? '').replace(/\s/g, ' ');

function renderForm(cfg: MembershipConfig = config) {
  const user = userEvent.setup();
  render(<OrderForm config={cfg} breakdown={calculatePrice(cfg)} />);
  return {
    user,
    name: screen.getByLabelText(/Имя/),
    phone: screen.getByLabelText(/Телефон/),
    email: screen.getByLabelText(/Email/),
    consent: screen.getByRole('checkbox', { name: /обработку персональных данных/ }),
    submit: screen.getByRole('button', { name: 'Отправить заявку' }),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OrderForm', () => {
  it('показывает сводку выбранного абонемента', () => {
    renderForm();
    expect(plain(screen.getByText(/Ваш абонемент/).textContent)).toBe(
      'Ваш абонемент: Стандарт, 3 месяца — итого 11 475 ₽',
    );
  });

  it('отмечает промокод в сводке', () => {
    renderForm({ ...config, promoCode: '12345' });
    expect(screen.getByText(/Ваш абонемент/)).toHaveTextContent('(с промокодом)');
  });

  it('пустая отправка: ошибки у обязательных полей, фокус на первом ошибочном', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { user, name, phone, email, consent, submit } = renderForm();

    await user.click(submit);

    expect(screen.getByText('Укажите имя')).toBeInTheDocument();
    expect(screen.getByText('Укажите телефон')).toBeInTheDocument();
    expect(screen.getByText('Необходимо согласие на обработку персональных данных')).toBeInTheDocument();
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription('Укажите имя');
    expect(phone).toHaveAttribute('aria-invalid', 'true');
    expect(consent).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAttribute('aria-invalid', 'false');
    expect(name).toHaveFocus();
    expect(screen.queryByText('Заявка отправлена')).not.toBeInTheDocument();
    expect(log).not.toHaveBeenCalled();
  });

  it('ошибка появляется после потери фокуса, а не при вводе', async () => {
    const { user, phone } = renderForm();

    await user.type(phone, '+7 999');
    expect(screen.queryByText(/Введите телефон в формате/)).not.toBeInTheDocument();

    await user.tab();
    expect(screen.getByText('Введите телефон в формате +7 (999) 123-45-67')).toBeInTheDocument();
  });

  it('корректные данные: сообщение об успехе, данные в console.log, форма очищена', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { user, name, phone, email, consent, submit } = renderForm();

    await user.type(name, 'Анна-Мария');
    await user.type(phone, '+7 (999) 123-45-67');
    await user.type(email, 'anna@example.ru');
    await user.click(consent);
    await user.click(submit);

    expect(screen.getByRole('status')).toHaveTextContent('Заявка отправлена');
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][1]).toEqual({
      form: { name: 'Анна-Мария', phone: '+7 (999) 123-45-67', email: 'anna@example.ru', consent: true },
      config,
      total: 11475,
    });
    expect(name).toHaveValue('');
    expect(phone).toHaveValue('');
    expect(email).toHaveValue('');
    expect(consent).not.toBeChecked();
  });
});
