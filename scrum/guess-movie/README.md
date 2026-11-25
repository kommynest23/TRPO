# Угадай кино — Спринт 1

Кино-викторина: смешанные вопросы (кадр, постер, цитата, саундтрек), 4 варианта ответа, таймер,
показ правильного ответа с автопереходом и итоговый счёт.

## Запуск

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # юнит-тесты игровой логики (Vitest)
npm run build    # production-сборка в dist/
```

## Что сделано в спринте 1 (задачи бэклога 1–5)

| № | Задача | Где в коде |
|---|--------|-----------|
| 1 | Главная с кнопкой «Играть» | `src/pages/HomePage.tsx` |
| 2 | Банк вопросов (тип, медиа, варианты, ответ, жанр, сложность) | `src/types/question.ts`, `src/data/questions.ts` |
| 3 | Экран вопроса: медиа, 4 варианта, таймер 15 с | `src/pages/GamePage.tsx`, `src/components/` |
| 4 | Правильный ответ, пауза 3 с, автопереход | `src/components/RevealPanel.tsx` |
| 5 | Подсчёт очков и экран результата | `src/game/quiz.ts`, `src/pages/ResultPage.tsx` |

Игровая логика (сбор раунда, reducer состояний `answering → reveal → finished`) — чистые функции
в `src/game/`, покрыты тестами `src/game/quiz.test.ts`.

Стили — CSS Modules + дизайн-токены (CSS-переменные) в `src/styles/tokens.css`.

## Медиафайлы

См. [MEDIA.md](MEDIA.md). Если файла нет, в вопросе показывается заглушка — игра не ломается.
