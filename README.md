# NFS-e Cycle Assistant

An early browser extension prototype for copying a NetSupport payment cycle into a format that can be reviewed when preparing a Brazilian electronic service invoice (NFS-e). This repository contains the **0.1.1** edition. Its popup is in Brazilian Portuguese.

## Install locally

1. Download or clone this repository.
2. Open `edge://extensions` in Microsoft Edge or `chrome://extensions` in Chrome.
3. Enable **Developer mode** and choose **Load unpacked**.
4. Select the folder containing [`manifest.json`](manifest.json).

## Capture a cycle

1. Sign in to NetSupport and open **Extrato de Pagamentos**.
2. Open the extension and select **Capturar ciclo pendente**.
3. Compare the captured reference and amount with the payment statement. The draft description uses the month of the captured reference date, so verify it against the actual service period.
4. Select **Copiar dados** to copy the values to the clipboard. The popup also shows the saved values when you open the national NFS-e portal.

The capture reads visible dates and amounts near the first **Nota Fiscal** button it finds. Its results depend on the layout of the payment statement. Review the values and complete invoice entry and submission manually.

## Data and access

The extension runs the capture on the NetSupport payment site after you click the button. It keeps the most recent result in the extension's local storage. Select **Limpar** to remove it. The repository contains the extension source and excludes account records and captured payment data.
