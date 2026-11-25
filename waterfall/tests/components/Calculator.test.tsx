import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/App';

/** Текст без неразрывных пробелов */
const plain = (s: string | null) => (s ?? '').replace(/\s/g, ' ');

/** Калькулятор рендерится внутри App, т. к. его состояние поднято в App */
function renderCalculator() {
  const user = userEvent.setup();
  render(<App />);
  const calculator = within(screen.getByRole('region', { name: 'Калькулятор абонемента' }));
  const total = () => plain(screen.getByTestId('total').textContent);
  return { user, calculator, total };
}

describe('Calculator', () => {
  it('по умолчанию показывает Стандарт на 1 месяц — 3 500 ₽', () => {
    const { calculator, total } = renderCalculator();
    expect(calculator.getByRole('radio', { name: /Стандарт/ })).toBeChecked();
    expect(calculator.getByRole('radio', { name: /1\sмесяц/ })).toBeChecked();
    expect(total()).toBe('3 500 ₽');
  });

  it('пересчитывает итог при смене тарифа', async () => {
    const { user, calculator, total } = renderCalculator();

    await user.click(calculator.getByRole('radio', { name: /Премиум/ }));
    expect(total()).toBe('5 000 ₽');

    await user.click(calculator.getByRole('radio', { name: /Базовый/ }));
    expect(total()).toBe('2 500 ₽');
  });

  it('пересчитывает итог при смене срока и доп. услуг (контрольное значение №2)', async () => {
    const { user, calculator, total } = renderCalculator();

    await user.click(calculator.getByRole('radio', { name: /3\sмесяца/ }));
    await user.click(calculator.getByRole('checkbox', { name: /Шкафчик/ }));

    expect(total()).toBe('11 475 ₽');
    expect(plain(screen.getByTestId('per-month').textContent)).toBe('3 825 ₽');
  });

  it('применяет промокод и показывает строку скидки (контрольное значение №1)', async () => {
    const { user, calculator, total } = renderCalculator();

    await user.click(calculator.getByRole('radio', { name: /Премиум/ }));
    await user.click(calculator.getByRole('radio', { name: /12\sмесяцев/ }));
    expect(total()).toBe('51 000 ₽');

    await user.type(calculator.getByLabelText('Промокод'), '12345');
    expect(total()).toBe('49 470 ₽');
    expect(calculator.getByText(/Промокод применён/)).toBeInTheDocument();
    expect(calculator.getByText(/Промокод 3/)).toBeInTheDocument();
  });

  it('недействующий промокод: ошибка после потери фокуса, скидка не применяется', async () => {
    const { user, calculator, total } = renderCalculator();
    const promo = calculator.getByLabelText('Промокод');

    await user.type(promo, '999');
    expect(calculator.queryByText('Промокод не найден')).not.toBeInTheDocument();

    await user.tab();
    expect(calculator.getByText('Промокод не найден')).toBeInTheDocument();
    expect(promo).toHaveAttribute('aria-invalid', 'true');
    expect(promo).toHaveAccessibleDescription('Промокод не найден');
    expect(total()).toBe('3 500 ₽');
  });

  it('некорректные тренировки: ошибка, итог не пересчитывается', async () => {
    const { user, calculator, total } = renderCalculator();
    const trainings = calculator.getByLabelText(/Персональные тренировки/);

    // paste вставляет значение целиком, без промежуточных состояний посимвольного ввода
    await user.clear(trainings);
    await user.paste('10');
    expect(total()).toBe('16 500 ₽');

    await user.clear(trainings);
    await user.paste('21');
    expect(trainings).toHaveAttribute('aria-invalid', 'true');
    expect(calculator.getByText('Введите целое число от 0 до 20')).toBeInTheDocument();
    expect(total()).toBe('16 500 ₽');

    // Смена тарифа при ошибке тоже не меняет итог — показывается последний корректный
    await user.click(calculator.getByRole('radio', { name: /Премиум/ }));
    expect(total()).toBe('16 500 ₽');

    await user.clear(trainings);
    await user.paste('9');
    expect(trainings).toHaveAttribute('aria-invalid', 'false');
    expect(total()).toBe('18 500 ₽');
  });
});
