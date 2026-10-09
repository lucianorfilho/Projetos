// Voz no navegador via Web Speech API:
// - speak(): o tutor fala em inglês (TTS)
// - createRecognizer(): reconhecimento de fala do aluno (STT, en-US)

export function speak(text: string, rate = 0.95) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text.replace(/[()😉🎉👏💪🏆🎯]/g, ''));
  utter.lang = 'en-US';
  utter.rate = rate;
  const voices = window.speechSynthesis.getVoices();
  const enVoice =
    voices.find((v) => v.lang === 'en-US' && /female|zira|aria|jenny|samantha/i.test(v.name)) ||
    voices.find((v) => v.lang === 'en-US') ||
    voices.find((v) => v.lang.startsWith('en'));
  if (enVoice) utter.voice = enVoice;
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function speechSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export function createRecognizer(
  onResult: (transcript: string) => void,
  onEnd: () => void,
  onError: (err: string) => void
) {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) {
    onError('Reconhecimento de voz não suportado neste navegador. Use Chrome ou Edge.');
    return null;
  }
  const rec = new SR();
  rec.lang = 'en-US';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.continuous = false;

  rec.onresult = (event: any) => {
    const transcript = Array.from(event.results)
      .map((r: any) => r[0].transcript)
      .join(' ');
    onResult(transcript.trim());
  };
  rec.onend = () => onEnd();
  rec.onerror = (e: any) => onError(e.error === 'no-speech' ? 'Não ouvi nada — tente de novo mais perto do microfone.' : `Erro no microfone: ${e.error}`);

  return rec;
}
