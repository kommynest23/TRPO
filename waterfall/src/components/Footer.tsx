import '../styles/footer.css';

const SOCIALS = ['ВКонтакте', 'Telegram', 'YouTube'];

export function Footer() {
  return (
    <footer id="contacts" className="footer" aria-labelledby="contacts-title">
      <div className="container footer__inner">
        <div className="footer__brand">
          <p className="footer__logo">
            Pulse<span className="footer__logo-accent">Fit</span>
          </p>
          <p className="footer__copy">© 2026 PulseFit</p>
        </div>

        <div className="footer__contacts">
          <h2 id="contacts-title" className="footer__title">
            Контакты
          </h2>
          <address className="footer__address">
            <p>г. Санкт-Петербург, ул. Спортивная, д. 10</p>
            <p>
              <a className="footer__link" href="tel:+78120000000">
                +7 (812) 000-00-00
              </a>
            </p>
          </address>
        </div>

        <div className="footer__hours">
          <h2 className="footer__title">Часы работы</h2>
          <p>Пн–Пт: 7:00–23:00</p>
          <p>Сб–Вс: 9:00–22:00</p>
        </div>

        <div className="footer__socials">
          <h2 className="footer__title">Мы в соцсетях</h2>
          <ul className="footer__social-list">
            {SOCIALS.map((name) => (
              <li key={name}>
                <a className="footer__link" href="#">
                  {name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
