# Glimpse for Safari on Mac — experimental preview

Download **Glimpse-Safari.zip** from [the latest release](https://github.com/ashermenachem/Glimpse/releases/latest/download/Glimpse-Safari.zip). The Chrome download has different folder instructions; use the Safari ZIP for this guide.

This preview uses Safari's temporary-extension feature. It requires a Mac with **Add Temporary Extension…** in Safari's Developer settings. It is not a signed app, has not yet been verified end-to-end against MyMilken in Safari, and cannot be installed on iPhone or iPad using this ZIP.

## Install

1. Download the Safari ZIP. If your browser extracts it automatically, keep the extracted folder.
2. Open **Safari → Settings → Advanced** and turn on **Show features for web developers**.
3. Open the **Developer** tab and choose **Add Temporary Extension…**. Approve Safari's prompt to allow unsigned extensions.
4. Select the ZIP, or the extracted folder containing `manifest.json`. The manifest is at the root of this Safari download; do not select an enclosing Downloads folder.
5. In **Settings → Extensions**, enable Glimpse and allow it to access **milkenschool.myschoolapp.com**. If using profiles, enable it for the profile where you use MyMilken.
6. Open MyMilken, sign in normally, and visit **My Day → Progress**. Wait for the course cards to load, then choose your grade in the widget.

Safari removes temporary extensions after **24 hours or when you quit Safari**. Add it again using steps 3–5. Safari also resets permission to run unsigned extensions when it quits. Keep the downloaded files for next time. Preferences may need to be selected again after removal.

## Update or remove

Download the latest Safari ZIP, remove the old temporary Glimpse entry in **Safari → Settings → Extensions**, and add the new ZIP. Refresh your MyMilken tabs. Do not install multiple Glimpse copies in the same profile.

To stop using Glimpse, remove its entry in Safari's Extensions settings and refresh MyMilken.

## Troubleshooting

- **No Developer tab:** Enable web developer features in Advanced settings first.
- **No Add Temporary Extension button:** This Safari version cannot use this installation route. Update Safari/macOS if available, or use the [Chrome installation](https://github.com/ashermenachem/Glimpse#chrome). A Chrome-style Load unpacked button is not available in Safari.
- **No widget:** Check that Glimpse is enabled for your active profile, permit MyMilken website access, and reload Progress.
- **A dash instead of a GPA:** Wait for grades on Progress. Background refresh can behave differently in Safari; revisit Progress if grades do not carry to other pages.
- **It disappeared:** Temporary installation expires after 24 hours or quitting Safari. Add the ZIP again.
- **Managed school Mac:** If developer features or unsigned extensions are restricted, ask your administrator for assistance.

## About this package

The Safari ZIP uses the same extension code and MyMilken-only permissions as the Chrome build, packaged with `manifest.json` at the archive root for Safari's picker. It contains no school records or credentials. Grades remain in the browser; see [the privacy policy](https://github.com/ashermenachem/Glimpse/blob/main/PRIVACY.md).

A permanent Safari release needs a containing app and Apple signing/distribution setup. This ZIP does not provide that. Apple's [running guide](https://developer.apple.com/documentation/safariservices/running-your-safari-web-extension) documents temporary installation; its [distribution guide](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension) describes signed distribution.
