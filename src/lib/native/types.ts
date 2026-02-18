export type NativeSharePayload = {
  title?: string;
  text?: string;
  url?: string;
};

export type NativeListenerHandle = {
  remove?: () => void;
};

export type AppUrlOpenEvent = {
  url: string;
};

export type AppStateEvent = {
  isActive: boolean;
};

export type NetworkStatusEvent = {
  connected: boolean;
};

export interface NativeBridge {
  isNativeApp(): boolean;
  share(payload: NativeSharePayload): Promise<boolean>;
  copyText(text: string): Promise<boolean>;
  pickImage(): Promise<File | null>;
  openExternalUrl(url: string): Promise<void>;
  getLaunchUrl?(): Promise<string | null>;
  addAppUrlOpenListener?(
    listener: (event: AppUrlOpenEvent) => void
  ): Promise<NativeListenerHandle | null>;
  addAppStateListener?(
    listener: (event: AppStateEvent) => void
  ): Promise<NativeListenerHandle | null>;
  addNetworkListener?(
    listener: (event: NetworkStatusEvent) => void
  ): Promise<NativeListenerHandle | null>;
}
