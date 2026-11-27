import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CREATOR_UID, FEMALE_UIDS } from '../constants/catalogs';
import { UserProfile } from '../context/AppContext';

interface SpecialBadgesProps {
  uid?: string;
  user?: UserProfile | null;
  large?: boolean;
}

export const SpecialBadges: React.FC<SpecialBadgesProps> = ({ uid, user, large = false }) => {
  const resolvedUid = uid || user?.uid || '';
  const isCreator = resolvedUid === CREATOR_UID;
  const isFemale = (resolvedUid && FEMALE_UIDS.has(resolvedUid)) || user?.gender === 'female';
  const isVerified = !!user?.verified;

  if (!isCreator && !isFemale && !isVerified) return null;

  return (
    <View style={styles.row}>
      {isVerified && (
        <View style={[styles.verBadge, large && styles.verBadgeLg]}>
          <Text style={[styles.verTxt, large && { fontSize: 10 }]}>✓</Text>
        </View>
      )}
      {isFemale && (
        <View style={[styles.femaleBadge, large && styles.femaleBadgeLg]}>
          <Text style={[styles.femaleTxt, large && { fontSize: 12 }]}>♀</Text>
        </View>
      )}
      {isCreator && (
        <View style={[styles.devBadge, large && styles.devBadgeLg]}>
          <Text style={[styles.devTxt, large && { fontSize: 10.5 }]}>&lt;/&gt;</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  femaleBadge: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#ec4899',
    alignItems: 'center',
    justifyContent: 'center',
  },
  femaleBadgeLg: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  femaleTxt: {
    color: '#fff',
    fontSize: 9.5,
    fontWeight: '900',
    lineHeight: 13,
  },
  verBadge: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verBadgeLg: {
    width: 19,
    height: 19,
    borderRadius: 10,
  },
  verTxt: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
  },
  devBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.28)',
    borderWidth: 1,
    borderColor: '#8b5cf6',
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  devBadgeLg: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  devTxt: {
    color: '#c4b5fd',
    fontSize: 9,
    fontWeight: '800',
  },
});
