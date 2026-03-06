import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from 'expo-router';
import termsData from "./termsText";
import { SafeAreaView } from 'react-native-safe-area-context';

export default function termsScreen() {
  const router = useRouter()

  const handleAccept = async () => {
    await AsyncStorage.setItem('has_accepted_terms', 'true');
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Terms of Use</Text>
        <Text style={styles.headerSubtitle}>Please read carefully before proceeding</Text>
      </View>
      
        <View style={styles.scrollContainer}> 
          {/* style view con opacita piu scura rispetto allo sfondo */}
          <ScrollView 
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.scrollContent}
          >
          {termsData.map((item, index) => (
            <View key={index} style={styles.paragraphContainer}>
              <Text style={styles.termTitle}>{item.title}</Text>
              <Text style={styles.termContent}>{item.content}</Text>
            </View>
          ))}
          </ScrollView>
          {/* tasto accetta */}
        </View>
      <View>
        <TouchableOpacity style={styles.acceptButton} onPress={handleAccept} activeOpacity={0.8}>
          <Text style={styles.acceptButtonText}>Accept and Continue</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView >
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181c2eff',
  },
  header: {
    paddingTop: 40,
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#A8B5DB',
    fontSize: 14,
    marginTop: 5,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    marginBottom: 40,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  paragraphContainer: {
    marginBottom: 25,
  },
  termTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  termContent: {
    color: '#A8B5DB',
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#A8B5DB',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#A8B5DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  acceptButtonText: {
    color: '#181c2eff',
    fontSize: 16,
    fontWeight: 'bold',
  }
})