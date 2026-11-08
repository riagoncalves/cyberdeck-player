package dev.riagoncalves.cyberdeck;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import java.io.InputStream;
import java.net.URL;
import java.util.Objects;

/**
 * Keeps the app alive while the in-app Spotify player is playing, and shows the track in a
 * media notification with lock-screen and headset controls. Buttons go back to the UI
 * through DeckPlugin, which drives the Spotify player.
 */
public class PlaybackService extends Service {

    static PlaybackService instance;

    private static final String CHANNEL = "playback";
    private static final int NOTIFICATION_ID = 1;
    private static final String ACTION_PREFIX = "dev.riagoncalves.cyberdeck.media.";

    private final Handler main = new Handler(Looper.getMainLooper());
    private MediaSession session;
    private String title = "";
    private String artist = "";
    private String artUrl;
    private Bitmap art;
    private boolean playing;

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;

        NotificationChannel channel = new NotificationChannel(CHANNEL, "Playback", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("What's playing, with playback controls");
        channel.setShowBadge(false);
        getSystemService(NotificationManager.class).createNotificationChannel(channel);

        session = new MediaSession(this, "CyberdeckPlayer");
        session.setCallback(
            new MediaSession.Callback() {
                @Override
                public void onPlay() {
                    DeckPlugin.emitMediaAction("play");
                }

                @Override
                public void onPause() {
                    DeckPlugin.emitMediaAction("pause");
                }

                @Override
                public void onSkipToNext() {
                    DeckPlugin.emitMediaAction("next");
                }

                @Override
                public void onSkipToPrevious() {
                    DeckPlugin.emitMediaAction("previous");
                }
            }
        );
        session.setSessionActivity(openAppIntent());
        session.setActive(true);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        if (action != null && action.startsWith(ACTION_PREFIX)) {
            DeckPlugin.emitMediaAction(action.substring(ACTION_PREFIX.length()));
        } else if (intent != null) {
            show(intent.getStringExtra("title"), intent.getStringExtra("artist"), intent.getStringExtra("artUrl"), intent.getBooleanExtra("playing", false));
        }
        return START_NOT_STICKY;
    }

    void show(String title, String artist, String artUrl, boolean playing) {
        this.title = title != null ? title : "";
        this.artist = artist != null ? artist : "";
        this.playing = playing;
        if (!Objects.equals(artUrl, this.artUrl)) {
            this.artUrl = artUrl;
            this.art = null;
            if (artUrl != null) loadArt(artUrl);
        }
        render();
    }

    private void render() {
        MediaMetadata.Builder metadata = new MediaMetadata.Builder()
            .putString(MediaMetadata.METADATA_KEY_TITLE, title)
            .putString(MediaMetadata.METADATA_KEY_ARTIST, artist);
        if (art != null) metadata.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, art);
        session.setMetadata(metadata.build());
        session.setPlaybackState(
            new PlaybackState.Builder()
                .setActions(
                    PlaybackState.ACTION_PLAY |
                        PlaybackState.ACTION_PAUSE |
                        PlaybackState.ACTION_PLAY_PAUSE |
                        PlaybackState.ACTION_SKIP_TO_NEXT |
                        PlaybackState.ACTION_SKIP_TO_PREVIOUS
                )
                .setState(playing ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED, PlaybackState.PLAYBACK_POSITION_UNKNOWN, 1f)
                .build()
        );

        Notification notification = new Notification.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_deck)
            .setContentTitle(title)
            .setContentText(artist)
            .setLargeIcon(art)
            .setContentIntent(openAppIntent())
            .setOngoing(true)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .addAction(action(android.R.drawable.ic_media_previous, "Previous", "previous"))
            .addAction(
                playing
                    ? action(android.R.drawable.ic_media_pause, "Pause", "pause")
                    : action(android.R.drawable.ic_media_play, "Play", "play")
            )
            .addAction(action(android.R.drawable.ic_media_next, "Next", "next"))
            .setStyle(new Notification.MediaStyle().setMediaSession(session.getSessionToken()).setShowActionsInCompactView(0, 1, 2))
            .build();

        startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
    }

    private Notification.Action action(int icon, String label, String name) {
        Intent intent = new Intent(this, PlaybackService.class).setAction(ACTION_PREFIX + name);
        PendingIntent pending = PendingIntent.getService(this, name.hashCode(), intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        return new Notification.Action.Builder(null, label, pending).build();
    }

    private PendingIntent openAppIntent() {
        Intent intent = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private void loadArt(String url) {
        new Thread(() -> {
            try (InputStream in = new URL(url).openStream()) {
                Bitmap bitmap = BitmapFactory.decodeStream(in);
                main.post(() -> {
                    if (url.equals(artUrl)) {
                        art = bitmap;
                        render();
                    }
                });
            } catch (Exception ignored) {
                // No cover art: the notification still works.
            }
        }).start();
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // Swiping the app away closes the WebView, so the player is gone too.
        stopSelf();
    }

    @Override
    public void onDestroy() {
        instance = null;
        session.setActive(false);
        session.release();
        stopForeground(STOP_FOREGROUND_REMOVE);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
