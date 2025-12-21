import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack>
    <Stack.Screen
      name="(tabs)"
      options={{
        headerShown:false,
      }}
    />
    <Stack.Screen
        name="mangaDetails/[mangaID]"
        options={{ title: "Manga Detail" }}
      />

      {/* Reader */}
      <Stack.Screen
        name="readerScreen/[chapterID]"
        options={{
          headerShown: false,
          presentation: "card",
        }}
      />
  </Stack>;
}
