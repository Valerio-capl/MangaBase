import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, Image, ActivityIndicator, 
  TouchableOpacity, FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SourceManager from '@/src/api/sourceManager';
import { icons } from '@/constants/icons';

interface Chapter {
  id: string;
  number: string;
  title: string;
  url: string;
  date?: string;
}

interface MangaDetailsData {
  id: string;
  slug: string;
  title: string;
  author: string;
  year: string; 
  status: string;
  coverUrl: string;
  description: string;
  chapters: Chapter[];
}

export default function MangaDetails() {
  const router = useRouter();
  const { id, slug, source } = useLocalSearchParams();
  const [manga, setManga] = useState<MangaDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(10); //limit for chapter load then readmore
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id || !slug) return;
      setLoading(true);
      try {
        
        const data = await SourceManager.getMangaDetails(source.toString() ,id.toString(), slug.toString());
        setManga(data);
      } catch (error) {
        console.error("Errore dettagli:", error);
      } finally {
        setLoading(false);
      }
    }; fetchDetails();
  }, [id, slug]);

  useEffect(() => {
    const checkStatus = async () => {
      if (!id) return;
      try {
        const storedLibrary = await AsyncStorage.getItem('myLibrary');
        if (storedLibrary) {
          const library = JSON.parse(storedLibrary);
          // Controlla se l'ID esiste già nell'array
          const exists = library.some((item: any) => item.id === id);
          setIsSaved(exists);
        }
      } catch (error) {
        console.error(error);
      }
    };
    checkStatus();
  }, [id]);

  const handleChapterPress = (chapter: Chapter) => {
    router.push({
      pathname: "../readerScreen/readerScreen",
      params: { 
        mangaId: id, 
        slug: slug, 
        chapterId: chapter.id,
        source:source
      }
    });
  };

  const handleSavePress = async(mangaData: MangaDetailsData)=>{
    try{
      const existingLibrary = await AsyncStorage.getItem('myLibrary');
      let library = existingLibrary ? JSON.parse(existingLibrary) : [];

      if (isSaved) {
        library = library.filter((item: any) => item.id !== mangaData.id);
        setIsSaved(false);
      }else{
        const mangaSave = {
          id: mangaData.id,
          slug: mangaData.slug,
          title: mangaData.title,
          coverUrl: mangaData.coverUrl,
          source: source
        };
        library.push(mangaSave);
        setIsSaved(true);
      }
      await AsyncStorage.setItem('myLibrary', JSON.stringify(library));

    } catch (error) {
      console.error("Errore nel salvataggio:", error);}
  };

  const showAllChapters = () => {
    if (manga) {
      setLimit(manga.chapters.length);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#A8B5DB" />
        <Text style={{color: '#A8B5DB', marginTop: 10}}>Loading Details...</Text>
      </View>
    );
  }

  if (!manga) {
    return (
      <View style={styles.center}>
        <Text style={{ color: 'white' }}>Data not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{marginTop: 20}}>
          <Text style={{color: '#A8B5DB'}}>go back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const displayedChapters = manga.chapters.slice(0, limit);
  const hasMoreChapters = limit < manga.chapters.length;


  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Indietro</Text>
        </TouchableOpacity>
      </View>
    
      <FlatList
        data={displayedChapters}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={() => (
          //header
          <View style={styles.headerContainer}>
            <View style={styles.topSection}>
              

              <Image 
                source={{ uri: manga.coverUrl }} 
                style={styles.coverImage} 
                resizeMode="cover" 
              />
              <View style={styles.infoSection}>
                <View style={styles.titleRow}>
                  <Text style={styles.title} numberOfLines={3}>{manga.title}</Text>

                  <TouchableOpacity onPress={() => handleSavePress(manga)}>
                    <Image
                      source={isSaved ? icons.saveFilled : icons.save}
                      style={styles.saveIcon}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.metaText}>
                  <Text style={styles.label}>Author: </Text>{manga.author}</Text>
                <Text style={styles.metaText}>
                  <Text style={styles.label}>Year: </Text>{manga.year}</Text>
                <Text style={styles.metaText}>
                  <Text style={styles.label}>Status: </Text>{manga.status}</Text>
              </View>
            </View>

            {manga.description ? (
              <View style={styles.descSection}>
                <Text style={styles.sectionTitle}>Trama</Text>
                <Text style={styles.description} numberOfLines={isDescExpanded ? undefined : 4}>{manga.description}</Text>
                {manga.description.length > 100 && (
                  <TouchableOpacity 
                    onPress={() => setIsDescExpanded(!isDescExpanded)}
                    style={{ marginTop: 8 }}
                  >
                    <Text style={{ color: '#A8B5DB', fontWeight: 'bold', fontSize: 13 }}>
                      {isDescExpanded ? 'Show less' : 'Show more...'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}

            <View style={styles.chaptersHeader}>
              <Text style={styles.sectionTitle}>Chapters ({manga.chapters.length})</Text>
            </View>
          </View>
        )}

        // --- ITEM: Singolo Capitolo ---
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.chapterItem} 
            onPress={() => handleChapterPress(item)}
            activeOpacity={0.7}
          >
            <View>
              <Text style={styles.chapterNumber}>chapter {item.number}</Text>
              {/* Mostra il titolo del capitolo solo se diverso da "Capitolo X" */}
              {item.title && !item.title.toLowerCase().includes(`capitolo ${item.number}`) && (
                 <Text style={styles.chapterTitle}>{item.title}</Text>
              )}
            </View>
            {item.date && <Text style={styles.chapterDate}>{item.date}</Text>}
          </TouchableOpacity>
        )}

        // --- FOOTER ---
        ListFooterComponent={() => (
          <View style={styles.footer}>
            {hasMoreChapters && (
              <TouchableOpacity style={styles.loadMoreButton} onPress={showAllChapters}>
                <Text style={styles.loadMoreText}>
                  Show more {manga.chapters.length - limit} chapters ↓
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F243D',
  },
  center: {
    flex: 1,
    backgroundColor: '#1F243D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBar: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#1F243D',
    zIndex: 10,
  },
  backButton: {
    paddingVertical: 8,
  },
  backText: {
    color: '#A8B5DB',
    fontSize: 16,
    fontWeight: '600',
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  topSection: {
    flexDirection: 'row',
    marginBottom: 25,
  },
  coverImage: {
    width: 130, // Larghezza fissa
    height: 190, // Altezza fissa (ratio ~1.45)
    borderRadius: 8,
    backgroundColor: '#2A2F45',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  titleRow:{
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom:12,
    alignItems: 'flex-start',
  },
  infoSection: {
    flex: 1,
    marginLeft: 20,
    justifyContent: 'flex-start', // Allinea in alto
  },
  saveIcon: {
    width: 24,
    height: 24,
    tintColor: '#A8B5DB',
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  metaText: {
    color: '#A8B5DB',
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 18,
  },
  label: {
    fontWeight: 'bold',
    color: '#fff',
  },
  descSection: {
    marginBottom: 25,
    backgroundColor: 'rgba(255,255,255,0.05)', // Sfondo leggero per la trama
    padding: 15,
    borderRadius: 12,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
  },
  chaptersHeader: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 10,
  },
  chapterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  chapterNumber: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  chapterTitle: {
    color: '#6e7a9e',
    fontSize: 12,
    marginTop: 2,
  },
  chapterDate: {
    color: '#555',
    fontSize: 12,
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
    marginBottom: 40,
  },
  loadMoreButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  loadMoreText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  }
});
