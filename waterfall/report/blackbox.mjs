/**
 * Тестирование методом чёрного ящика и проверка адаптивности.
 * Запускает собранную страницу (dist/) через vite preview, прогоняет
 * 8 тест-кейсов в Chrome через Playwright и сохраняет в report/assets/:
 *   blackbox.json — тест-кейсы с ожидаемым и фактическим результатом;
 *   screenshots/*.png — скриншоты страницы на 360, 768, 1440 px и калькулятора.
 *
 * Запуск: npm run build && node report/blackbox.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { preview } from 'vite';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'report', 'assets');
const shots = join(assets, 'screenshots');
const PORT = 4173;
const URL = `http://localhost:${PORT}/`;

/** Текст без неразрывных пробелов */
const plain = (s) => (s ?? '').replace(/\s+/g, ' ').trim();

const server = await preview({ root, preview: { port: PORT, strictPort: true } });
const browser = await chromium.launch({ channel: 'chrome' });

async function openPage(width = 1440, height = 900) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const logs = [];
  page.on('console', (msg) => logs.push(msg));
  await page.goto(URL);
  return { page, logs, close: () => context.close() };
}

/** Строки разбивки расчёта в виде «название: сумма» */
const breakdownRows = (page) =>
  page.$$eval('.breakdown__row', (els) => els.map((e) => `${e.querySelector('dt').textContent}: ${e.querySelector('dd').textContent}`));
/** Скриншот элемента; закреплённая шапка скрывается, чтобы не перекрывать элемент */
const shot = (page, selector, name) =>
  page.locator(selector).screenshot({ path: join(shots, name), style: '.header { visibility: hidden; }' });
const total = (page) => page.textContent('[data-testid=total]').then(plain);
const choosePlan = (page, id) => page.check(`input[name=plan][value=${id}]`, { force: true });
const chooseTerm = (page, months) => page.check(`input[name=months][value="${months}"]`, { force: true });

const cases = [
  {
    id: 'ТК-01',
    title: 'Навигация по якорному меню',
    steps: 'Открыть страницу (1440 px). В шапке нажать «Калькулятор».',
    expected: 'Страница прокручивается к разделу «Калькулятор абонемента», заголовок раздела виден и не перекрыт шапкой.',
    async run() {
      const { page, close } = await openPage();
      await page.click('.header__link[href="#calculator"]');
      await page.waitForTimeout(300);
      const title = await page.locator('#calculator-title').boundingBox();
      const header = await page.locator('.header').boundingBox();
      await close();
      const visible = title.y >= header.height && title.y < 900;
      return {
        actual: `Заголовок раздела на ${Math.round(title.y)} px от верха окна, высота шапки ${Math.round(header.height)} px.`,
        pass: visible,
      };
    },
  },
  {
    id: 'ТК-02',
    title: 'Бургер-меню на мобильной ширине',
    steps: 'Открыть страницу на ширине 360 px. Нажать кнопку меню. Выбрать пункт «Тарифы».',
    expected: 'Сначала пункты меню скрыты, видна кнопка-бургер. После нажатия меню раскрывается (aria-expanded=true). После выбора пункта меню закрывается.',
    async run() {
      const { page, close } = await openPage(360, 800);
      const link = page.locator('.header__link[href="#plans"]');
      const burger = page.getByRole('button', { name: 'Открыть меню' });
      const hiddenBefore = !(await link.isVisible());
      const burgerVisible = await burger.isVisible();
      await burger.click();
      const expanded = await page.locator('.header__burger').getAttribute('aria-expanded');
      const shownAfter = await link.isVisible();
      await page.waitForTimeout(250);
      await page.screenshot({ path: join(shots, 'burger-360.png') });
      await link.click();
      const hiddenAgain = !(await link.isVisible());
      await close();
      return {
        actual: `Меню скрыто: ${hiddenBefore ? 'да' : 'нет'}; бургер виден: ${burgerVisible ? 'да' : 'нет'}; после нажатия aria-expanded=${expanded}, пункты видны: ${shownAfter ? 'да' : 'нет'}; после выбора пункта меню закрыто: ${hiddenAgain ? 'да' : 'нет'}.`,
        pass: hiddenBefore && burgerVisible && expanded === 'true' && shownAfter && hiddenAgain,
      };
    },
  },
  {
    id: 'ТК-03',
    title: 'Расчёт с доп. услугой (контрольное значение №2)',
    steps: 'В калькуляторе выбрать «Стандарт», «3 месяца», отметить «Шкафчик».',
    expected: 'Итого 11 475 ₽, скидка за срок 5 % (−525 ₽), доп. услуги 1 500 ₽, в месяц 3 825 ₽.',
    async run() {
      const { page, close } = await openPage();
      await choosePlan(page, 'standard');
      await chooseTerm(page, 3);
      await page.getByLabel(/Шкафчик/).check();
      const rows = await breakdownRows(page);
      const t = await total(page);
      const perMonth = plain(await page.textContent('[data-testid=per-month]'));
      await shot(page, '#calculator', 'calculator-1440.png');
      await close();
      return {
        actual: `Итого ${t}, в месяц ${perMonth}; ${plain(rows[1])}; ${plain(rows[2])}.`,
        pass: t === '11 475 ₽' && perMonth === '3 825 ₽' && plain(rows[1]).endsWith('−525 ₽') && plain(rows[2]).endsWith('1 500 ₽'),
      };
    },
  },
  {
    id: 'ТК-04',
    title: 'Применение промокода (контрольное значение №1)',
    steps: 'Выбрать «Премиум», «12 месяцев». В поле «Промокод» ввести 12345.',
    expected: 'До ввода промокода итог 51 000 ₽. После ввода — итог 49 470 ₽, строка «Промокод 3 %» −1 530 ₽, сообщение «Промокод применён».',
    async run() {
      const { page, close } = await openPage();
      await choosePlan(page, 'premium');
      await chooseTerm(page, 12);
      const before = await total(page);
      await page.fill('#promo', '12345');
      const after = await total(page);
      const promoRow = plain((await breakdownRows(page)).find((r) => r.startsWith('Промокод')));
      const message = plain(await page.textContent('#promo-success'));
      await shot(page, '#calculator', 'calculator-promo-1440.png');
      await close();
      return {
        actual: `До: ${before}; после: ${after}; строка «${promoRow}»; сообщение «${message}».`,
        pass: before === '51 000 ₽' && after === '49 470 ₽' && promoRow.endsWith('−1 530 ₽') && message.startsWith('Промокод применён'),
      };
    },
  },
  {
    id: 'ТК-05',
    title: 'Недопустимое число тренировок',
    steps: 'Ввести в поле «Персональные тренировки» значение 5 (итог 11 000 ₽), затем 2.5, затем сменить тариф на «Премиум».',
    expected: 'Поле подсвечено красным, под ним «Введите целое число от 0 до 20», aria-invalid=true. Итог остаётся 11 000 ₽ и не меняется при смене тарифа.',
    async run() {
      const { page, close } = await openPage();
      await page.fill('#trainings', '5');
      const valid = await total(page);
      await page.fill('#trainings', '2.5');
      const error = plain(await page.textContent('#trainings-error'));
      const invalid = await page.getAttribute('#trainings', 'aria-invalid');
      const border = await page.$eval('#trainings', (el) => getComputedStyle(el).borderColor);
      await choosePlan(page, 'premium');
      const frozen = await total(page);
      await shot(page, '#calculator', 'calculator-error-1440.png');
      await close();
      return {
        actual: `Итог при 5: ${valid}; ошибка «${error}», aria-invalid=${invalid}, цвет рамки ${border}; итог после смены тарифа: ${frozen}.`,
        pass: valid === '11 000 ₽' && error === 'Введите целое число от 0 до 20' && invalid === 'true' && frozen === '11 000 ₽',
      };
    },
  },
  {
    id: 'ТК-06',
    title: 'Граница цены тренировок 9/10',
    steps: 'Выбрать «Базовый», «1 месяц». Ввести 9 тренировок, затем 10.',
    expected: '9 тренировок: итог 16 000 ₽ (9 × 1 500 ₽). 10 тренировок: итог 15 500 ₽ (10 × 1 300 ₽).',
    async run() {
      const { page, close } = await openPage();
      await choosePlan(page, 'basic');
      await page.fill('#trainings', '9');
      const nine = await total(page);
      await page.fill('#trainings', '10');
      const ten = await total(page);
      await close();
      return { actual: `9 тренировок: ${nine}; 10 тренировок: ${ten}.`, pass: nine === '16 000 ₽' && ten === '15 500 ₽' };
    },
  },
  {
    id: 'ТК-07',
    title: 'Отправка пустой формы заявки',
    steps: 'Не заполняя форму, нажать «Отправить заявку».',
    expected: 'Под полями «Имя», «Телефон» и чекбоксом согласия появляются ошибки, поля помечены aria-invalid, фокус на поле «Имя», сообщения об отправке нет.',
    async run() {
      const { page, logs, close } = await openPage();
      await page.click('.order-form__submit');
      const errors = await page.$$eval('.order-form .field__error', (els) => els.map((e) => e.textContent));
      const focused = await page.evaluate(() => document.activeElement?.id);
      const status = plain(await page.textContent('.order-form__status'));
      await shot(page, '#order', 'form-errors-1440.png');
      await close();
      const sent = logs.some((m) => m.text().startsWith('Заявка PulseFit'));
      return {
        actual: `Ошибки: ${errors.map((e) => `«${e}»`).join(', ')}; фокус: #${focused}; сообщение об отправке: ${status ? `«${status}»` : 'нет'}; console.log: ${sent ? 'был' : 'не было'}.`,
        pass: errors.length === 3 && focused === 'order-name' && !status && !sent,
      };
    },
  },
  {
    id: 'ТК-08',
    title: 'Отправка корректной заявки',
    steps: 'В калькуляторе выбрать «Стандарт», «3 месяца», «Шкафчик». В форме ввести имя «Анна», телефон «+7 (999) 123-45-67», отметить согласие, нажать «Отправить заявку».',
    expected: 'Сводка над кнопкой: «Стандарт, 3 месяца — итого 11 475 ₽». После отправки — сообщение «Заявка отправлена», в консоли объект с формой, конфигурацией и итогом 11 475, поля формы очищены.',
    async run() {
      const { page, logs, close } = await openPage();
      await choosePlan(page, 'standard');
      await chooseTerm(page, 3);
      await page.getByLabel(/Шкафчик/).check();
      const summary = plain(await page.textContent('.order-form__summary'));
      await page.fill('#order-name', 'Анна');
      await page.fill('#order-phone', '+7 (999) 123-45-67');
      await page.check('#order-consent');
      await page.click('.order-form__submit');
      const status = plain(await page.textContent('.order-form__status'));
      const message = logs.find((m) => m.text().startsWith('Заявка PulseFit'));
      const payload = message ? await message.args()[1].jsonValue() : null;
      const cleared = (await page.inputValue('#order-name')) === '' && !(await page.isChecked('#order-consent'));
      await shot(page, '#order', 'form-sent-1440.png');
      await close();
      return {
        actual: `Сводка «${summary}»; сообщение «${status}»; в консоли: ${payload ? `объект заявки (имя «${payload.form.name}», телефон ${payload.form.phone}, тариф ${payload.config.planId}, ${payload.config.months} мес., шкафчик: ${payload.config.locker ? 'да' : 'нет'}, итог ${payload.total})` : 'нет'}; форма очищена: ${cleared ? 'да' : 'нет'}.`,
        pass:
          summary.includes('Стандарт, 3 месяца — итого 11 475 ₽') &&
          status === 'Заявка отправлена' &&
          payload?.total === 11475 &&
          payload?.form.name === 'Анна' &&
          payload?.config.planId === 'standard' &&
          cleared,
      };
    },
  },
];

await mkdir(shots, { recursive: true });

const results = [];
try {
  for (const testCase of cases) {
    const { run, ...info } = testCase;
    let outcome;
    try {
      outcome = await run();
    } catch (error) {
      outcome = { actual: `Ошибка выполнения: ${error.message}`, pass: false };
    }
    results.push({ ...info, actual: outcome.actual, status: outcome.pass ? 'Пройден' : 'Не пройден' });
    console.log(`${info.id} ${outcome.pass ? 'PASS' : 'FAIL'} — ${outcome.actual}`);
  }

  // Адаптивность: полностраничные скриншоты и проверка горизонтальной прокрутки
  const adaptive = [];
  for (const width of [360, 768, 1440]) {
    const { page, close } = await openPage(width, 900);
    await page.screenshot({ path: join(shots, `page-${width}.png`), fullPage: true });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    adaptive.push({ width, scrollWidth, noHorizontalScroll: scrollWidth <= width });
    await close();
  }
  console.log('Адаптивность:', adaptive);

  await writeFile(join(assets, 'blackbox.json'), JSON.stringify({ date: new Date().toISOString(), results, adaptive }, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}

process.exitCode = results.every((r) => r.status === 'Пройден') ? 0 : 1;
