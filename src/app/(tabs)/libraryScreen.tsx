import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, Image, Dimensions } from 'react-native';
import React, {useCallback, useState} from 'react';
import {useFocusEffect, useRouter} from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MangaCard from '@/src/components/mangaCard';

interface SavedManga {
  id: string;
  slug: string;
  title: string;
  coverUrl: string;
  source: string;
}
const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 40 - 15) / 2; 
const IMAGE_WIDTH = COLUMN_WIDTH * 0.8;


const libraryScreen = () => {
  const router=useRouter()
  const [loading, setLoading] = useState(true);
  const [library, setLibrary] = useState<SavedManga[]>([]);

  const loadLibrary = async () => {
    try {
      setLoading(true);
      const storedData = await AsyncStorage.getItem('myLibrary');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        parsedData.sort((a: any, b: any) => {
          const dateA = a.lastRead || 0;
          const dateB = b.lastRead || 0;
          return dateB - dateA;
        });
        setLibrary(parsedData); 
      }
    } catch (error) {
      console.error("Errore caricamento libreria:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleMangaPress = (manga: SavedManga) => {
    router.push({
      pathname: "../mangaDetails/detailScreen",
      params: { id: manga.id, slug: manga.slug, source: manga.source}
    });
  };
  useFocusEffect(
    useCallback(() => {
      loadLibrary();
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#A8B5DB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Library</Text>
      </View>

      <FlatList
        data={library}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{justifyContent: 'space-evenly', gap: 10}} 
        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 20 }}
        
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No manga saved.</Text>
          </View>
        }

        renderItem={({ item }) => (
          <MangaCard 
            item={item} 
            onPress={() => handleMangaPress(item)} 
          />
        )}

        />
    </View>
  );
}

export default libraryScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181c2eff',
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#181c2eff',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
})