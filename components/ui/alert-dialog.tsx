import * as React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { cn } from '~/lib/utils';

type AlertDialogAction = {
  label: string;
  onPress?: () => void;
  variant?: 'default' | 'destructive' | 'cancel';
};

type AlertDialogState = {
  visible: boolean;
  title: string;
  message: string;
  actions: AlertDialogAction[];
};

type AlertDialogContextType = {
  show: (title: string, message: string, actions?: AlertDialogAction[]) => void;
  hide: () => void;
};

const AlertDialogContext = React.createContext<AlertDialogContextType | null>(null);

export function useAlertDialog() {
  const ctx = React.useContext(AlertDialogContext);
  if (!ctx) throw new Error('useAlertDialog must be used within AlertDialogProvider');
  return ctx;
}

export function AlertDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AlertDialogState>({
    visible: false,
    title: '',
    message: '',
    actions: [],
  });

  const show = React.useCallback(
    (title: string, message: string, actions?: AlertDialogAction[]) => {
      setState({
        visible: true,
        title,
        message,
        actions: actions ?? [{ label: 'OK', variant: 'default' }],
      });
    },
    [],
  );

  const hide = React.useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleAction = React.useCallback(
    (action: AlertDialogAction) => {
      hide();
      action.onPress?.();
    },
    [hide],
  );

  const ctx = React.useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <AlertDialogContext.Provider value={ctx}>
      {children}
      <Modal
        visible={state.visible}
        transparent
        animationType="fade"
        onRequestClose={hide}
        statusBarTranslucent
      >
        <Pressable
          className="flex-1 justify-center items-center bg-black/50 px-6"
          onPress={hide}
        >
          <Pressable
            className="w-full max-w-sm rounded-xl border border-border bg-card shadow-xl p-0 overflow-hidden"
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View className="px-6 pt-6 pb-2">
              <Text className="text-lg font-semibold text-card-foreground">
                {state.title}
              </Text>
            </View>

            {/* Message */}
            <View className="px-6 pb-4">
              <Text className="text-sm text-muted-foreground leading-5">
                {state.message}
              </Text>
            </View>

            {/* Actions */}
            <View className="flex-row justify-end gap-2 px-6 pb-6 pt-2">
              {state.actions.map((action, i) => (
                <Pressable
                  key={i}
                  onPress={() => handleAction(action)}
                  className={cn(
                    'rounded-md px-4 py-2 min-w-[64px] items-center',
                    action.variant === 'destructive' &&
                      'bg-destructive active:opacity-90',
                    action.variant === 'cancel' &&
                      'bg-secondary active:opacity-80',
                    action.variant === 'default' &&
                      'bg-primary active:opacity-90',
                    !action.variant && 'bg-primary active:opacity-90',
                  )}
                >
                  <Text
                    className={cn(
                      'text-sm font-medium',
                      action.variant === 'destructive' &&
                        'text-destructive-foreground',
                      action.variant === 'cancel' &&
                        'text-secondary-foreground',
                      (action.variant === 'default' || !action.variant) &&
                        'text-primary-foreground',
                    )}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AlertDialogContext.Provider>
  );
}
