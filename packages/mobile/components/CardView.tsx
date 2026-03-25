import { TouchableOpacity, Text, StyleSheet, Animated } from "react-native";
import { useRef } from "react";
import type { Card } from "@conquer-card/engine";

const SUIT_SYMBOLS: Record<string, string> = {
  coins: "🪙",
  cups: "🏆",
  swords: "⚔️",
  clubs: "🌿",
};

interface CardViewProps {
  card: Card;
  onPress?: () => void;
  disabled?: boolean;
  selected?: boolean;
}

export function CardView({ card, onPress, disabled, selected }: CardViewProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 1.08, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[styles.card, selected && styles.selected, disabled && styles.disabled]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text style={styles.rank}>{card.rank}</Text>
        <Text style={styles.suit}>{SUIT_SYMBOLS[card.suit] ?? card.suit}</Text>
        <Text style={[styles.rank, styles.bottomRank]}>{card.rank}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { width:72, height:108, backgroundColor:"#fff", borderRadius:10, padding:6, alignItems:"center", justifyContent:"space-between", margin:4, shadowColor:"#000", shadowOffset:{width:0,height:2}, shadowOpacity:0.3, shadowRadius:4, elevation:4 },
  selected: { borderColor:"#e94560", borderWidth:3, backgroundColor:"#fff5f5" },
  disabled: { opacity:0.5 },
  rank: { fontSize:20, fontWeight:"bold", color:"#1a1a2e", alignSelf:"flex-start" },
  suit: { fontSize:28 },
  bottomRank: { alignSelf:"flex-end", transform:[{rotate:"180deg"}] },
});