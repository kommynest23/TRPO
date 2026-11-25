/** Форматирует сумму: разделитель тысяч ru-RU и знак ₽, например «11 475 ₽» */
export function formatRub(value: number): string {
  return `${Math.round(value).toLocaleString('ru-RU')}\u00A0₽`;
}

/** Срок с правильным окончанием: «1 месяц», «3 месяца», «12 месяцев» */
export function formatMonths(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  let word = 'месяцев';
  if (mod10 === 1 && mod100 !== 11) {
    word = 'месяц';
  } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    word = 'месяца';
  }
  return `${count}\u00A0${word}`;
}
