import { IconSymbol } from "@/components/ui/IconSymbol";
import { App } from "@/lib/app/App";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from '@/lib/theme/BrandProvider';

export const SettingsButton = () => {
  const colors = useThemeColors();
  const disconnect = App.useDisconnect();
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    setVisible(false);
    disconnect();
  };

  return (
    <View>
      <TouchableOpacity onPress={() => setVisible(true)} style={{ marginRight: 15 }}>
        <IconSymbol name="gear" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={visible}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
            {/* Colors come from the live theme; only layout stays in the
                StyleSheet, which cannot see the hook. This menu was hardcoded
                white on a dark app. */}
            <View
                style={[
                    styles.menu,
                    {
                        marginTop: insets.top + 40,
                        backgroundColor: colors.card,
                        borderWidth: 1,
                        borderColor: colors.border,
                    },
                ]}>
                <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                    <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color={colors.destructive} />
                    <Text style={[styles.menuText, { color: colors.destructive }]}>Logout</Text>
                </TouchableOpacity>
            </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
    },
    menu: {
        marginRight: 15,
        borderRadius: 12,
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        minWidth: 180,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
    },
    menuText: {
        marginLeft: 12,
        fontSize: 16,
        fontWeight: '500',
    }
});
