import { useMemo, useState } from 'react';
import { About } from './components/About';
import { Calculator } from './components/Calculator';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { OrderForm } from './components/OrderForm';
import { Plans } from './components/Plans';
import { INITIAL_DRAFT } from './config/pricing';
import { calculatePrice, draftToConfig } from './lib/calculator';
import { validateTrainings } from './lib/validation';
import type { CalculatorDraft, MembershipConfig } from './types';

/**
 * Корневой компонент. Здесь хранится состояние калькулятора:
 * - draft — значения полей, как их ввёл пользователь;
 * - config — последняя корректная конфигурация. Обновляется, только если
 *   поле «Тренировки» валидно. По ней считается итог; её же получает форма.
 */
export function App() {
  const [draft, setDraft] = useState<CalculatorDraft>(INITIAL_DRAFT);
  const [config, setConfig] = useState<MembershipConfig>(() => draftToConfig(INITIAL_DRAFT)!);

  const breakdown = useMemo(() => calculatePrice(config), [config]);
  const trainingsError = validateTrainings(draft.trainingsInput).error;

  const handleCalculatorChange = (next: CalculatorDraft) => {
    setDraft(next);
    const nextConfig = draftToConfig(next);
    if (nextConfig) {
      setConfig(nextConfig);
    }
  };

  return (
    <>
      <Header />
      <main>
        <Hero />
        <About />
        <Plans />
        <Calculator
          draft={draft}
          trainingsError={trainingsError}
          config={config}
          breakdown={breakdown}
          onChange={handleCalculatorChange}
        />
        <OrderForm config={config} breakdown={breakdown} />
      </main>
      <Footer />
    </>
  );
}
