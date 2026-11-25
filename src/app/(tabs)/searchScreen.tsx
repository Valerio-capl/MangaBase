import SourceManager from '@/src/api/sourceManager';
import MangaCard from '@/src/components/mangaCard';
import SearchBar from "@/src/components/searchBar";
import { getErrorMessage } from '@/src/errors/errorHelper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

interface MangaResult {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  source: string;
}

type SourceStatus = 'loading' | 'ok' | 'empty' | 'error';

interface SourceSection {
  sourceName: string;
  status: SourceStatus;
  data: MangaResult[];
  errorMessage: string | null;
}

interface SourceUpdate {
  source: string;
  status: SourceStatus;
  results?: MangaResult[];
  error?: unknown;
}

const SearchScreen = () => {
  const router=useRouter()
  const params = useLocalSearchParams(); 
  const initialQuery = Array.isArray(params.q) ? params.q[0] : (params.q || '');
  const [query, setQuery] = useState<string>(initialQuery);
  const [sections, setSections] = useState<SourceSection[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  // Replaces the section of that source, or appends it the first time
  const handleUpdate = (update: SourceUpdate) => {
    const section: SourceSection = {
      sourceName: update.source,
      status: update.status,
      data: update.results ?? [],
      errorMessage: update.error ? getErrorMessage(update.error).message : null,
    };
    setSections((prev) => (
      prev.some((s) => s.sourceName === section.sourceName)
        ? prev.map((s) => (s.sourceName === section.sourceName ? section : s))
        : [...prev, section]
    ));
  };

  const performSearch = async (textToSearch: string) => {
    if (!textToSearch || textToSearch.trim() === '') return;
    abortRef.current?.abort(); // the previous search can no longer write results
    const controller = new AbortController();
    abortRef.current = controller;
    setSections([]);
    await SourceManager.searchAll(textToSearch, handleUpdate, { signal: controller.signal });
  };

  // Abort the running search when leaving the screen
  useEffect(() => () => abortRef.current?.abort(), []);

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
      <FlatList
        data={sections}
        keyExtractor={(item) => item.sourceName}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{item.sourceName}</Text>
              <View style={styles.divider} />
              {item.status === 'ok' && <Text style={styles.resultCount}>{item.data.length}</Text>}
            </View>

            {item.status === 'loading' && (
              <ActivityIndicator size="small" color="#A8B5DB" style={styles.statusRow} />
            )}
            {item.status === 'empty' && <Text style={styles.emptyText}>No results found.</Text>}
            {item.status === 'error' && <Text style={styles.errorText}>{item.errorMessage}</Text>}
            {item.status === 'ok' && (
              <View style={styles.gridContainer}>
                {item.data.map((manga) => (
                  <MangaCard
                    key={`${manga.source}-${manga.id}`}
                    item={manga}
                    onPress={() => handleMangaPress(manga)}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

export default SearchScreen;

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
    marginTop: 12,
  },
  statusRow: { 
    marginVertical: 12 
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18
  },
});