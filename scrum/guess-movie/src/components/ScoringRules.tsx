import {
  BASE_POINTS,
  MAX_SPEED_BONUS,
  SPEED_BONUS_DECAY_SEC,
  SPEED_BONUS_GRACE_SEC,
} from '../game/quiz';
import styles from './ScoringRules.module.css';

const halfTime = (SPEED_BONUS_DECAY_SEC / 2).toLocaleString('ru-RU');
const halfBonus = Math.round(MAX_SPEED_BONUS / 2);

export function ScoringRules() {
  return (
    <aside className={styles.rules} aria-label="Как начисляются очки">
      <p>
        За верный ответ — <strong>{BASE_POINTS} очков + до {MAX_SPEED_BONUS} за скорость</strong>.
        {' '}За ошибку или пропуск — 0.
      </p>
      <p>
        Первые {SPEED_BONUS_GRACE_SEC} секунды бонус составляет {MAX_SPEED_BONUS} очков.
        Затем он уменьшается пропорционально оставшемуся времени. Умножьте {MAX_SPEED_BONUS}
        {' '}на оставшиеся секунды, разделите на {SPEED_BONUS_DECAY_SEC} и округлите до ближайшего целого.
        Например, если в момент верного ответа оставалось {halfTime} секунды, бонус составит {halfBonus},
        {' '}всего — {BASE_POINTS + halfBonus} очков.
      </p>
    </aside>
  );
}
