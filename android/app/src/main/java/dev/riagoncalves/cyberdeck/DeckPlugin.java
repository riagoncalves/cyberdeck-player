package dev.riagoncalves.cyberdeck;

import android.app.Dialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.activity.OnBackPressedCallback;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The native half of window.deck (src/renderer/platform/android.ts): opens the browser for
 * sign-in and hands the redirect back, drives the media notification, and forwards the
 * back gesture to the UI.
 */
@CapacitorPlugin(name = "Deck")
public class DeckPlugin extends Plugin {

    static final String REDIRECT_SCHEME = "cyberdeck-player";

    private static DeckPlugin instance;

    @Override
    public void load() {
        instance = this;

        WebView webView = getBridge().getWebView();
        // The Spotify player starts audio from API calls, not from a tap inside the page.
        webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
        // Keep the WebView's renderer alive while the app is in the background and playing.
        webView.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, false);

        getActivity()
            .getOnBackPressedDispatcher()
            .addCallback(
                getActivity(),
                new OnBackPressedCallback(true) {
                    @Override
                    public void handleOnBackPressed() {
                        if (hasListeners("back")) notifyListeners("back", new JSObject());
                        else getActivity().moveTaskToBack(true);
                    }
                }
            );
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        deliverRedirect(intent.getData());
    }

    private boolean deliverRedirect(Uri data) {
        if (data == null || !REDIRECT_SCHEME.equals(data.getScheme())) return false;
        JSObject payload = new JSObject();
        payload.put("url", data.toString());
        notifyListeners("authCallback", payload);
        return true;
    }

    @PluginMethod
    public void openUrl(PluginCall call) {
        String url = call.getString("url", "");
        if (!url.startsWith("https://")) {
            call.reject("Only https links can be opened.");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(intent);
        } catch (ActivityNotFoundException e) {
            // No browser (common on car head units): open the page inside the app instead.
            getActivity().runOnUiThread(() -> openInAppBrowser(url));
        }
        call.resolve();
    }

    /** A full-screen WebView that closes itself when Spotify redirects back to the app. */
    private void openInAppBrowser(String url) {
        Dialog dialog = new Dialog(getActivity(), android.R.style.Theme_Black_NoTitleBar_Fullscreen);
        WebView web = new WebView(getActivity());
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.setWebViewClient(
            new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    if (deliverRedirect(request.getUrl())) {
                        dialog.dismiss();
                        return true;
                    }
                    return false;
                }
            }
        );
        dialog.setContentView(web);
        dialog.setOnDismissListener((d) -> web.destroy());
        dialog.show();
        web.loadUrl(url);
    }

    @PluginMethod
    public void updateMedia(PluginCall call) {
        boolean active = Boolean.TRUE.equals(call.getBoolean("active", false));
        if (!active) {
            getContext().stopService(new Intent(getContext(), PlaybackService.class));
            call.resolve();
            return;
        }
        String title = call.getString("title", "");
        String artist = call.getString("artist", "");
        String artUrl = call.getString("artUrl", null);
        boolean playing = Boolean.TRUE.equals(call.getBoolean("playing", false));

        PlaybackService running = PlaybackService.instance;
        if (running != null) {
            running.show(title, artist, artUrl, playing);
        } else {
            Intent intent = new Intent(getContext(), PlaybackService.class)
                .putExtra("title", title)
                .putExtra("artist", artist)
                .putExtra("artUrl", artUrl)
                .putExtra("playing", playing);
            ContextCompat.startForegroundService(getContext(), intent);
        }
        call.resolve();
    }

    /** Leaves the app in the background; playback keeps going. */
    @PluginMethod
    public void exit(PluginCall call) {
        getActivity().moveTaskToBack(true);
        call.resolve();
    }

    /** Called by PlaybackService for notification, lock screen and headset buttons. */
    static void emitMediaAction(String action) {
        if (instance == null) return;
        JSObject payload = new JSObject();
        payload.put("action", action);
        instance.notifyListeners("media", payload);
    }
}
