import type { ReactNode } from 'react';
import '../styles/about.css';

interface Feature {
  title: string;
  text: string;
  icon: ReactNode;
}

const FEATURES: Feature[] = [
  {
    title: 'Современный зал',
    text: 'Более 120 тренажёров для силовых и кардиотренировок. Оборудование обновляется каждый год.',
    icon: <path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" />,
  },
  {
    title: 'Опытные тренеры',
    text: 'Сертифицированные специалисты составят программу под вашу цель и уровень подготовки.',
    icon: (
      <>
        <circle cx="12" cy="7" r="3.5" />
        <path d="M5 21v-1.5A5.5 5.5 0 0 1 10.5 14h3a5.5 5.5 0 0 1 5.5 5.5V21" />
      </>
    ),
  },
  {
    title: 'Групповые программы',
    text: 'Йога, функциональный тренинг, сайкл и ещё более 20 направлений в расписании каждую неделю.',
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </>
    ),
  },
  {
    title: 'Бассейн и сауна',
    text: '25-метровый бассейн и финская сауна помогут восстановиться после тренировки.',
    icon: <path d="M2 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />,
  },
];

export function About() {
  return (
    <section id="about" className="section" aria-labelledby="about-title">
      <div className="container">
        <h2 id="about-title" className="section__title">
          О клубе
        </h2>
        <ul className="about__list">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="card about__card">
              <svg
                className="about__icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                {feature.icon}
              </svg>
              <h3 className="about__card-title">{feature.title}</h3>
              <p className="about__card-text">{feature.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
