import { reportError } from '@/lib/debug/errorLog';
import { useRegisterComChannelMutation } from '@/lib/lok/api/graphql';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { Text } from './ui/text';


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});



async function sendPushNotification(expoPushToken: string) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: 'Original Title',
    body: 'And here is the body!',
    data: { someData: 'goes here' },
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}


function handleRegistrationError(errorMessage: string) {
  alert(errorMessage);
  throw new Error(errorMessage);
}

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      handleRegistrationError('Permission not granted to get push token for push notification!');
      return;
    }
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId) {
      handleRegistrationError('Project ID not found');
    }
    try {
      const pushTokenString = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      console.log(pushTokenString);
      return pushTokenString;
    } catch (e: unknown) {
      handleRegistrationError(`${e}`);
    }
  } else {
    handleRegistrationError('Must use physical device for push notifications');
  }
}

export const Notifier = () => {

  const [register] = useRegisterComChannelMutation()
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  /* Which step it reached. Without this, a promise that simply never settles —
     a permission prompt that was never answered, a request with no timeout —
     is indistinguishable from one that was never started. */
  const [stage, setStage] = useState<string>('requesting permission and token');
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(
    undefined
  );

  useEffect(() => {
    const fail = (stage: string) => (thrown: any) => {
      const message = `${stage}: ${thrown?.message ?? String(thrown)}`;
      setError(message);
      // Also into the error log: the inline <Text> below is easy to scroll past
      // and disappears the moment this screen unmounts.
      reportError('js', `push registration — ${message}`, thrown?.stack);
    };

    registerForPushNotificationsAsync()
      .then(token => {
        setStage(token ? `registering token ${token.slice(0, 24)}…` : 'no token returned');
        register({ variables: { input: { token: token ?? '' } } }).then(response => {
            console.log(response);
            setStage('registered');
            setSuccess(true);
        }).catch(fail('registerComChannel mutation'));
      })
      .catch(fail('getExpoPushTokenAsync'));

    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  return (
    <View>
      {error ? <Text className="text-destructive text-sm">Push: {error}</Text> : null}
      {success ? (
        <Text className="text-sm">Successfully registered for push notifications! 🎉</Text>
      ) : (
        <Text className="text-muted-foreground text-xs">Push: {stage}</Text>
      )}
    </View>
  );
}
