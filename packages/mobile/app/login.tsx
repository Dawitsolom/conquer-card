import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';

const C = {
  bg:         '#FDF3E3',
  brown:      '#3D1C02',
  terracotta: '#C1440E',
  muted:      '#8B6245',
  inputBg:    '#FFF8F0',
  inputBorder:'#E8D5B7',
};

export default function LoginScreen() {
  const router   = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Title */}
        <View style={s.header}>
          <Text style={s.title}>CONQUER{'\n'}CARD</Text>
          <Text style={s.sub}>Sign in to play</Text>
        </View>

        {/* Inputs */}
        <View style={s.form}>
          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={C.muted}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={s.label}>Password</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={C.muted}
            secureTextEntry
          />

          {/* Sign In */}
          <TouchableOpacity
            style={s.btnPrimary}
            onPress={() => router.replace('/')}
            activeOpacity={0.85}
          >
            <Text style={s.btnPrimaryTxt}>Sign In</Text>
          </TouchableOpacity>

          {/* Create Account */}
          <TouchableOpacity
            style={s.btnOutline}
            activeOpacity={0.8}
          >
            <Text style={s.btnOutlineTxt}>Create Account</Text>
          </TouchableOpacity>

          {/* Guest */}
          <TouchableOpacity
            style={s.guestLink}
            onPress={() => router.replace('/')}
            activeOpacity={0.7}
          >
            <Text style={s.guestTxt}>Play as Guest</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: C.bg },
  kav:   { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },

  header: { alignItems: 'center', marginBottom: 40 },
  title: {
    fontSize: 36, fontWeight: '900', color: C.brown,
    letterSpacing: 3, lineHeight: 42, textAlign: 'center',
  },
  sub: { fontSize: 14, color: C.muted, marginTop: 8, fontWeight: '500' },

  form: { width: '100%' },

  label: {
    fontSize: 12, fontWeight: '700', color: C.brown,
    letterSpacing: 1, marginBottom: 6, marginTop: 16,
  },
  input: {
    backgroundColor: C.inputBg,
    borderWidth: 1.5, borderColor: C.inputBorder,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: C.brown,
  },

  btnPrimary: {
    backgroundColor: C.terracotta, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 28,
  },
  btnPrimaryTxt: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  btnOutline: {
    borderWidth: 2, borderColor: C.brown, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 12,
  },
  btnOutlineTxt: { color: C.brown, fontSize: 16, fontWeight: '700' },

  guestLink:  { alignItems: 'center', marginTop: 24, paddingVertical: 8 },
  guestTxt:   { color: C.muted, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
});
