import { Tabs } from 'expo-router';
import React from 'react';

import { Bluetooth } from '@/lib/icons/Bluetooth';
import { Sun } from '@/lib/icons/Sun';

export default function TabLayout() {

  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: "Arkitekt",
          tabBarIcon: ({ color }) => <Sun size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="provision"
        options={{
          title: "Provision",
          tabBarIcon: ({ color }) => <Bluetooth size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}
