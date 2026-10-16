import { ModuleHome } from '@/components/navigation/ModuleHome';
import { ScrollView } from 'react-native';

/**
 * Everything of this phone itself, not of an organization: its timeline and
 * notifications, Wi-Fi and device setup, the app's settings. The sidebar's
 * grid keeps one icon for all of it, next to the organization's services —
 * as orkestrator keeps its rail for services. Its home is its pages.
 */
export default function PhoneScreen() {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-10">
      <ModuleHome moduleKey="phone" />
    </ScrollView>
  );
}
