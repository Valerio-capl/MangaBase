import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, ActivityIndicator } from "react-native";


export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const checkTerms = async () => {
      try {
        const hasAccepted = await AsyncStorage.getItem('has_accepted_terms');
        
        if (hasAccepted !== 'true') {
          router.replace('./tos/termsScreen'); 
        }
      } catch (error) {
        console.error("Errore lettura terms:", error);
      } finally {
        setIsReady(true);
      }
    };
    checkTerms();
  }, []);

  return <Stack>
    <Stack.Screen
      name="(tabs)"
      options={{
        headerShown:false,
      }}
    />
    <Stack.Screen
        name="mangaDetails/detailScreen"
        options={{headerShown: false,}}
      />

    <Stack.Screen
      name="readerScreen/readerScreen"
      options={{
        headerShown: false,
        presentation: "card",
        }}
      />
    <Stack.Screen
      name="tos/termsScreen"
      options={{
        headerShown: false,
        presentation: "fullScreenModal",
      }}
    />
  </Stack>;
}
