import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { View, Modal, Text, Button, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

// Firebase's modular JS SDK (used elsewhere in this app) has no DOM to run
// `firebase.auth.RecaptchaVerifier` against on React Native, so phone auth's
// required "application verifier" is implemented here with a hidden WebView
// that loads Firebase's compat SDK from CDN, runs the real reCAPTCHA
// challenge, and posts the resulting token back over the RN WebView bridge.
// `PhoneAuthProvider.verifyPhoneNumber` only needs an object shaped like
// { type: "recaptcha", verify(): Promise<string> } — it doesn't care that
// the verifier itself runs inside a WebView.
//
// Two reCAPTCHA instances are needed, matching how Google's own widget
// behaves: an invisible one that silently approves most requests, and a
// visible fallback for the rare case Google escalates a request to a real
// challenge — without the fallback, that escalation would render inside the
// 0-sized invisible WebView where the user could never see or solve it.

type Props = {
    firebaseConfig: Record<string, string>;
};

export type RecaptchaVerifierHandle = {
    type: "recaptcha";
    verify: () => Promise<string>;
};

function buildHtml(firebaseConfig: Record<string, string>, invisible: boolean) {
    return `
<!DOCTYPE html><html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
  <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"></script>
  <script>firebase.initializeApp(${JSON.stringify(firebaseConfig)});</script>
  <style>
    html, body { margin: 0; padding: 0; height: 100%; }
    #recaptcha-btn { width: 100%; height: 100%; border: 0; }
  </style>
</head>
<body>
  ${invisible
            ? `<button id="recaptcha-btn" type="button"></button>`
            : `<div id="recaptcha-btn" class="g-recaptcha"></div>`}
  <script>
    var challengeTimer;
    function post(msg) { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }
    function onVerify(token) {
      if (challengeTimer) { clearInterval(challengeTimer); challengeTimer = undefined; }
      post({ type: "verify", token: token });
    }
    function onExpired() { post({ type: "expired" }); }
    function onError() { post({ type: "error" }); }
    window.onClickButton = function() {
      document.getElementById("recaptcha-btn").click();
      ${invisible ? `
      // Google renders the escalated challenge as an iframe appended to
      // <body>; poll for it since there's no direct callback for it.
      if (!challengeTimer) {
        challengeTimer = setInterval(function () {
          var iframes = document.getElementsByTagName("iframe");
          for (var i = 0; i < iframes.length; i++) {
            if (iframes[i].src.indexOf("recaptcha/api2/bframe") >= 0) {
              clearInterval(challengeTimer);
              challengeTimer = undefined;
              post({ type: "fullChallenge" });
              return;
            }
          }
        }, 150);
      }` : ``}
    };
    function onLoad() {
      post({ type: "load" });
      window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier("recaptcha-btn", {
        size: "${invisible ? "invisible" : "normal"}",
        callback: onVerify,
        "expired-callback": onExpired
      });
      window.recaptchaVerifier.render();
    }
  </script>
  <script src="https://www.google.com/recaptcha/api.js?onload=onLoad&render=explicit" onerror="onError()"></script>
</body></html>`;
}

type InternalProps = {
    firebaseConfig: Record<string, string>;
    invisible: boolean;
    onLoad: () => void;
    onVerify: (token: string) => void;
    onError: () => void;
    onFullChallenge?: () => void;
    style?: any;
};

const RecaptchaWebView = forwardRef<WebView, InternalProps>(({ firebaseConfig, invisible, onLoad, onVerify, onError, onFullChallenge, style }, ref) => {
    return (
        <WebView
            ref={ref}
            style={style}
            source={{ html: buildHtml(firebaseConfig, invisible), baseUrl: `https://${firebaseConfig.authDomain}` }}
            javaScriptEnabled
            onMessage={(event) => {
                const data = JSON.parse(event.nativeEvent.data);
                switch (data.type) {
                    case "load": onLoad(); break;
                    case "verify": onVerify(data.token); break;
                    case "fullChallenge": onFullChallenge?.(); break;
                    case "expired":
                    case "error": onError(); break;
                }
            }}
            onError={onError}
        />
    );
});

const RecaptchaVerifier = forwardRef<RecaptchaVerifierHandle, Props>(({ firebaseConfig }, ref) => {
    const invisibleWebview = useRef<WebView>(null);
    const pending = useRef<{ resolve: (token: string) => void; reject: (err: Error) => void } | null>(null);
    const [invisibleLoaded, setInvisibleLoaded] = useState(false);
    const [challengeVisible, setChallengeVisible] = useState(false);
    const [challengeKey, setChallengeKey] = useState(0);

    useImperativeHandle(ref, () => ({
        type: "recaptcha" as const,
        verify: () => {
            return new Promise<string>((resolve, reject) => {
                pending.current = { resolve, reject };
                if (invisibleLoaded) {
                    invisibleWebview.current?.injectJavaScript(`window.onClickButton(); true;`);
                } else {
                    reject(new Error("reCAPTCHA has not finished loading yet"));
                }
            });
        },
    }));

    const settle = (fn: (p: { resolve: (t: string) => void; reject: (e: Error) => void }) => void) => {
        if (!pending.current) return;
        fn(pending.current);
        pending.current = null;
    };

    return (
        <View style={styles.hidden}>
            <RecaptchaWebView
                ref={invisibleWebview}
                firebaseConfig={firebaseConfig}
                invisible
                style={styles.hidden}
                onLoad={() => setInvisibleLoaded(true)}
                onVerify={(token) => settle((p) => p.resolve(token))}
                onError={() => settle((p) => p.reject(new Error("Failed to load reCAPTCHA")))}
                onFullChallenge={() => setChallengeVisible(true)}
            />
            <Modal visible={challengeVisible} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={styles.modal}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Verify you're human</Text>
                        <Button title="Cancel" onPress={() => {
                            setChallengeVisible(false);
                            setChallengeKey((k) => k + 1);
                            settle((p) => p.reject(new Error("Cancelled")));
                        }} />
                    </View>
                    <RecaptchaWebView
                        key={challengeKey}
                        firebaseConfig={firebaseConfig}
                        invisible={false}
                        style={styles.content}
                        onLoad={() => { }}
                        onVerify={(token) => {
                            setChallengeVisible(false);
                            setChallengeKey((k) => k + 1);
                            settle((p) => p.resolve(token));
                        }}
                        onError={() => {
                            setChallengeVisible(false);
                            setChallengeKey((k) => k + 1);
                            settle((p) => p.reject(new Error("reCAPTCHA verification failed")));
                        }}
                    />
                </SafeAreaView>
            </Modal>
        </View>
    );
});

const styles = StyleSheet.create({
    hidden: { width: 0, height: 0, overflow: "hidden" },
    modal: { flex: 1 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12 },
    title: { fontSize: 16, fontWeight: "600" },
    content: { flex: 1 },
});

export default RecaptchaVerifier;
