import React, { useMemo, useState } from 'react';
import { Linking, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { triggerHaptic } from '../services/firebase';
import { UserProfile } from '../context/AppContext';

interface FormattedMessageTextProps {
  text: string;
  color: string;
  accent: string;
  fontSize?: number;
  highlightQuery?: string;
  usersMap?: Record<string, UserProfile>;
  onMentionPress?: (uid: string) => void;
  onHashtagPress?: (tag: string) => void;
  onCopyCode?: (code: string) => void;
  onTimecodePress?: (seconds: number) => void;
}

function renderHighlighted(
  str: string,
  query: string,
  baseStyle: any,
  keyPrefix: string
) {
  if (!query.trim()) {
    return (
      <Text key={keyPrefix} style={baseStyle}>
        {str}
      </Text>
    );
  }
  const q = query.trim();
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = str.split(regex);
  return (
    <Text key={keyPrefix} style={baseStyle}>
      {parts.map((part, idx) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <Text key={idx} style={styles.highlight}>
            {part}
          </Text>
        ) : (
          part
        )
      )}
    </Text>
  );
}

function InlineFormattedLine({
  line,
  color,
  accent,
  fontSize,
  highlightQuery,
  usersMap,
  onMentionPress,
  onHashtagPress,
  onCopyCode,
  onTimecodePress,
}: {
  line: string;
  color: string;
  accent: string;
  fontSize: number;
  highlightQuery?: string;
  usersMap?: Record<string, UserProfile>;
  onMentionPress?: (uid: string) => void;
  onHashtagPress?: (tag: string) => void;
  onCopyCode?: (code: string) => void;
  onTimecodePress?: (seconds: number) => void;
}) {
  const [revealedMap, setRevealedMap] = useState<Record<number, boolean>>({});

  // Tokenize: ||spoiler||, `code`, **bold**, ~~strike~~, *italic*, https://url, @mention, #hashtag, mm:ss timecode
  const tokenRegex =
    /(\|\|[^|\n]+\|\||`[^`\n]+`|\*\*[^*\n]+\*\*|~~[^~\n]+~~|\*[^*\n]+\*|https?:\/\/[^\s<>"']+|@[a-zA-Zа-яА-ЯёЁ0-9_]+|#[a-zA-Zа-яА-ЯёЁ0-9_]+|\b\d{1,2}:\d{2}\b)/g;
  const parts = line.split(tokenRegex);

  const baseStyle = {
    color,
    fontSize,
    lineHeight: Math.round(fontSize * 1.4),
  };

  return (
    <Text style={baseStyle}>
      {parts.map((part, idx) => {
        if (!part) return null;

        if (part.startsWith('||') && part.endsWith('||') && part.length > 4) {
          const inner = part.slice(2, -2);
          const revealed = !!revealedMap[idx];
          return (
            <Text
              key={idx}
              onPress={() => {
                triggerHaptic(8);
                setRevealedMap((prev) => ({ ...prev, [idx]: !prev[idx] }));
              }}
              style={[baseStyle, revealed ? styles.spoilerRevealed : styles.spoilerHidden]}
            >
              {revealed ? inner : '▒'.repeat(Math.min(18, Math.max(4, inner.length)))}
            </Text>
          );
        }

        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          const codeVal = part.slice(1, -1);
          return (
            <Text
              key={idx}
              onPress={() => {
                triggerHaptic(10);
                if (onCopyCode) onCopyCode(codeVal);
                else Share.share({ message: codeVal }).catch(() => {});
              }}
              style={[styles.codeInline, { fontSize: Math.max(12, fontSize - 1) }]}
            >
              {' '}
              {codeVal} 📋{' '}
            </Text>
          );
        }

        if (/^\d{1,2}:\d{2}$/.test(part) && onTimecodePress) {
          const [mm, ss] = part.split(':').map((n) => parseInt(n, 10) || 0);
          return (
            <Text
              key={idx}
              onPress={() => {
                triggerHaptic(8);
                onTimecodePress(mm * 60 + ss);
              }}
              style={[baseStyle, { color: accent, fontWeight: '700', textDecorationLine: 'underline' }]}
            >
              {part}
            </Text>
          );
        }

        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return renderHighlighted(
            part.slice(2, -2),
            highlightQuery || '',
            [baseStyle, { fontWeight: '800' }],
            `b_${idx}`
          );
        }

        if (part.startsWith('~~') && part.endsWith('~~') && part.length > 4) {
          return renderHighlighted(
            part.slice(2, -2),
            highlightQuery || '',
            [baseStyle, { textDecorationLine: 'line-through', opacity: 0.78 }],
            `s_${idx}`
          );
        }

        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          return renderHighlighted(
            part.slice(1, -1),
            highlightQuery || '',
            [baseStyle, { fontStyle: 'italic' }],
            `i_${idx}`
          );
        }

        if (/^https?:\/\//i.test(part)) {
          return (
            <Text
              key={idx}
              onPress={() => Linking.openURL(part).catch(() => {})}
              style={[baseStyle, { color: accent, textDecorationLine: 'underline' }]}
            >
              {part}
            </Text>
          );
        }

        if (part.startsWith('#') && part.length > 1) {
          return (
            <Text
              key={idx}
              onPress={() => {
                if (onHashtagPress) {
                  triggerHaptic(8);
                  onHashtagPress(part);
                }
              }}
              style={[baseStyle, { color: accent, fontWeight: '700' }]}
            >
              {part}
            </Text>
          );
        }

        if (part.startsWith('@') && part.length > 1) {
          const handle = part.slice(1).toLowerCase();
          const matchedUser = usersMap
            ? Object.values(usersMap).find(
                (u) =>
                  (u.nickLower || u.nick || '').toLowerCase() === handle ||
                  u.nick.toLowerCase() === handle
              )
            : undefined;
          return (
            <Text
              key={idx}
              onPress={() => {
                if (matchedUser && onMentionPress) {
                  triggerHaptic(8);
                  onMentionPress(matchedUser.uid);
                }
              }}
              style={[
                baseStyle,
                {
                  color: accent,
                  fontWeight: '700',
                  textDecorationLine: matchedUser ? 'underline' : 'none',
                },
              ]}
            >
              {part}
            </Text>
          );
        }

        return renderHighlighted(part, highlightQuery || '', baseStyle, `t_${idx}`);
      })}
    </Text>
  );
}

export const FormattedMessageText: React.FC<FormattedMessageTextProps> = ({
  text,
  color,
  accent,
  fontSize = 15,
  highlightQuery,
  usersMap,
  onMentionPress,
  onHashtagPress,
  onCopyCode,
  onTimecodePress,
}) => {
  const firstUrl = useMemo(() => {
    if (!text) return null;
    const m = String(text).match(/https?:\/\/[^\s<>"']+/i);
    if (!m) return null;
    try {
      const u = new URL(m[0]);
      return { raw: m[0], host: u.hostname.replace(/^www\./, ''), path: u.pathname !== '/' ? u.pathname : '' };
    } catch (_) {
      return { raw: m[0], host: m[0].replace(/^https?:\/\//i, '').split('/')[0], path: '' };
    }
  }, [text]);

  if (!text) return null;
  const lines = String(text).split('\n');

  return (
    <View style={{ gap: 4 }}>
      {lines.map((line, i) => {
        if (line.startsWith('> ')) {
          return (
            <View key={i} style={[styles.quoteBox, { borderLeftColor: accent }]}>
              <InlineFormattedLine
                line={line.slice(2)}
                color={color}
                accent={accent}
                fontSize={Math.max(13, fontSize - 1)}
                highlightQuery={highlightQuery}
                usersMap={usersMap}
                onMentionPress={onMentionPress}
                onHashtagPress={onHashtagPress}
                onCopyCode={onCopyCode}
                onTimecodePress={onTimecodePress}
              />
            </View>
          );
        }
        return (
          <InlineFormattedLine
            key={i}
            line={line}
            color={color}
            accent={accent}
            fontSize={fontSize}
            highlightQuery={highlightQuery}
            usersMap={usersMap}
            onMentionPress={onMentionPress}
            onHashtagPress={onHashtagPress}
            onCopyCode={onCopyCode}
            onTimecodePress={onTimecodePress}
          />
        );
      })}

      {firstUrl && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => Linking.openURL(firstUrl.raw).catch(() => {})}
          style={[styles.linkPreviewCard, { borderLeftColor: accent }]}
        >
          <Text style={[styles.linkHost, { color: accent }]} numberOfLines={1}>
            🌐 {firstUrl.host}
          </Text>
          <Text style={styles.linkSub} numberOfLines={1}>
            {firstUrl.path || firstUrl.raw}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10.5, marginTop: 2 }}>
            Открыть ссылку ↗
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  quoteBox: {
    borderLeftWidth: 3,
    paddingLeft: 9,
    paddingVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 6,
  },
  spoilerHidden: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    color: 'rgba(255,255,255,0.18)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  spoilerRevealed: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
  },
  codeInline: {
    fontFamily: 'monospace',
    backgroundColor: 'rgba(0,0,0,0.35)',
    color: '#93c5fd',
    borderRadius: 5,
  },
  highlight: {
    backgroundColor: 'rgba(250, 204, 21, 0.45)',
    color: '#fff',
    fontWeight: '800',
  },
  linkPreviewCard: {
    marginTop: 4,
    borderLeftWidth: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  linkHost: { fontSize: 12.5, fontWeight: '800' },
  linkSub: { color: '#e2e8f0', fontSize: 12, marginTop: 1 },
});
