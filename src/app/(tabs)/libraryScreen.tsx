import { getMangaKey } from '@/src/api/mangaKey';
import MangaCard from '@/src/components/mangaCard';
import { getSavedLibrary } from '@/src/api/libraryStorage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

interface SavedManga {
  id: string;
  slug: string;
  title: string;
  coverUrl: string;
  source: string;
}


const libraryScreen = () => {
  const router=useRouter()
  const [loading, setLoading] = useState(true);
  const [library, setLibrary] = useState<SavedManga[]>([]);

  const { width } = useWindowDimensions();
  const isTablet = width > 600;
  const cardWidth = isTablet ? 170 : 150;
  const numColumns = isTablet ? 4 : 2;

  const loadLibrary = async () => {
    try {
      setLoading(true);
      const saved = await getSavedLibrary();
      setLibrary(saved);
    } catch (error) {
      console.error("Library loading error:", error);
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
        // key={`grid-${numColumns}`}
        keyExtractor={(item) => getMangaKey(item)}
        numColumns={numColumns}
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
            containerStyle={{ width: cardWidth}}
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