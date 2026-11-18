package com.linzo.partylive;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.FirebaseApp;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        FirebaseApp.initializeApp(this);
        registerPlugin(NativeGoogleAuthPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
