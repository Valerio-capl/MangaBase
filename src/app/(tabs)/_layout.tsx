import { View, Text, ImageBackground, Image, StyleSheet} from 'react-native'
import React from 'react'
import { Tabs } from 'expo-router'
import {icons} from '@/constants/icons'
import {images} from '@/constants/images'

const TabIcon = ({focused,icon,title}:any)=>{
    if (focused){
        return (
            <ImageBackground source={images.highlight} 
                style={styles.styleIconBackground}>
                <Image source={icon}
                    style={styles.styleIcon}/>
                <Text style={{marginLeft:8, fontWeight: '600', marginRight:4}}>{title}</Text>
            </ImageBackground>
        )}
    return(
        <View style={{justifyContent: 'center', alignItems: 'center', marginTop: 16}}>
            <Image source={icon}  tintColor="#A8B5DB"/>
        </View>
    )
}

const _layout = () => {
  return (
    <Tabs screenOptions={{tabBarShowLabel:false, 
        tabBarItemStyle:{
            width:"100%",
            height:"100%",
            justifyContent:"center",
            alignItems:"center"
        },
        tabBarStyle:{
            backgroundColor:"#0f0D23",
            borderRadius:25,
            position:"absolute",
            overflow:"hidden",
            marginHorizontal:15,
            marginBottom:30,
            height:52
        }
    }}>
        <Tabs.Screen
            name="index"
            options={{
                title:"home",
                headerShown:false,
                tabBarIcon: ({focused}) => (
                    <TabIcon 
                    focused={focused}
                    icon={icons.home}
                    title="home"/>
                )
                }}/>
        <Tabs.Screen
            name="searchScreen"
            options={{
                title:"search",
                headerShown:false,
                tabBarIcon: ({focused}) => (
                    <TabIcon 
                    focused={focused}
                    icon={icons.search}
                    title="search"/>
                )
                }}/>
            
        <Tabs.Screen
            name="libraryScreen"
            options={{
                title:"library",
                headerShown:false,
                tabBarIcon: ({focused}) => (
                    <TabIcon 
                    focused={focused}
                    icon={icons.save}
                    title="saved"/>
                )
                }}/>
            
        <Tabs.Screen
            name="optionScreen"
            options={{
                title:"option",
                headerShown:false,
                tabBarIcon: ({focused}) => (
                    <TabIcon 
                    focused={focused}
                    icon={icons.options}
                    title=""/>
                )
                }}/>
        
    </Tabs>
  )
}

export default _layout

const styles = StyleSheet.create({
  styleIconBackground: {
    flexDirection: 'row',
    minWidth: 112,
    height: 56,
    marginTop: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
    overflow: 'hidden',
    paddingHorizontal: 16
  },
  styleIcon: {
    width: 24,  
    height: 24,
    marginLeft: 8,
    tintColor: '#151312'
  }
});