LENZO PARTY LIVE - GOOGLE SIGN-IN CONFIG UPDATE

Updated:
- android/app/google-services.json was replaced with the latest file supplied in this conversation.
- Package name remains com.lenzoparty.app.
- Existing app code and versionCode were not changed.

IMPORTANT:
The supplied google-services.json currently contains the Android OAuth client certificate hash:
68b8c557bf1cf2dcf1da692bf6d3ee6a1fc9c70b

The Google Play App Signing SHA-1 supplied separately is:
4F:75:D1:84:DB:6F:66:37:36:8F:1A:41:73:AE:4B:DD:B8:CF:09:3D

These are different. A ZIP file cannot register a certificate fingerprint in Firebase/Google Cloud.
Before building a release, ensure the Play App Signing SHA-1 and SHA-256 are registered on the
Firebase Android app (com.lenzoparty.app), then download a fresh google-services.json and replace
android/app/google-services.json with that newly generated file. The current supplied file alone
does not prove that the new Play signing certificate has been included.
