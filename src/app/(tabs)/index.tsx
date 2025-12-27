import { useState } from "react";
import { Text, View, StyleSheet, Image, ScrollView } from "react-native";
import {images} from "@/constants/images";
import SearchBar from "@/src/components/searchBar";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const handleSearch = () => {
    if (query.trim().length > 0) {
      router.push({
        pathname: "/searchScreen",
        params: { q: query } 
      });
    }
  };

  return (
    <View style={style.background}>
        <Image source={images.bg} style={{position:'absolute', width:'100%', zIndex:0, height:'100%'}}/>
        
        <ScrollView style={{flex:1, paddingHorizontal: 20}} showsVerticalScrollIndicator={false} 
        keyboardShouldPersistTaps="handled" contentContainerStyle={{minHeight:'100%', paddingBottom:10}}>

          <View style={{flex:1}}>
            <SearchBar
              placeholder="search"
              value={query}
              onChangeText={setQuery}
              onSubmit={handleSearch}
            />
          </View>
          {/* aggiungi img ultimi aggiornati, libreria ultimi letti e top 10 generali */}
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
  icon:{ 
    width: 48, 
    height: 40, 
    marginTop: 80, 
    marginBottom: 20, 
    alignSelf: 'center' 
  }
})