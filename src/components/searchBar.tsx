import { View, Text, Image, StyleSheet, TextInput} from 'react-native'
import React from 'react'
import {icons} from "@/constants/icons";

interface Props{
  placeholder:string;
  
  value?: string;
  onChangeText?: (text: string) => void;
  onSubmit?: () => void;
}

export default function SearchBar({placeholder, value, onChangeText, onSubmit}:Props) {
  return (
    <View style={style.container}>
      <Image source={icons.search} style={{width: 20, height: 15}} tintColor='#A8B5DB' resizeMode='contain'/>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor='#a8b5db'
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        style={style.input}
        multiline={false}
        scrollEnabled={false}
      />

    </View>
  )
}
const style = StyleSheet.create({
  container:{
    height: 30,
    flexDirection:'row',
    borderRadius: 90,
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#1F243D',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  input:{flex:1, 
    marginLeft:8, 
    color:'#A8B5DB', 
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
    fontSize:15
  }
})