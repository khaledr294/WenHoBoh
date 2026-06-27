import { Language, Pharmacy } from '../types';

export const getPharmacyName = (pharmacies: Pharmacy[], id: string, lang: Language) => {
  const p = pharmacies.find(p => p.id === id);
  if (!p) return id;
  return lang === 'ar' ? p.nameAr : p.nameEn;
};

export const playAlertSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
    
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.4);
  } catch (e) {
    console.warn("Audio Context blocked or unsupported");
  }
};
