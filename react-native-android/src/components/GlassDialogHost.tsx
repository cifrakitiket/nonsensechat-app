import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useApp } from '../context/AppContext';
import { GlassCard } from './GlassCard';

export const GlassDialogHost: React.FC = () => {
  const { appTheme, toastState, dialogState, dismissDialog } = useApp();
  const insets = useSafeAreaInsets();
  const toastAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toastState) {
      toastAnim.setValue(0);
      Animated.spring(toastAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 6,
      }).start();
    }
  }, [toastState?.id]);

  const toastColor =
    toastState?.type === 'error'
      ? '#ef4444'
      : toastState?.type === 'success'
      ? '#22c55e'
      : appTheme.accent;

  const toastIcon =
    toastState?.type === 'error'
      ? 'alert-circle'
      : toastState?.type === 'success'
      ? 'checkmark-circle'
      : 'sparkles';

  return (
    <>
      {toastState ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.toastWrap,
            {
              top: insets.top + 10,
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-18, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <GlassCard
            radius={22}
            strong
            style={[styles.toastCard, styles.toastInner, { borderColor: toastColor + '66' }]}
          >
            <View style={[styles.toastIconWrap, { backgroundColor: toastColor + '22' }]}>
              <Ionicons name={toastIcon} size={18} color={toastColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toastTitle, { color: appTheme.text }]} numberOfLines={2}>
                {toastState.title}
              </Text>
              {!!toastState.body && (
                <Text style={[styles.toastBody, { color: appTheme.textSub }]} numberOfLines={3}>
                  {toastState.body}
                </Text>
              )}
            </View>
          </GlassCard>
        </Animated.View>
      ) : null}

      <Modal
        visible={!!dialogState}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={dismissDialog}
      >
        <TouchableWithoutFeedback onPress={dismissDialog}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.dialogOuter}>
                <GlassCard radius={28} strong style={[styles.dialogCard, styles.dialogInner]}>
                  <Text style={[styles.dialogTitle, { color: appTheme.text }]}>
                    {dialogState?.title}
                  </Text>
                  {!!dialogState?.message && (
                    <Text style={[styles.dialogMessage, { color: appTheme.textSub }]}>
                      {dialogState.message}
                    </Text>
                  )}

                  <View
                    style={[
                      styles.btnRow,
                      (dialogState?.buttons?.length || 0) > 2 && styles.btnColumn,
                    ]}
                  >
                    {(dialogState?.buttons || []).map((btn, idx) => {
                      const isDestructive = btn.style === 'destructive';
                      const isCancel = btn.style === 'cancel';
                      const bg = isDestructive
                        ? 'rgba(239, 68, 68, 0.16)'
                        : isCancel
                        ? 'rgba(255,255,255,0.08)'
                        : appTheme.accent;
                      const border = isDestructive
                        ? 'rgba(239, 68, 68, 0.35)'
                        : isCancel
                        ? appTheme.border
                        : appTheme.accentSoft;
                      const txtColor = isDestructive
                        ? '#ef4444'
                        : isCancel
                        ? appTheme.textSub
                        : '#FFFFFF';

                      return (
                        <TouchableOpacity
                          key={`${btn.text}_${idx}`}
                          activeOpacity={0.82}
                          onPress={() => {
                            dismissDialog();
                            btn.onPress?.();
                          }}
                          style={[
                            styles.dialogBtn,
                            (dialogState?.buttons?.length || 0) <= 2 && { flex: 1 },
                            { backgroundColor: bg, borderColor: border },
                          ]}
                        >
                          <Text style={[styles.dialogBtnText, { color: txtColor }]}>
                            {btn.text}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </GlassCard>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  toastWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toastCard: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 14,
  },
  toastInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toastIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  toastBody: {
    fontSize: 12,
    marginTop: 2,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 7, 14, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogOuter: {
    width: '100%',
    maxWidth: 340,
  },
  dialogCard: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 18,
  },
  dialogInner: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  dialogMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  btnColumn: {
    flexDirection: 'column',
  },
  dialogBtn: {
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  dialogBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
