import React, { useCallback, useEffect, useState } from 'react';
import { 
  View, Text, Image, ActivityIndicator, 
  TouchableOpacity, FlatList, Alert, Modal
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SourceManager from '@/src/api/sourceManager';
import ErrorView from '@/src/errors/ErrorView';
import { getErrorMessage, ErrorInfo } from '@/src/errors/errorHelper';
import { DownloadManager } from '@/src/api/downloadManager';
import { icons } from '@/constants/icons';
import styles from "./styleScreen"

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

  const [limit, setLimit] = useState(10); // limit for chapter load then readmore
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [readChapters, setReadChapters] = useState<string[]>([]);
  const [error, setError] = useState<ErrorInfo | null>(null);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState("");
  const [downloadedChapters, setDownloadedChapters] = useState<string[]>([]);
  const [actionType, setActionType] = useState<'download' | 'delete'>('download'); 

  const fetchDetails = async () => {
      if (!id || !slug) return;
      setLoading(true);
      setError(null);
      try {
        
        const data = await SourceManager.getMangaDetails(source.toString() ,id.toString(), slug.toString());
        setManga(data);
      } catch (err) {
        console.error("Errore dettagli:", err);
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
     fetchDetails();
  }, [id, slug]);

  useEffect(() => {
    const checkStatus = async () => {
      if (!id) return;
      try {
        const storedLibrary = await AsyncStorage.getItem('myLibrary');
        if (storedLibrary) {
          const library = JSON.parse(storedLibrary);
          // controlla se l'ID esiste già nell'array
          const exists = library.some((item: any) => item.id === id);
          setIsSaved(exists);
        }
      } catch (err) {
        console.error(err);
        setError(getErrorMessage(err));
      }
    };
    checkStatus();
  }, [id]);
  useFocusEffect(
    useCallback(() => {
    refreshDownloads();
    const loadReadProgress = async () => {
      if (!id) return;
      try {
        const progressStr = await AsyncStorage.getItem('read_chapters');
        if (progressStr) {
          const progress = JSON.parse(progressStr);
          if (progress[id.toString()]) {
            setReadChapters(progress[id.toString()]);
          }
        }
      } catch (e) { console.error(e); }
    };
    loadReadProgress();
  }, [id])
  );

  
  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectionMode(false);
      setSelectedChapters([]);
    } else {
      setSelectionMode(true);
    }
  };
  const activateDownloadMode = () => {
    setActionType('download');
    setSelectionMode(true);
    setSelectedChapters([]);
  };
  const activateDeleteMode = () => {
    setActionType('delete');
    setSelectionMode(true);
    setSelectedChapters([]);
  };

  const handleChapterPress = (chapter: Chapter) => {
    if (!manga) return;
    if(selectionMode){
      if (actionType === 'delete') {
         const isDownloaded = downloadedChapters.includes(chapter.id);
         if (!isDownloaded) {
             return;
         }
      }
      if(selectedChapters.includes(chapter.id)){
        setSelectedChapters(selectedChapters.filter(id => id !== chapter.id));
      } else {
        setSelectedChapters([...selectedChapters, chapter.id]);
      }
    } else {
      const chapterListString = manga.chapters.map(c => c.id).join(',');
      const isDownloaded = downloadedChapters.includes(chapter.id);
      router.push({
        pathname: "../readerScreen/readerScreen",
        params: { 
          mangaId: id, 
          slug: slug, 
          chapterId: chapter.id,
          source: isDownloaded ? 'local' : source,
          chapterList: chapterListString
        }
      });
    }
  };

  const handleDelete = async () => {
    if (selectedChapters.length === 0) return;
    
    Alert.alert(
      "Elimina Download",
      `Vuoi eliminare ${selectedChapters.length} capitoli dal dispositivo?`,
      [
        { text: "Annulla", style: "cancel" },
        { 
          text: "Elimina", 
          style: "destructive",
          onPress: async () => {
             await DownloadManager.deleteChapters(id.toString(), selectedChapters);
             await refreshDownloads(); 
             
             setSelectionMode(false);
             setSelectedChapters([]);
             setDownloadStatus("Deleting Chapters");
             setTimeout(() => setDownloadStatus(""), 1000);
          }
        }
      ]
    );
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

  const startDownload = async () => {
    if (selectedChapters.length === 0 || !manga) return;

    const chaptersToDownload = manga.chapters.filter(ch => selectedChapters.includes(ch.id));
    setIsDownloading(true);
    setSelectionMode(false);
    setDownloadStatus("Downloading...");
    const mangaForDownload = {
        ...manga,
        source: source
    };

    DownloadManager.downloadChapters(mangaForDownload, chaptersToDownload, (msg: string) => {
        setDownloadStatus(msg);
    }).then(async () => {
        setIsDownloading(false);
        setDownloadStatus("Download Completed!");
        setSelectedChapters([]);
        await refreshDownloads();
        setTimeout(() => setDownloadStatus(""), 3000);
    });
  };

  const refreshDownloads = async () => {
      if (!id) return;
      const ids = await DownloadManager.getDownloadedChapterIds(id.toString());
      setDownloadedChapters(ids);
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

  if (error) {
    return <ErrorView message={error.message} action={error.action} onRetry={fetchDetails} />;
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
  const displayedChapters =(() =>{
    if (selectionMode && actionType === 'delete') {
      return manga.chapters.filter(ch => downloadedChapters.includes(ch.id));
    }
    if (selectionMode) {
      return manga.chapters;
    } 
    return manga.chapters.slice(0, limit);
  }) ();
  const hasMoreChapters = limit < manga.chapters.length;


  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        {!selectionMode ? (
           <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
             <Text style={styles.backText}>Go Back</Text>
           </TouchableOpacity>
        ) : (
           <TouchableOpacity onPress={toggleSelectionMode} style={styles.backButton}>
             <Text style={[styles.backText, { color: '#FF6B6B' }]}>Cancel</Text>
           </TouchableOpacity>
        )}
        
        {/* Titolo centrato in modalità selezione */}
        {selectionMode && (
            <Text style={styles.selectionTitle} numberOfLines={1}>
                {manga?.title}
            </Text>
        )}
      </View>
      <Modal
        transparent={true}
        visible={isDownloading || downloadStatus !== ""}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.downloadModal}>
            <ActivityIndicator size="large" color="#A8B5DB" style={{ marginBottom: 15 }} />
            <Text style={styles.downloadModalTitle}>{downloadStatus}</Text>
            <View style={styles.warningBox}>
              <Text style={styles.downloadModalWarning}>Warning: Do not close this screen or go back, as this may interrupt the download!</Text>
            </View>
          </View>
        </View>
      </Modal>
    
      <FlatList
        data={displayedChapters}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={() => (
          <View>
            {!selectionMode && (
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
            </View>
          )}
          <View style={[styles.chaptersHeader, selectionMode && styles.chaptersHeaderSelected]}>
              <Text style={styles.sectionTitle}>
                  {selectionMode ? `Selezionati: ${selectedChapters.length}` : `Chapters (${manga.chapters.length})`}
              </Text>

              {/* Tasto Download e Elimina Icona (solo se non in selezione) */}
              {!selectionMode && (
                  <View style={{flexDirection: 'row', gap: 15, alignItems: 'center'}}>
                      <TouchableOpacity onPress={activateDeleteMode}>
                          <Image 
                            source={icons.trashcan} 
                            style={{ width: 24, height: 24 }} 
                            resizeMode="contain" 
                            tintColor="#FF6B6B"
                          />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={activateDownloadMode}>
                          <Image 
                            source={icons.download} 
                            style={styles.downloadIcon} 
                            resizeMode="contain" 
                            tintColor="#A8B5DB"
                          />
                      </TouchableOpacity>
                  </View>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          selectionMode && actionType === 'delete' ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: '#888', fontStyle: 'italic' }}>
                No chapters to delete.
              </Text>
            </View>
          ) : null
        )}
        // item:singolo cap
        renderItem={({ item }) => {
          const isSelected = selectedChapters.includes(item.id);
          const isRead = readChapters.includes(item.id);
          return (
            <TouchableOpacity 
              style={[
                  styles.chapterItem, 
                  selectionMode && isSelected 
                    ? { backgroundColor: 'rgba(255, 255, 255, 0.08)' }
                    : isRead 
                      ? styles.read
                      : null
              ]}
              onPress={() => handleChapterPress(item)}
              activeOpacity={0.7}
            >
              <View>
                <Text style={[styles.chapterNumber, selectionMode && isSelected && {color: '#A8B5DB'}]}>chapter {item.number}</Text>
                {/* mstra il titolo del capitolo solo se diverso da "Capitolo X" */}
                {item.title && !item.title.toLowerCase().includes(`capitolo ${item.number}`) && !item.title.toLowerCase().includes(`chapter ${item.number}`) && (
                  <Text style={styles.chapterTitle}>{item.title}</Text>
                )}
              </View>

              {selectionMode ? (
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
              ) : (
                  item.date && <Text style={styles.chapterDate}>{item.date}</Text>
              )}
            </TouchableOpacity>
        )}}

        // footer
        ListFooterComponent={() => (
          !selectionMode && hasMoreChapters ? (
            <View style={styles.footer}>
                <TouchableOpacity style={styles.loadMoreButton} onPress={showAllChapters}>
                    <Text style={styles.loadMoreText}>Show more...</Text>
                </TouchableOpacity>
            </View>
          ) : null
        )}
      />
      
      {selectionMode && selectedChapters.length > 0 && (
        <View style={styles.floatingContainer}>
            {actionType === 'download' ? (
                <TouchableOpacity style={styles.downloadFab} onPress={startDownload}>
                    <Text style={styles.downloadFabText}>
                        Scarica {selectedChapters.length} Capitoli
                    </Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity 
                    style={[styles.downloadFab, { backgroundColor: '#FF6B6B' }]} 
                    onPress={handleDelete}
                >
                    <Text style={[styles.downloadFabText, { color: 'white' }]}>
                        Elimina {selectedChapters.length} Capitoli
                    </Text>
                </TouchableOpacity>
            )}
        </View>
      )}
    </View>
  );
};

