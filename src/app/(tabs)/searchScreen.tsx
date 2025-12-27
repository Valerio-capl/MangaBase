
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import SearchBar from "@/src/components/searchBar";
import MangaWorld from '@/src/api/mangaworld/mangaworld'

const { width } = Dimensions.get('window');
const cardWidth = (width - 60) / 2;


interface MangaResult {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  source: string;
}

const searchScreen = () => {
  const router=useRouter()
  const params = useLocalSearchParams(); 
  const initialQuery = Array.isArray(params.q) ? params.q[0] : (params.q || '');
  const [query, setQuery] = useState<string>(initialQuery);
  const [results, setResults] = useState<MangaResult[]>([]);
  const [loading, setLoading] = useState(false);

  const performSearch = async (textToSearch:string) => {
    if (!textToSearch || textToSearch.trim() === '') return;
    setLoading(true);
    console.log("Cercando:", textToSearch);
  
    try {
      const data = await MangaWorld.searchManga(textToSearch);
      setResults(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleMangaPress = (manga: MangaResult) => {
    router.push({
      pathname: "../mangaDetails/detailScreen",
      params: { id: manga.id, slug: manga.slug }
    });
    console.log("Hai cliccato su:", manga.title);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SearchBar
        placeholder="search a manga"
        value={query}
        onChangeText={setQuery}
        onSubmit={() => performSearch(query)}
        />
      </View>

    {loading ? (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff"/>
      </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleMangaPress(item)}>
              <View style={styles.card}>
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
                <Text 
                  style={styles.title} 
                  numberOfLines={1} 
                  ellipsizeMode="tail"
                >
                  {item.title}
                </Text>
              </View>
            </TouchableOpacity>
            
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nessun risultato trovato.</Text>
          }
        />
      )}
    </View>
  );
}

export default searchScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181c2eff',
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: cardWidth,
    marginBottom: 20,
    alignItems: 'center',

  },
  imageContainer: {
    width: cardWidth*0.7,
    height: cardWidth, // Aspect ratio tipico dei manga (1:1.5)
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: '#2A2F45',
    marginBottom: 8,
  },
  resultItem: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    overflow: 'hidden',
    padding: 8,
  },
  coverImage: {
    width:'100%',
    height:'100%',
    backgroundColor: '#2A2F45',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  title: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center', // Testo centrato sotto l'immagine
    width: '100%',
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
  }
});