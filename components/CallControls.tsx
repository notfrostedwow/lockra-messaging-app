import React, { lazy, Suspense } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Phone, Video } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCalling } from '@/contexts/CallingContext';
import { isDemo } from '@/lib/runtime';
const CallMedia = lazy(() => import('./CallMedia'));
export function CallButtons({ peerId }: { peerId: string }) {
  const { controller } = useCalling(); const { colors } = useTheme();
  return <View style={{ flexDirection: 'row' }}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Voice call" onPress={() => void controller.start(peerId, 'audio')} style={{ padding: 10 }}><Phone size={19} color={colors.primary} /></TouchableOpacity>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Video call" onPress={() => void controller.start(peerId, 'video')} style={{ padding: 10 }}><Video size={19} color={colors.primary} /></TouchableOpacity>
  </View>;
}
export function CallOverlay() {
  const { controller, state } = useCalling(); const { colors } = useTheme();
  const visible = state.phase !== 'idle'; const call = state.invite;
  const button = (label: string, action: () => void) => <TouchableOpacity accessibilityRole="button" onPress={action} style={{ paddingVertical: 12, paddingHorizontal: 6 }}><Text style={{ color: colors.primary }}>{label}</Text></TouchableOpacity>;
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={() => void controller.leave()}>
    <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#000B' }}>
      <ScrollView style={{ maxHeight: '90%', backgroundColor: colors.card, borderRadius: 12 }} contentContainerStyle={{ padding: 20 }}>
        <Text style={{ color: colors.text, fontSize: 22 }}>{isDemo ? 'Calling unavailable in offline demo' : `${call?.kind === 'video' ? 'Video' : 'Voice'} call: ${state.phase}`}</Text>
        {call && <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Invite {call.state}. {state.phase === 'active' ? 'Connected to the media server; peer participation is separate.' : 'No connected peer is implied by an invitation.'}</Text>}
        <Text style={{ color: colors.textSecondary, marginVertical: 12 }}>Microphone and camera require explicit permission. Message encryption does not encrypt calls end to end. This integration uses WebRTC transport encryption; provider/device end-to-end QA remains unperformed.</Text>
        {state.error && <Text accessibilityRole="alert" style={{ color: colors.error }}>{state.error}</Text>}
        {state.phase === 'incoming' && <>{button('Accept call', () => void controller.accept())}{button('Reject call', () => void controller.reject())}</>}
        {state.phase === 'ringing' && call?.state === 'accepted' && button('Join accepted call', () => void controller.join())}
        {state.phase === 'active' && controller.media && <Suspense fallback={<Text style={{ color: colors.text }}>Loading media renderer...</Text>}><CallMedia session={controller.media} /></Suspense>}
        {state.phase === 'active' && <>{button(state.microphone ? 'Mute microphone' : 'Unmute microphone', () => void controller.toggleMicrophone())}{call?.kind === 'video' && button(state.camera ? 'Turn camera off' : 'Turn camera on', () => void controller.toggleCamera())}</>}
        {['ringing', 'incoming', 'connecting', 'active'].includes(state.phase) && button('Leave call', () => void controller.leave())}
        {['error', 'ended'].includes(state.phase) && button('Close call panel', () => controller.dismiss())}
      </ScrollView>
    </View>
  </Modal>;
}
