export const getInitials = (name: string): string => {
  const clean = name.trim();
  if (!clean) return 'U';

  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean[0].toUpperCase();
};

export const formatDisplayName = (name: string): string => {
  const clean = name.trim();
  if (!clean) return 'Music Lover';

  return clean
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const MUSIC_QUOTES = [
  { text: 'Where words fail, music speaks.', author: 'Hans Christian Andersen' },
  { text: 'Without music, life would be a mistake.', author: 'Friedrich Nietzsche' },
  { text: 'Music is the divine way to tell beautiful, poetic things to the heart.', author: 'Pablo Casals' },
  { text: 'One good thing about music, when it hits you, you feel no pain.', author: 'Bob Marley' },
  { text: 'Music is the soundtrack of our lives.', author: 'Dick Clark' },
];