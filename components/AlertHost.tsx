import React, { useSyncExternalStore } from 'react';
import { Modal, View, Text, Pressable, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { alertQueue } from '@/lib/alertQueue';

export function AlertHost() {
  const dialog = useSyncExternalStore(alertQueue.subscribe, alertQueue.snapshot, () => null);
  const { colors } = useTheme();
  if (!dialog) return null;
  return <Modal transparent visible animationType="fade" onRequestClose={() => alertQueue.dismiss()}>
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <View accessibilityRole="alert" style={{ width: '100%', maxWidth: 420, maxHeight: '80%', borderRadius: 16, padding: 20, backgroundColor: colors.card, gap: 16 }}>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>{dialog.title}</Text>
        <ScrollView><Text style={{ color: colors.textSecondary, lineHeight: 22 }}>{dialog.message}</Text></ScrollView>
        {dialog.buttons.map((button, index) => <Pressable key={index} accessibilityRole="button"
          onPress={() => { void alertQueue.choose(dialog.id, index).catch(() => alertQueue.push('Action failed', 'The operation could not be completed.')); }}
          style={{ padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: button.style === 'destructive' ? colors.error : colors.primary }}>{button.text ?? 'OK'}</Text>
        </Pressable>)}
      </View>
    </View>
  </Modal>;
}
