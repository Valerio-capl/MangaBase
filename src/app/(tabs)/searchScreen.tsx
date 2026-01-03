
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import SearchBar from "@/src/components/searchBar";
import MangaCard from '@/src/components/mangaCard';
import SourceManager from '@/src/api/sourceManager';

const { width } = Dimensions.get('window');
const cardWidth = (width - 30) / 2;

interface SourceSection {
  sourceName: string;
  data: MangaResult[];
}
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
  const [sections, setSections] = useState<SourceSection[]>([]);
  const [loading, setLoading] = useState(false);

  const performSearch = async (textToSearch:string) => {
    if (!textToSearch || textToSearch.trim() === '') return;
    setLoading(true);
    setSections([]);
    console.log("Cercando:", textToSearch);
  
    try {
      await SourceManager.searchAll(textToSearch, (newBatch: MangaResult[]) => {
        if (newBatch.length === 0) return;
        const sourceName = newBatch[0].source;
        const newSection: SourceSection = {
          sourceName: sourceName,
          data: newBatch
        };
        setSections((prev)=>[...prev, newSection]);
      });
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
      params: { id: manga.id, slug: manga.slug, source: manga.source}
    });
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

    {loading && sections.length === 0 ? (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff"/>
      </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item) => item.sourceName}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          renderItem={({ item }) => (
            <View style={styles.sectionContainer}>
              {/* HEADER DEL SORGENTE */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{item.sourceName}</Text>
                <View style={styles.divider} />
                <Text style={styles.resultCount}>{item.data.length}</Text>
              </View>

              {/* GRIGLIA DEI MANGA */}
              <View style={styles.gridContainer}>
                {item.data.map((manga) => <MangaCard
                    key={`${manga.source}-${manga.id}`}
                    item={manga}
                    onPress={()=>handleMangaPress(manga)}
                  />)}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No results found.</Text>
          }
          ListFooterComponent={
            loading ? <ActivityIndicator size="small" color="#0000ff" style={{marginTop: 10}}/> : null
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
  sectionContainer: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 8,
  },
  sectionTitle: {
    color: '#A8B5DB',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    gap:10,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#ffffff1a',
  },
  resultCount: {
    color: '#555',
    fontSize: 12,
    marginLeft: 10,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
  },
});