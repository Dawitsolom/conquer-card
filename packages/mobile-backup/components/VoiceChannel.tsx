import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useVoice } from "../hooks/useVoice";

interface VoiceChannelProps {
  roomId: string;
  userId: number;
}

export function VoiceChannel({ roomId, userId }: VoiceChannelProps) {
  const { isMuted, isInChannel, joinVoiceChannel, leaveVoiceChannel, toggleMute } = useVoice(roomId, userId);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>🎙 Voice</Text>
      {isInChannel ? (
        <View style={styles.controls}>
          <TouchableOpacity style={[styles.btn, isMuted && styles.muted]} onPress={toggleMute}>
            <Text style={styles.btnText}>{isMuted ? "🔇" : "🎤"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.leave]} onPress={leaveVoiceChannel}>
            <Text style={styles.btnText}>📴</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.btn} onPress={joinVoiceChannel}>
          <Text style={styles.btnText}>🎙 Join Voice</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection:"row", alignItems:"center", backgroundColor:"#16213e", padding:12, borderRadius:12, gap:8 },
  label: { color:"#a0a0c0", fontSize:14, flex:1 },
  controls: { flexDirection:"row", gap:8 },
  btn: { backgroundColor:"#0f3460", padding:10, borderRadius:8 },
  muted: { backgroundColor:"#e94560" },
  leave: { backgroundColor:"#333" },
  btnText: { color:"#fff", fontSize:14 },
});