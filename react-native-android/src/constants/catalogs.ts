export const CREATOR_UID = 'JBe6nbSfgWOOEa9puh62dY5BuaY2';

export const FEMALE_UIDS = new Set<string>([
  'ieg1YXWEzYNtxpFc7okSkhW041s1',
]);

export const APP_VERSION = '4.4.0';
export const APP_VERSION_CODE = 440;

export interface ThemeItem {
  id: string;
  name: string;
  cost: number;
  desc: string;
  bg: string;
  card: string;
  accent: string;
  border: string;
}

export const PROFILE_THEMES_CATALOG: ThemeItem[] = [
  {
    id: 'classic',
    name: 'Тёмный графит',
    cost: 0,
    desc: 'Классический стиль',
    bg: '#171a21',
    card: '#1b2838',
    accent: '#66c0f4',
    border: 'rgba(102, 192, 244, 0.28)',
  },
  {
    id: 'bakery',
    name: 'Пекарня Пирожков',
    cost: 50,
    desc: 'Тёплый уют',
    bg: '#211204',
    card: '#3d2208',
    accent: '#fbbf24',
    border: 'rgba(245, 158, 11, 0.45)',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    cost: 60,
    desc: 'Неоновый киберпанк',
    bg: '#160326',
    card: '#2e0854',
    accent: '#f472b6',
    border: 'rgba(236, 72, 153, 0.45)',
  },
  {
    id: 'matrix',
    name: 'Matrix Green',
    cost: 75,
    desc: 'Цифровой код',
    bg: '#03140b',
    card: '#052615',
    accent: '#34d399',
    border: 'rgba(16, 185, 129, 0.45)',
  },
  {
    id: 'galaxy',
    name: 'Deep Space',
    cost: 80,
    desc: 'Космическая бездна',
    bg: '#0d0926',
    card: '#1a1040',
    accent: '#818cf8',
    border: 'rgba(99, 102, 241, 0.45)',
  },
  {
    id: 'crimson',
    name: 'Crimson Fire',
    cost: 90,
    desc: 'Багровое пламя',
    bg: '#21050b',
    card: '#3b0914',
    accent: '#f87171',
    border: 'rgba(239, 68, 68, 0.45)',
  },
];

export interface FrameItem {
  id: string;
  name: string;
  cost: number;
  desc: string;
  borderColor: string;
  secondaryColor: string;
}

export const PROFILE_FRAMES_CATALOG: FrameItem[] = [
  {
    id: 'none',
    name: 'Обычная',
    cost: 0,
    desc: 'Без рамки',
    borderColor: 'rgba(255,255,255,0.12)',
    secondaryColor: 'transparent',
  },
  {
    id: 'gold',
    name: 'Золото',
    cost: 75,
    desc: 'Золотое свечение',
    borderColor: '#ffd700',
    secondaryColor: '#f59e0b',
  },
  {
    id: 'neon',
    name: 'Неон',
    cost: 100,
    desc: 'Кибер-пульс',
    borderColor: '#00f2fe',
    secondaryColor: '#ec4899',
  },
  {
    id: 'fire',
    name: 'Пламя',
    cost: 100,
    desc: 'Огненная аура',
    borderColor: '#f97316',
    secondaryColor: '#ef4444',
  },
  {
    id: 'rainbow',
    name: 'Радуга',
    cost: 150,
    desc: 'Переливы RGB',
    borderColor: '#8b5cf6',
    secondaryColor: '#10b981',
  },
];

export const PREFIX_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  gold: { label: 'Золото', bg: 'rgba(245, 158, 11, 0.25)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.6)' },
  pro: { label: 'PRO Синий', bg: 'rgba(59, 130, 246, 0.25)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.6)' },
  neon: { label: 'Неон', bg: 'rgba(6, 182, 212, 0.25)', text: '#22d3ee', border: 'rgba(6, 182, 212, 0.6)' },
  fire: { label: 'Огонь', bg: 'rgba(239, 68, 68, 0.25)', text: '#f87171', border: 'rgba(239, 68, 68, 0.6)' },
  lux: { label: 'LUX', bg: 'rgba(168, 85, 247, 0.25)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.6)' },
  amber: { label: 'Пирожок', bg: 'rgba(217, 119, 6, 0.28)', text: '#fcd34d', border: 'rgba(217, 119, 6, 0.6)' },
  crush: { label: 'Краш', bg: 'rgba(236, 72, 153, 0.25)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.6)' },
  boss: { label: 'Босс', bg: 'rgba(249, 115, 22, 0.25)', text: '#fb923c', border: 'rgba(249, 115, 22, 0.6)' },
  hacker: { label: 'Хакер', bg: 'rgba(16, 185, 129, 0.25)', text: '#34d399', border: 'rgba(16, 185, 129, 0.6)' },
  legend: { label: 'Легенда', bg: 'rgba(139, 92, 246, 0.30)', text: '#ddd6fe', border: 'rgba(250, 204, 21, 0.65)' },
};

export interface PresetPrefixItem {
  text: string;
  style: string;
  cost: number;
}

export const PRESET_PREFIXES: PresetPrefixItem[] = [
  { text: '👑 VIP', style: 'gold', cost: 50 },
  { text: '⚡ PRO', style: 'pro', cost: 75 },
  { text: '🔥 ОГОНЬ', style: 'fire', cost: 75 },
  { text: '💎 LUX', style: 'lux', cost: 100 },
  { text: '🥐 ПИРОЖОК', style: 'amber', cost: 50 },
  { text: '😈 КРАШ', style: 'crush', cost: 100 },
  { text: '🚀 БОСС', style: 'boss', cost: 150 },
  { text: '👾 ХАКЕР', style: 'hacker', cost: 150 },
  { text: '✨ ЛЕГЕНДА', style: 'legend', cost: 200 },
];

export interface SoundPresetItem {
  id: string;
  name: string;
  icon: string;
  dur: string;
  desc: string;
}

export const PREFIX_SOUND_PRESETS: SoundPresetItem[] = [
  { id: 'coin', name: 'Монетка', icon: '🪙', dur: '0.3с', desc: 'Звонкий ретро-бонус' },
  { id: 'magic', name: 'Магия', icon: '✨', dur: '0.5с', desc: 'Искрящийся аккорд' },
  { id: 'victory', name: 'Победа', icon: '🏆', dur: '0.7с', desc: 'Победный фанфар' },
  { id: 'nom', name: 'Пирожок', icon: '🥟', dur: '0.4с', desc: 'Хрустящий кусь' },
  { id: 'meow', name: 'Мяу', icon: '🐱', dur: '0.5с', desc: 'Милое мяуканье' },
  { id: 'laser', name: 'Бластер', icon: '🔫', dur: '0.3с', desc: 'Космический пиу' },
  { id: 'punch', name: 'Удар', icon: '🥊', dur: '0.3с', desc: 'Мощный бас-удар' },
  { id: 'bell', name: 'Колокол', icon: '🔔', dur: '0.7с', desc: 'Хрустальный перезвон' },
  { id: 'pop', name: 'Капля', icon: '💧', dur: '0.2с', desc: 'Водяной бульк' },
  { id: 'blip', name: '8-Bit', icon: '👾', dur: '0.2с', desc: 'Аркадный пик' },
  { id: 'cyber', name: 'Кибер', icon: '⚡', dur: '0.4с', desc: 'Футуристичный свист' },
  { id: 'tada', name: 'Та-да!', icon: '🎉', dur: '0.6с', desc: 'Праздничный аккорд' },
];

export const PIROZHKI_PACKS = [
  { count: 50, priceRub: 21, hot: false },
  { count: 100, priceRub: 42, hot: true },
  { count: 250, priceRub: 105, hot: false },
  { count: 500, priceRub: 210, hot: false },
  { count: 1000, priceRub: 420, hot: false },
];
