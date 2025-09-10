import { router } from 'expo-router';
import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function AuthLanding() {
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onContinue = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>Todo</Text>
        <Text style={styles.subtitle}>Stream smarter. Discover more.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>{isSignIn ? 'Sign in' : 'Create account'}</Text>
        <TextInput
          placeholder="Email"
          placeholderTextColor="#888"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor="#888"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity onPress={onContinue} style={styles.primaryBtn}>
          <Text style={styles.primaryText}>{isSignIn ? 'Sign in' : 'Sign up'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsSignIn(!isSignIn)} style={styles.linkBtn}>
          <Text style={styles.linkText}>{isSignIn ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0f', padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { color: '#FFD700', fontSize: 36, fontWeight: '800', letterSpacing: 1 },
  subtitle: { color: '#9aa0a6', marginTop: 8 },
  card: { backgroundColor: '#121218', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#1f1f2a' },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  input: { backgroundColor: '#1a1a24', color: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 10, borderWidth: 1, borderColor: '#2a2a3a' },
  primaryBtn: { backgroundColor: '#FFD700', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  primaryText: { color: '#111', fontWeight: '800' },
  linkBtn: { marginTop: 12, alignItems: 'center' },
  linkText: { color: '#9aa0a6' }
});


