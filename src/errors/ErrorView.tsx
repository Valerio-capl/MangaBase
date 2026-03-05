import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';

interface ErrorViewProps {
  message: string;
  action?: 'retry' | 'home' | 'none';
  onRetry?: () => void;
}

const ErrorView = ({ message, action = 'retry', onRetry }: ErrorViewProps) => {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <MaterialIcons name="error-outline" size={24} color="grey" />
      <Text style={styles.message}>{message}</Text>
      {action === 'retry' && onRetry && (
        <TouchableOpacity style={styles.Button} onPress={onRetry} activeOpacity={0.7}>
          <Text style={styles.Text}>try again</Text>
        </TouchableOpacity>
      )}
      {action === 'home' && (
        <TouchableOpacity style={styles.Button} onPress={() => router.replace('/')} activeOpacity={0.7}>
          <Text style={styles.Text}>Back</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default ErrorView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#181c2eff',
  },
  icon: {
    fontSize: 50,
    marginBottom: 20,
  },
  message: {
    color: '#A8B5DB',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  Button: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  Text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});