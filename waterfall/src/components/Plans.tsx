import { PLANS } from '../config/pricing';
import { formatRub } from '../lib/format';
import '../styles/plans.css';

export function Plans() {
  return (
    <section id="plans" className="section section--alt" aria-labelledby="plans-title">
      <div className="container">
        <h2 id="plans-title" className="section__title">
          Тарифы
        </h2>
        <ul className="plans__list">
          {PLANS.map((plan) => (
            <li key={plan.id} className={`card plans__card plans__card--${plan.id}`}>
              <h3 className="plans__name">{plan.name}</h3>
              <p className="plans__price">
                <span className="plans__price-value">{formatRub(plan.pricePerMonth)}</span>
                <span className="plans__price-period"> / месяц</span>
              </p>
              <ul className="plans__features" aria-label={`Что входит в тариф «${plan.name}»`}>
                {plan.features.map((feature) => (
                  <li key={feature} className="plans__feature">
                    {feature}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
