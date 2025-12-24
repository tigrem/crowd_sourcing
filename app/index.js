import { Redirect } from 'expo-router';

export default function Index() {
  // This forces the app to jump directly into your tab system
  return <Redirect href="/(tabs)/" />;
}