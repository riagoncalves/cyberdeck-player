package dev.riagoncalves.cyberdeck;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DeckPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onDestroy() {
        // The player lives in this activity's WebView; without it there's nothing to control.
        stopService(new Intent(this, PlaybackService.class));
        super.onDestroy();
    }
}
