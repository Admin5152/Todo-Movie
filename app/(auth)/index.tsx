import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../lib/AuthContext';

export default function AuthLanding() {
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { signIn, signUp, error, clearError } = useAuth();

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return false;
    }
    
    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return false;
    }
    
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return false;
    }
    
    if (!isSignIn && !name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return false;
    }
    
    return true;
  };

  const onContinue = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    clearError();
    
    try {
      if (isSignIn) {
        await signIn(email, password);
      } else {
        await signUp(email, password, name);
      }
      
      // Navigate to tabs on successful authentication
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Authentication error:', error);
      Alert.alert(
        'Authentication Failed', 
        error.message || 'An error occurred during authentication'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignIn(!isSignIn);
    clearError();
    // Clear form when switching modes
    setEmail("");
    setPassword("");
    setName("");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>Todo</Text>
        <Text style={styles.subtitle}>Stream smarter. Discover more.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>{isSignIn ? 'Sign in' : 'Create account'}</Text>
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        {!isSignIn && (
          <TextInput
            placeholder="Full Name"
            placeholderTextColor="#888"
            style={styles.input}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            editable={!isLoading}
          />
        )}
        
        <TextInput
          placeholder="Email"
          placeholderTextColor="#888"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          editable={!isLoading}
        />
        
        <TextInput
          placeholder="Password"
          placeholderTextColor="#888"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={isSignIn ? "password" : "new-password"}
          editable={!isLoading}
        />
        
        <TouchableOpacity 
          onPress={onContinue} 
          style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#111" size="small" />
          ) : (
            <Text style={styles.primaryText}>
              {isSignIn ? 'Sign in' : 'Sign up'}
            </Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={toggleMode} 
          style={styles.linkBtn}
          disabled={isLoading}
        >
          <Text style={[styles.linkText, isLoading && styles.linkTextDisabled]}>
            {isSignIn ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0b0b0f', 
    padding: 24, 
    justifyContent: 'center' 
  },
  header: { 
    alignItems: 'center', 
    marginBottom: 32 
  },
  logo: { 
    color: '#FFD700', 
    fontSize: 36, 
    fontWeight: '800', 
    letterSpacing: 1 
  },
  subtitle: { 
    color: '#9aa0a6', 
    marginTop: 8 
  },
  card: { 
    backgroundColor: '#121218', 
    borderRadius: 16, 
    padding: 20, 
    borderWidth: 1, 
    borderColor: '#1f1f2a' 
  },
  title: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: '700', 
    marginBottom: 12 
  },
  errorContainer: {
    backgroundColor: '#ff4444',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  input: { 
    backgroundColor: '#1a1a24', 
    color: '#fff', 
    borderRadius: 12, 
    paddingHorizontal: 14, 
    paddingVertical: 12, 
    marginTop: 10, 
    borderWidth: 1, 
    borderColor: '#2a2a3a' 
  },
  primaryBtn: { 
    backgroundColor: '#FFD700', 
    paddingVertical: 14, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginTop: 16 
  },
  primaryBtnDisabled: {
    backgroundColor: '#666',
  },
  primaryText: { 
    color: '#111', 
    fontWeight: '800' 
  },
  linkBtn: { 
    marginTop: 12, 
    alignItems: 'center' 
  },
  linkText: { 
    color: '#9aa0a6' 
  },
  linkTextDisabled: {
    color: '#555',
  }
});
