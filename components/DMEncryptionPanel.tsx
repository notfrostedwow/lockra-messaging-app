import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { encryption } from '@/lib/e2ee/runtime';
import { keyStorageDescription } from '@/lib/e2ee/storage';
import type { DMEncryption } from '@/lib/e2ee/service';
import { isDemo } from '@/lib/runtime';

type State = Awaited<ReturnType<DMEncryption['inspect']>>;
export function DMEncryptionPanel({ actorId, peerId }: { actorId: string; peerId: string }) {
  const { colors } = useTheme();
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState(''); const [open, setOpen] = useState(false);
  const refresh = async () => {
    try { setState(await (await encryption()).inspect(peerId)); setError(''); }
    catch (e) { setState(null); setError(e instanceof Error ? e.message : 'Encryption unavailable.'); }
  };
  useEffect(() => {
    let cancelled = false;
    encryption().then(service => service.inspect(peerId)).then(value => { if (!cancelled) { setState(value); setError(''); } }).catch(() => { if (!cancelled) { setState(null); setError('Encryption key unavailable. Open key controls.'); } });
    return () => { cancelled = true; };
  }, [actorId, peerId]);
  const action = async (fn: () => Promise<void>) => { try { await fn(); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : 'Key action failed.'); } };
  const button = (label: string, fn: () => void) => <TouchableOpacity accessibilityRole="button" onPress={fn} style={{ padding: 10 }}><Text style={{ color: colors.primary }}>{label}</Text></TouchableOpacity>;
  return <View style={{ backgroundColor: colors.card, paddingHorizontal: 12, borderBottomColor: colors.border, borderBottomWidth: 1 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
      <Text style={{ flex: 1, color: state?.verified ? colors.textSecondary : colors.text, fontSize: 12 }}>{state?.verified ? 'DM encryption ready | text only' : 'DM encryption | verify keys before sending'}</Text>
      {button('Verify keys', () => { void refresh(); setOpen(true); })}
    </View>
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.error, paddingBottom: 6 }}>{error}</Text>}
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#000B' }}>
        <ScrollView style={{ maxHeight: '85%', backgroundColor: colors.card, borderRadius: 12 }} contentContainerStyle={{ padding: 20 }}>
          <Text style={{ color: colors.text, fontSize: 20, marginBottom: 12 }}>Verify DM identity keys</Text>
          <Text style={{ color: colors.textSecondary }}>{isDemo ? 'Synthetic demo: both identities live in this browser. This is not two-device security verification. ' : 'Compare BOTH full fingerprints over an independent trusted channel. The server directory alone cannot prove identity. '}{keyStorageDescription}</Text>
          {state && <>
            <Text selectable style={{ color: colors.text, marginTop: 16 }}>Your fingerprint: {state.own.keyId}</Text>
            <Text selectable style={{ color: colors.text, marginTop: 16 }}>Contact fingerprint: {state.peer.keyId}</Text>
            {button(isDemo ? 'Confirm synthetic key comparison' : 'I compared both fingerprints independently', () => void action(async () => {
              await (await encryption()).verify(peerId, state.own.keyId, state.peer.keyId); setOpen(false);
            }))}
          </>}
          <Text style={{ color: colors.textSecondary, marginTop: 16 }}>Rotation changes your identity key and requires comparison again. Old native keys are retained on this device; lost web keys and old messages cannot be recovered. No multi-device recovery or forward secrecy. Attachments and communities are outside DM text encryption.</Text>
          {button('Rotate my device key', () => void action(async () => { await (await encryption()).own(actorId, true); }))}
          {!!error && <Text accessibilityRole="alert" style={{ color: colors.error }}>{error}</Text>}
          {button('Close key controls', () => setOpen(false))}
        </ScrollView>
      </View>
    </Modal>
  </View>;
}
