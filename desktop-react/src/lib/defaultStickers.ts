export interface StickerItem {
  url: string;
  emoji: string;
}

export interface DefaultStickerPack {
  id: string;
  title: string;
  slug: string;
  kind: 'sticker' | 'emoji';
  authorNick: string;
  stickers: StickerItem[];
}

export const DEFAULT_STICKER_PACKS: DefaultStickerPack[] = [
  {
    id: 'pack_memes',
    title: 'Мемы и Реакции',
    slug: 'memes_reactions',
    kind: 'sticker',
    authorNick: 'Беспонтовый Чат',
    stickers: [
      { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f525.png', emoji: '🔥' },
      { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f973.png', emoji: '🥳' },
      { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f92f.png', emoji: '🤯' },
      { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f60e.png', emoji: '😎' },
      { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f92a.png', emoji: '🤪' },
      { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f602.png', emoji: '😂' },
      { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f923.png', emoji: '🤣' },
      { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f60d.png', emoji: '😍' },
      { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f44d.png', emoji: '👍' },
      { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f44c.png', emoji: '👌' },
      { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4a9.png', emoji: '💩' },
      { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f47b.png', emoji: '👻' },
      { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f480.png', emoji: '💀' },
      { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4af.png', emoji: '💯' },
      { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f680.png', emoji: '🚀' },
      { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2764.png', emoji: '❤️' },
    ],
  },
  {
    id: 'pack_cats',
    title: 'Котики',
    slug: 'cats_pack',
    kind: 'sticker',
    authorNick: 'Котофей',
    stickers: [
      { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f63a.png', emoji: '😺' },
      { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f638.png', emoji: '😸' },
      { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f639.png', emoji: '😹' },
      { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f63b.png', emoji: '😻' },
      { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f63c.png', emoji: '😼' },
      { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f63d.png', emoji: '😽' },
      { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f640.png', emoji: '🙀' },
      { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f63f.png', emoji: '😿' },
      { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f63e.png', emoji: '😾' },
    ],
  },
];
