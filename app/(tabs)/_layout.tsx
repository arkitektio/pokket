import { Tabs } from 'expo-router';
import React from 'react';

import { SettingsButton } from '@/components/SettingsButton';
import { Bell } from '@/lib/icons/Bell';
import { Home } from 'lucide-react-native';

export default function TabLayout() {

  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Home size={28} color={color} />,
          headerRight: () => <SettingsButton />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ color }) => <Bell size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}
