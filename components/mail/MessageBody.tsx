import { Text } from '@/components/ui/text';
import * as React from 'react';
import { Linking, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

/**
 * Reports the document's height to React Native, so the WebView can size to
 * its content inside a ScrollView instead of scrolling on its own. Re-posts on
 * image loads and resizes; `true;` keeps iOS from warning about the result.
 */
const MEASURE = `
(function () {
  var post = function () {
    window.ReactNativeWebView.postMessage(String(document.documentElement.scrollHeight));
  };
  window.addEventListener('load', post);
  window.addEventListener('resize', post);
  Array.prototype.forEach.call(document.images, function (img) { img.addEventListener('load', post); });
  if (window.ResizeObserver) new ResizeObserver(post).observe(document.body);
  post();
})();
true;
`;

/**
 * Mail is written for a white page, so it gets one — in dark mode too — and
 * a viewport, so it lays out at phone width instead of desktop width.
 */
const wrapHtml = (html: string) => `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html, body { margin: 0; padding: 0; background: #fff; color: #111; }
  body { padding: 12px; font: 15px -apple-system, system-ui, Roboto, sans-serif; overflow-wrap: anywhere; }
  img { max-width: 100%; height: auto; }
  table { max-width: 100%; }
  pre { white-space: pre-wrap; }
</style>
</head><body>${html}</body></html>`;

/**
 * A message's body: its HTML in an auto-sized WebView, or its plain text.
 * Links open in the system browser, never inside the mail.
 */
export function MessageBody({ html, text }: { html?: string | null; text: string }) {
  const [height, setHeight] = React.useState(80);
  const source = React.useMemo(() => (html ? { html: wrapHtml(html) } : null), [html]);

  const onMessage = React.useCallback((event: WebViewMessageEvent) => {
    const next = Number(event.nativeEvent.data);
    if (Number.isFinite(next) && next > 0) setHeight((prev) => (Math.abs(prev - next) > 1 ? next : prev));
  }, []);

  if (!source) {
    return (
      <Text selectable className="text-sm leading-5 text-card-foreground">
        {text.trim() || '(empty message)'}
      </Text>
    );
  }

  return (
    <View style={{ height }} className="overflow-hidden rounded-lg">
      <WebView
        originWhitelist={['*']}
        source={source}
        injectedJavaScript={MEASURE}
        onMessage={onMessage}
        scrollEnabled={false}
        javaScriptEnabled
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={(request) => {
          if (request.url === 'about:blank' || request.url.startsWith('data:')) return true;
          if (/^(https?|mailto|tel):/.test(request.url)) {
            void Linking.openURL(request.url);
            return false;
          }
          return false;
        }}
        style={{ backgroundColor: '#fff' }}
      />
    </View>
  );
}
