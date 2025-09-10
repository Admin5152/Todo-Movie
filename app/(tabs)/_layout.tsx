import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

const getTabBarHeight = (insetsBottom: number) => {
  if (Platform.OS === 'ios') {
    return (screenHeight > 800 ? 75 : 65) + insetsBottom;
  } else {
    return screenWidth > 768 ? 75 : 65;
  }
};

const getIconSize = () => {
  if (screenWidth < 375) return 20; // Small phones
  if (screenWidth > 768) return 28; // Tablets
  return 24; // Regular phones
};

const getFontSize = () => {
  if (screenWidth < 375) return 10;
  if (screenWidth > 768) return 14;
  return 12;
};

const getTabBarPadding = () => {
  if (screenWidth < 375) return 4;
  if (screenWidth > 768) return 12;
  return 8;
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFD700',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: { 
          backgroundColor: '#0b0b0f', 
          borderTopColor: '#1f1f2a',
          height: getTabBarHeight(insets.bottom),
          paddingBottom: getTabBarPadding(),
          paddingTop: getTabBarPadding(),
          paddingHorizontal: screenWidth > 768 ? 20 : 0,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: getFontSize(),
          fontWeight: '600',
          marginTop: screenWidth > 768 ? 4 : 2,
        },
        tabBarIconStyle: {
          marginTop: screenWidth > 768 ? 4 : 0,
        },
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Home', 
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" color={color} size={getIconSize()} />
          )
        }} 
      />
      <Tabs.Screen 
        name="search" 
        options={{ 
          title: 'Search', 
          tabBarIcon: ({ color }) => (
            <Ionicons name="search" color={color} size={getIconSize()} />
          )
        }} 
      />
      <Tabs.Screen 
        name="my-list" 
        options={{ 
          title: 'My List', 
          tabBarIcon: ({ color }) => (
            <Ionicons name="bookmark" color={color} size={getIconSize()} />
          )
        }} 
      />
    </Tabs>
  );
}
