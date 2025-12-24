import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        // Set the active tab color to the standard Google/Android blue
        tabBarActiveTintColor: '#1A73E8',
        tabBarInactiveTintColor: '#757575',
        // Show the top header
        headerShown: true,
        // Style the tab bar for better spacing
        tabBarStyle: {
          paddingBottom: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      {/* 1. Main Dashboard (QoE Monitor) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'QoE Monitor',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="call" size={26} color={color} />
          ),
        }}
      />

      {/* 2. Call History (Logs) */}
      <Tabs.Screen
        name="logs"
        options={{
          title: 'Call History',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="history" size={26} color={color} />
          ),
        }}
      />

      {/* 3. Speed/Connectivity Tests */}
      <Tabs.Screen
        name="data" // Note: If your file is settings.js, use 'settings'
        options={{
          title: 'Datas Test',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="speed" size={26} color={color} />
          ),
        }}
      />

      {/* 4. The NEW Network/Device Info Tab */}
     
    </Tabs>
  );
}