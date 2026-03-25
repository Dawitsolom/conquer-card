// Agora.io voice - install locally: npm install react-native-agora
import { useState } from "react";

export function useVoice(channelName: string, userId: number) {
  const [isMuted, setIsMuted] = useState(false);
  const [isInChannel, setIsInChannel] = useState(false);

  const joinVoiceChannel = async () => {
    try {
      const AgoraRTC = require("react-native-agora");
      // init + join channel
      setIsInChannel(true);
    } catch { console.log("Agora not installed - run: npm install react-native-agora"); }
  };

  const leaveVoiceChannel = async () => {
    setIsInChannel(false);
  };

  const toggleMute = () => setIsMuted(m => !m);

  return { isMuted, isInChannel, joinVoiceChannel, leaveVoiceChannel, toggleMute };
}