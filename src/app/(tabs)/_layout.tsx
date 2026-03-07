import { View, Text, ImageBackground, Image, StyleSheet, TouchableOpacity} from 'react-native'
import React from 'react'
import { Tabs } from 'expo-router'
import {icons} from '@/constants/icons'

function CustomTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={styles.tabBarContainer}>
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        let icon = icons.home;
        let title = "Home";
        if (route.name === 'index') { icon = icons.home; title = "Home"; }
        else if (route.name === 'searchScreen') { icon = icons.search; title = "Search"; }
        else if (route.name === 'libraryScreen') { icon = icons.save; title = "Saved"; }
        else if (route.name === 'offlineScreen') { icon = icons.download; title = "Offline"; }

        return (
          <TouchableOpacity
            key={route.name}
            activeOpacity={0.8}
            onPress={onPress}
            style={isFocused ? styles.activeTab : styles.inactiveTab}
          >
            <Image
              source={icon}
              style={[styles.styleIcon, { tintColor: isFocused ? '#151312' : '#A8B5DB' }]}
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
    bottom: 30,
    left: 15,
    right: 15,
    backgroundColor: '#0B0E23',
    borderRadius: 30,
    height: 50,
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
    height: 44,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTabText: {
    color: '#151312',
    marginLeft: 6,
    fontWeight: 'bold',
    fontSize: 14,
  },
  styleIcon: {
    width: 22,  
    height: 22,
  }
});