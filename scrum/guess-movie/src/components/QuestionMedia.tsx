import { useState } from 'react';
import type { QuestionMedia as Media } from '../types/question';
import styles from './QuestionMedia.module.css';

interface Props {
  media: Media;
  /** Автозапуск аудио (в игре — да, при просмотре вопросов после раунда — нет). */
  autoPlay?: boolean;
}

/**
 * Показывает содержимое вопроса в зависимости от его типа.
 * Родитель задаёт `key` по id вопроса, поэтому состояние ошибки
 * загрузки сбрасывается при переходе к следующему вопросу.
 */
export function QuestionMedia({ media, autoPlay = false }: Props) {
  const [failed, setFailed] = useState(false);

  if (media.kind === 'text') {
    return (
      <blockquote className={styles.quote}>
        <span className={styles.quoteMark} aria-hidden="true">
          «
        </span>
        {media.text}
        <span className={styles.quoteMark} aria-hidden="true">
          »
        </span>
      </blockquote>
    );
  }

  if (failed) {
    return (
      <div className={styles.placeholder} role="img" aria-label="Медиафайл не найден">
        <span className={styles.placeholderIcon} aria-hidden="true">
          {media.kind === 'audio' ? '♫' : '🎞'}
        </span>
        <span>{media.kind === 'audio' ? 'Аудиофрагмент не найден' : 'Изображение не найдено'}</span>
        <code className={styles.placeholderPath}>public{media.src}</code>
      </div>
    );
  }

  if (media.kind === 'image') {
    return (
      <div className={styles.frame}>
        <img className={styles.image} src={media.src} alt={media.alt} onError={() => setFailed(true)} />
      </div>
    );
  }

  return (
    <div className={styles.audioBox}>
      <span className={styles.audioIcon} aria-hidden="true">
        ♫
      </span>
      <audio
        className={styles.audio}
        src={media.src}
        controls
        autoPlay={autoPlay}
        preload={autoPlay ? 'auto' : 'none'}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
