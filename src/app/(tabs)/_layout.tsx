import { icons } from '@/constants/icons';
import { Tabs, useRouter, type Href } from 'expo-router';
import { Image, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dynamicBottom = Math.max(insets.bottom, 30);
  const { width } = useWindowDimensions();
  const isTablet = width > 600;
  const barHeight = isTablet ? 70 : 50;
  const tabHeight = isTablet ? 54 : 44;
  const iconSize = isTablet ? 28 : 22;
  const textSize = isTablet ? 16 : 14;
  const pillMinWidth = isTablet ? 130 : 100;

  return (
    <View style={[styles.tabBarContainer, 
      { bottom: dynamicBottom, height: barHeight },
      isTablet ? { alignSelf: 'center', width: 450 } : { left: 15, right: 15 }]}>

      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        let icon = icons.home;
        let title = "Home";
        let href: Href = '/';
        if (route.name === 'index') { icon = icons.home; title = "Home"; href = '/'; }
        else if (route.name === 'searchScreen') { icon = icons.search; title = "Search"; href = '/searchScreen'; }
        else if (route.name === 'libraryScreen') { icon = icons.save; title = "Saved"; href = '/libraryScreen'; }
        else if (route.name === 'offlineScreen') { icon = icons.download; title = "Offline"; href = '/offlineScreen'; }

        const onPress = () => {
          if (!isFocused) {
            router.navigate(href);
          }
        };

        return (
          <TouchableOpacity
            key={route.name}
            activeOpacity={0.8}
            onPress={onPress}
            style={[isFocused ? styles.activeTab : styles.inactiveTab,
              { 
                height: tabHeight, 
                minWidth: isFocused ? pillMinWidth : tabHeight,
                width: isFocused ? 'auto' : tabHeight,
                borderRadius: tabHeight / 2
              }
            ]}
          >
            <Image
              source={icon}
              style={{ width: iconSize, height: iconSize, tintColor: isFocused ? '#151312' : '#A8B5DB' }}
              resizeMode="contain"
            />
            {isFocused && (
              <Text style={styles.activeTabText}>{title}</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const _layout = () => {
  return (
    <Tabs 
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="searchScreen" />
        <Tabs.Screen name="libraryScreen" />
        <Tabs.Screen name="offlineScreen" />
    </Tabs>
  )
}

export default _layout

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    backgroundColor: '#0B0E23',
    borderRadius: 35,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  activeTab: {
    flexDirection: 'row',
    backgroundColor: '#E0CCFA',
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  inactiveTab: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTabText: {
    color: '#151312',
    marginLeft: 6,
    fontWeight: 'bold',
  },
  
});