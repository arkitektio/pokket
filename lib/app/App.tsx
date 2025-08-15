import { manifest } from "@/lib/constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import { buildArkitekt } from "../arkitekt";
import { kabinetDefinition } from "../kabinet/service";
import { lokServiceDefinition } from "../lok/service";
import { mikroServiceDefinition } from "../mikro/service";

let asyncStorageProvider = {
  get: async (key: string) => {
    console.log("get", key);
    return await AsyncStorage.getItem(key);
  },
  set: async (key: string, value: string) => {
    console.log("set", key, value);
    return await AsyncStorage.setItem(key, value);
  },
  remove: async (key: string) => {
    console.log("remove", key);
    return await AsyncStorage.removeItem(key);
  },
};


const windowPopper = {
  open: (url: string) => {
    // Immediately start the async operation in the background
    (async () => {
      // Open the system browser
      const browserResult = await WebBrowser.openAuthSessionAsync(
        url,
        // Optional deep link to return to (can be your app’s scheme/UL)
        // If you don't pass a return URL, the browser will stay open; that's fine
        undefined
      );
    })();

    // Return a Closable object immediately
    return {
      close: async () => {
        // In React Native, we can't actually close browser windows
        // This is a no-op but maintains the interface compatibility
        console.log("Browser window cannot be programmatically closed in React Native");
      }
    };
  },
  close: (popup: any) => {
    // In React Native, we can't actually close browser windows
    // This method is kept for interface compatibility
    if (popup && typeof popup.close === 'function') {
      popup.close();
    }
  },
};

export const App = buildArkitekt({
  manifest,
  serviceBuilderMap: {
    mikro: mikroServiceDefinition,
    lok: lokServiceDefinition,
    kabinet: kabinetDefinition,
  },
  storageProvider: asyncStorageProvider,
  popper: windowPopper,
});


export const MikroInner = App.buildServiceGuard("mikro");
export const LokInner = App.buildServiceGuard("lok");
export const KabinetInner = App.buildServiceGuard("kabinet");

export const Guard = {
  Mikro: MikroInner,
  Lok: LokInner,
  Kabinet: KabinetInner,
};

