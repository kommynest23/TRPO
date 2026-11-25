import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { ScoringRules } from '../components/ScoringRules';
import { QUESTIONS } from '../data/questions';
import { FILTER_OPTIONS, filterQuestions, readFilters } from '../game/filters';
import { ROUND_SIZE } from '../game/quiz';
import type { QuestionType } from '../types/question';
import styles from './CatalogPage.module.css';

const FILTER_LABELS = {
  type: 'Тип вопросов',
  genre: 'Жанр',
  difficulty: 'Сложность',
} as const;

const TYPE_TITLES: Record<QuestionType, string> = {
  frame: 'По кадрам',
  poster: 'По постерам',
  quote: 'По цитатам',
  soundtrack: 'По саундтрекам',
};

export function CatalogPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const questions = filterQuestions(QUESTIONS, filters);
  const typeCounts = new Map<QuestionType, number>();
  for (const { type } of questions) {
    typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
  }

  const rounds: { type: QuestionType | null; title: string; count: number }[] = Array.from(
    typeCounts,
    ([type, count]) => ({ type, title: TYPE_TITLES[type], count }),
  );
  if (typeCounts.size > 1) {
    rounds.unshift({ type: null, title: 'Смешанная викторина', count: questions.length });
  }

  const play = (type: QuestionType | null) => {
    const search = new URLSearchParams(params);
    if (type) search.set('type', type);
    navigate({ pathname: '/play', search: search.toString() });
  };

  return (
    <main className={styles.page}>
      <Link className={styles.logo} to="/">Угадай кино</Link>
      <h1 className={styles.title}>Каталог викторин</h1>

      <div className={styles.filters}>
        {(Object.keys(FILTER_LABELS) as (keyof typeof FILTER_LABELS)[]).map((name) => (
          <label className={styles.field} key={name}>
            <span>{FILTER_LABELS[name]}</span>
            <select
              value={filters[name] ?? ''}
              onChange={(event) => {
                const value = event.target.value;
                const next = new URLSearchParams(params);
                if (value) next.set(name, value);
                else next.delete(name);
                setParams(next, { replace: true });
              }}
            >
              <option value="">Любой</option>
              {Object.entries(FILTER_OPTIONS[name]).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        ))}
        <Button variant="secondary" onClick={() => setParams({}, { replace: true })}>
          Сбросить фильтры
        </Button>
      </div>

      <p className={styles.status} role="status">
        {rounds.length ? `Доступно викторин: ${rounds.length}` : 'По выбранным фильтрам викторин нет.'}
      </p>
      {rounds.length > 0 && (
        <>
          <ScoringRules />
          <ul className={styles.rounds}>
            {rounds.map(({ type, title, count }) => (
              <li className={styles.card} key={type ?? 'mixed'}>
                <h2>{title}</h2>
                <p>Вопросов в раунде: {Math.min(count, ROUND_SIZE)}</p>
                <Button onClick={() => play(type)} aria-label={`Играть: ${title}`}>Играть</Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
