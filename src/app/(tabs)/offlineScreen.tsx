import MangaCard from '@/src/components/mangaCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


interface LocalManga {
  id: string;
  title: string;
  coverUrl: string;
  source: string;
  originalSource: string;
  chapters: LocalChapter[];
}
interface LocalChapter {
  id: string;
  number: string;
  title: string;
  date: string;
  pages: any[];
}

const OfflineScreen = () => {
  const router = useRouter ();
  const [DownloadedList, setDownloadedList] = useState<LocalManga[]>([]);
  const [loading, setLoading] = useState(true);
  const [readProgress, setReadProgress] = useState<Record<string, string[]>>({});
  
  const loadDownloads = async () => {
    try {
      const json = await AsyncStorage.getItem('downloaded_manga');
      setDownloadedList(json ? JSON.parse(json) : []);
      const progressJson = await AsyncStorage.getItem('read_chapters');
      setReadProgress(progressJson ? JSON.parse(progressJson) : {});
    } catch (e) {
      console.error("Errore:", e);
    } finally {
      setLoading(false);
    }
  };
  const handleChapterPress = (manga: LocalManga, chapter: LocalChapter) => {
    const chapterListString = manga.chapters.map(c => c.id).join(',');
    router.push({
      pathname: "../readerScreen/readerScreen",
      params: { 
        mangaId: manga.id,
        slug: manga.title,
        chapterId: chapter.id,
        source:'local',
        chapterList: chapterListString
      }
    });
  };
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return dateString.split('T')[0];
  };

  useFocusEffect(
    useCallback(() => {
      loadDownloads();
    }, []
    )
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Offline</Text>
      </View>

      <FlatList
        data={DownloadedList}
        keyExtractor={(item) => item.id}
        numColumns={1}

        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No manga saved.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemContainer}>
            <MangaCard 
              item={item} 
              onPress={() => " "} 
              containerStyle={styles.smallCard}
              hideTitle={true}
            />
            <View style={styles.infoContainer}>

              <View style={styles.titleRow}>
                 <Text style={styles.mangaTitle} numberOfLines={2}>{item.title}</Text>
                 {item.originalSource && (
                    <Text style={styles.originalSource}>{item.originalSource}</Text>
                 )}
              </View>
              <View style={styles.divider} />

              <View style={styles.chaptersContainer}>
                {(() => {
                  const readList = readProgress[item.id] || [];
                  const unreadChapters = item.chapters.filter(ch => !readList.includes(ch.id));
                  const readChapters = item.chapters.filter(ch => readList.includes(ch.id));
                  const sortDesc = (a:LocalChapter, b:LocalChapter) => {
                    const numA = parseFloat(a.number) || 0;
                    const numB = parseFloat(b.number) || 0;
                    return numB - numA;
                  };
                  unreadChapters.sort(sortDesc);
                  readChapters.sort(sortDesc);
                  const chaptersToShow = [...unreadChapters, ...readChapters];

                  return (
                    <ScrollView 
                      nestedScrollEnabled={true}
                      style={{ maxHeight: 120 }}
                    >
                    {chaptersToShow.map((chapter) => {
                    const isRead = readList.includes(chapter.id);
                    const showChapterTitle = chapter.title && 
                                            !chapter.title.toLowerCase().includes(`capitolo ${chapter.number}`) && 
                                            !chapter.title.toLowerCase().includes(`chapter ${chapter.number}`);
                    return(
                      <TouchableOpacity 
                        key={chapter.id}
                        onPress={() => handleChapterPress(item, chapter)}
                        style={[styles.chapterBtn, isRead && { opacity: 0.4 }]}
                      >
                        <View style={{flex: 1}}>
                            <Text style={styles.chapterNumber}>Chapter {chapter.number}</Text>
                            {showChapterTitle && (
                              <Text style={styles.chapterTitle} numberOfLines={1}>{chapter.title}</Text>
                            )}
                        </View>

                        {chapter.date && <Text style={styles.chapterDate}>{formatDate(chapter.date)}</Text>}
                      </TouchableOpacity>
                    );
                  })}
                  </ScrollView>
                  );
                })()}
              </View>

            </View>
          </View>
        )}

      />
    </View>
  )
}

export default OfflineScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181c2e',
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
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
    color: '#A8B5DB',
    fontSize: 16,
    textAlign: 'center',
  },
  itemContainer: {
    flexDirection: "row",
    marginHorizontal: 15,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  smallCard: {
    width: 98,
    height: 140,
    marginBottom: 0,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  mangaTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  originalSource: {
    color: '#FF6B6B',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 3,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 10,
  },
  chaptersContainer: {
    flex: 1,
  },
  chapterBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  chapterNumber: {
    color: '#A8B5DB',
    fontSize: 14,
    fontWeight: '600',
  },
  chapterTitle: {
    color: '#6e7a9e',
    fontSize: 11,
    marginTop: 2,
  },
  chapterDate: {
    color: '#6e7a9e',
    fontSize: 11,
    marginLeft: 10,
  },
})