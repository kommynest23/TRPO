import { useState } from 'react';
import '../styles/header.css';

const MENU = [
  { href: '#about', label: 'О клубе' },
  { href: '#plans', label: 'Тарифы' },
  { href: '#calculator', label: 'Калькулятор' },
  { href: '#contacts', label: 'Контакты' },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="header">
      <div className="container header__inner">
        <a href="#top" className="header__logo" onClick={closeMenu}>
          Pulse<span className="header__logo-accent">Fit</span>
        </a>

        <nav
          id="main-menu"
          className={`header__nav${menuOpen ? ' header__nav--open' : ''}`}
          aria-label="Основное меню"
        >
          <ul className="header__menu">
            {MENU.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="header__link" onClick={closeMenu}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <a href="#order" className="button button--primary header__cta" onClick={closeMenu}>
          Оставить заявку
        </a>

        <button
          type="button"
          className={`header__burger${menuOpen ? ' header__burger--open' : ''}`}
          aria-controls="main-menu"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="header__burger-line" />
          <span className="header__burger-line" />
          <span className="header__burger-line" />
        </button>
      </div>
    </header>
  );
}
