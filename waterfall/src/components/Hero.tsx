import '../styles/hero.css';

export function Hero() {
  return (
    <section id="top" className="hero" aria-labelledby="hero-title">
      <svg className="hero__decor" viewBox="0 0 600 400" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="hero-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff6a3d" />
            <stop offset="1" stopColor="#ff2e63" />
          </linearGradient>
        </defs>
        <circle cx="430" cy="170" r="150" fill="url(#hero-gradient)" opacity="0.9" />
        <circle cx="300" cy="300" r="70" fill="none" stroke="#7c5cff" strokeWidth="14" opacity="0.7" />
        <circle cx="540" cy="340" r="36" fill="#7c5cff" opacity="0.8" />
        <polyline
          points="0,210 170,210 210,130 260,290 310,170 340,210 600,210"
          fill="none"
          stroke="#ffffff"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="container hero__content">
        <h1 id="hero-title" className="hero__title">
          Тренируйтесь в&nbsp;ритме PulseFit
        </h1>
        <p className="hero__subtitle">
          Тренажёрный зал, групповые занятия, бассейн и&nbsp;сауна в&nbsp;одном клубе. Рассчитайте
          стоимость абонемента за&nbsp;минуту и&nbsp;оставьте заявку онлайн.
        </p>
        <a href="#calculator" className="button button--primary button--large">
          Рассчитать абонемент
        </a>
      </div>
    </section>
  );
}
