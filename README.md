# NFS-e Invoice Prep Extension

A browser extension that reads pending payment cycles from NetSupport and helps prepare a Brazilian electronic service invoice (NFS-e) in the National NFS-e Portal. The popup is in Brazilian Portuguese.

## Install

The extension uses Manifest V3 and standard browser APIs. Use a current desktop version of Chrome or Microsoft Edge on Windows, macOS, or Linux.

1. Download or clone this repository. Extract the archive if you downloaded a ZIP.
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Enable **Developer mode**, click **Load unpacked**, and select the folder that contains `manifest.json`.

See the browser instructions for loading extensions locally. [Chrome](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked) · [Microsoft Edge](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/getting-started/extension-sideloading)

## Prepare a draft

1. Sign in to NetSupport and open **Extrato de Pagamentos**. Select **Capturar ciclo pendente** in the popup to read the first visible pending cycle.
2. Compare the captured service period and amount with the statement. Use **Copiar dados** to copy the result to the clipboard.
3. Sign in to the National NFS-e Portal in a separate tab. Choose the issuer, recipient, location, service classification, and tax options in the portal for the draft you are preparing.
4. Use the extension on each applicable draft screen to prefill and check the service date, description, and amount. Advance through the form in the portal and verify the final summary there before submitting.

The extension can check for possible duplicates in the visible invoice list. Review the list in the portal if the result is inconclusive. The capture and form checks depend on the current page layout and the data visible in your browser session.

## Data handling

The extension reads the supported NetSupport and NFS-e pages when you use the popup. It keeps the captured cycle in the browser extension's session memory. Closing the browser or selecting **Limpar ciclo** clears it. Account and tax selections come from your active portal session.
