export {};

declare global {
  interface Window {
    YT: any;
    Telegram: any;
    onYouTubeIframeAPIReady: () => void;
  }
}