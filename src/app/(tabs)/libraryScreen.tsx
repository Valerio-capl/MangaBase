import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, Image, Dimensions } from 'react-native';
import React, {useCallback, useState} from 'react';
import {useFocusEffect, useRouter} from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
        setLibrary(parsedData.reverse()); 
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

  const renderMangaCard = ({ item }: { item: SavedManga }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => handleMangaPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        {item.coverUrl ? (
          <Image 
            source={{ uri: item.coverUrl }} 
            style={styles.coverImage} 
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.coverImage, { backgroundColor: '#333' }]} />
        )}
      </View>
      
      <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
        {item.title}
      </Text>
    </TouchableOpacity>
  );

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

        renderItem={renderMangaCard}

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
  card: {
    width: '44%',
    marginBottom: 15,
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#2A2F45',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#2A2F45'
  },
  coverImage: {
    width:'100%',
    height:'100%',
  },
  title: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
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