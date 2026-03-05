import React, { useCallback, useEffect, useState } from "react";
import { Text, View, StyleSheet, Image, ScrollView, FlatList, ActivityIndicator, TouchableOpacity } from "react-native";
import {images} from "@/constants/images";
import SearchBar from "@/src/components/searchBar";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import MangaCard from "@/src/components/mangaCard";
import { getTopOngoingManga, getTopPopularManga } from "@/src/api/jikan";
import { getErrorMessage, ErrorInfo } from '@/src/errors/errorHelper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';


interface MangaItem {
  id: string;
  title: string;
  coverUrl: string | null;
  slug?: string;
  source?: string;
}

export default function Index() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [topOngoing, setTopOngoing] = useState<MangaItem[]>([]);
  const [topPopular, setTopPopular] = useState<MangaItem[]>([]);
  const [library, setLibrary] = useState<MangaItem[]>([]);

  const [loadingOngoing, setLoadingOngoing] = useState(true);
  const [loadingPopular, setLoadingPopular] = useState(true);
  const [jikanError, setJikanError] = useState<ErrorInfo | null>(null);

  useEffect(() => {
    loadJikanData();
  }, []);
  useFocusEffect(
    useCallback(() => {
      loadLibrary();
    }, [])
  );

  const loadJikanData = async () => {
    try {
      setJikanError(null);
      setLoadingPopular(true);
      setLoadingOngoing(true);

      const ongoingData = await getTopOngoingManga(10);
      setTopOngoing(ongoingData);
      const popularData = await getTopPopularManga(10);
      setTopPopular(popularData);

    } catch (error) {
      console.error("Errore caricamento dati Jikan:", error);
      setJikanError(getErrorMessage(error));
    } finally {
      setLoadingOngoing(false);
      setLoadingPopular(false);
    }
  };

  const loadLibrary = async () => {
    try {
      
      const storedData = await AsyncStorage.getItem('myLibrary');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        parsedData.sort((a: any, b: any) => {
          const dateA = a.lastRead || 0;
          const dateB = b.lastRead || 0;
          return dateB - dateA;
        });
        setLibrary(parsedData.slice(0, 10));//ultimi 10 salvati
      }
    } catch (error) {
      console.error("Errore caricamento libreria:", error);
    } 
  };

  const handleSearch = () => {
    if (query.trim().length > 0) {
      router.push({
        pathname: "/searchScreen",
        params: { q: query } 
      });
    }
  };
  const handleLibraryMangaPress = (manga: MangaItem) => {
    router.push({
      pathname: "../mangaDetails/detailScreen",
      params: { id: manga.id, slug: manga.slug, source: manga.source }
    });
  };
  const handleJikanMangaPress = (title: string) => {
    router.push({
      pathname: "/searchScreen",
      params: { q: title }
    });
  };

  const renderSection = (
    title: string, 
    data: MangaItem[], 
    onPressItem: (item: any) => void,
    isLoading?: boolean,
    emptyText: string = "Nessun risultato",
    error?: ErrorInfo | null,
    onRetry?: () => void
  ) => {

    if (isLoading) return <ActivityIndicator size="small" color="#fff" style={{marginVertical: 20}}/>;

    return (
      <View style={style.sectionContainer}>
        <Text style={style.sectionTitle}>{title}</Text>
        {error ? (
          <View style={style.errorBox}>
            <MaterialIcons name="error-outline" size={20} color="grey" />
            <Text style={style.errorText}>{error.message}</Text>
            {error.action === 'retry' && onRetry && (
               <TouchableOpacity style={style.retryBtn} onPress={onRetry} activeOpacity={0.7}>
                 <Text style={style.retryText}>try again</Text>
               </TouchableOpacity>
            )}
          </View>
        ) : data.length === 0 ? (
          <Text style={style.emptyText}>{emptyText}</Text>
        ) : (
          <FlatList
            data={data}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}
            renderItem={({ item }) => (
              <MangaCard
                item={item}
                onPress={() => onPressItem(item)}
                containerStyle={{ width: 105 }} 
              /> )}
          /> )}
      </View>
    );
  };
  const SectionDivider = () => (
    <View style={style.divider} />
  );
  return (
    <View style={style.background}>
        <Image source={images.bg} style={{position:'absolute', width:'100%', zIndex:0, height:'100%'}}/>
        <View style={style.headerContainer}>
            <SearchBar
              placeholder="search"
              value={query}
              onChangeText={setQuery}
              onSubmit={handleSearch}
            />
          </View>
        <ScrollView style={{flex:1}} showsVerticalScrollIndicator={false} 
        keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingTop: 10, paddingBottom:100,paddingHorizontal:20}}>
          
          {renderSection(
            "Top Ongoing", 
            topOngoing,
            (item) => handleJikanMangaPress(item.title),
            loadingOngoing,
            "Nessun risultato",
            jikanError,
            loadJikanData
          )}
          <SectionDivider />
          {renderSection(
            "Library", 
            library,
            (item) => handleLibraryMangaPress(item),
            false,
            "Non hai ancora salvato nessun manga."
            
          )}
          <SectionDivider />
          {renderSection(
            "Top Popular All Time", 
            topPopular, 
            (item) => handleJikanMangaPress(item.title),
            loadingPopular,
            "Nessun risultato",
            jikanError,
            loadJikanData
          )}
        </ScrollView>
      
    </View>
    
  );
}

const style = StyleSheet.create({
  background:{
    flex: 1,
    backgroundColor: '#000000ff',
    paddingTop:50
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    zIndex: 10,  
  },
  sectionContainer: {
    marginTop: 25,
    marginBottom: 10
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  emptyText: {
    color: '#888',
    fontStyle: 'italic',
    fontSize: 14,
    marginTop: 5
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)', 
    marginVertical: 15,
    marginHorizontal: 20,
    borderRadius: 1
  },
  errorBox: {
    padding: 15,
    backgroundColor: 'rgba(255, 107, 107, 0.05)', 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.2)',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 18,
  },
  retryBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  retryText: {
    color: '#A8B5DB',
    fontWeight: 'bold',
    fontSize: 12,
  }
})