import { Tabs } from 'expo-router';
import React from 'react';

import { SettingsButton } from '@/components/SettingsButton';
import { Bell } from '@/lib/icons/Bell';
import { useMyOrganizationQuery } from '@/lib/lok/api/graphql';
import { Home } from 'lucide-react-native';

export default function TabLayout() {
  /* Safe to query unconditionally: this layout only ever renders inside the
     logged-in branch of app/_layout.tsx, so the lok client exists. */
  const { data } = useMyOrganizationQuery();
  const organization = data?.mycontext?.organization;

  /* `profile.name` is the display name and is nullable; `slug` is the
     non-null identifier every organization has. "Home" only shows before the
     query resolves. */
  const organizationName = organization?.profile?.name ?? organization?.slug;

  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          // The tab keeps its short label; only the screen header takes the
          // organization name, which can be long.
          title: "Home",
          headerTitle: organizationName ?? "Home",
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
