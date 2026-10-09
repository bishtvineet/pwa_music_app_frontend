export function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(blob);
    audio.src = objectUrl;

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(Math.round(audio.duration) || 0);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(0);
    };
  });
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}