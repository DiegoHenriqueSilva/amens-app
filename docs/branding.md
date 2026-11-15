# Official Amens icon

The official artwork is the existing dove holding a parchment from
`public/enviaroracao_3d.png` (the Enviar Pedido action). Its unmodified copy is
`public/icons/amens-master.png`.

Run `node scripts/generate-app-icons.cjs` to regenerate browser, PWA, Android,
iOS source icons, and Android splash images from this artwork. The script also
creates `tmp/amens-official-icon-preview.png` for visual inspection.

Browser favicons and installation icons use the colored artwork. Android small
notification icons use a solid white silhouette on transparency, as required
by Android. Adaptive and maskable artwork stays within the platform safe area.

Android version `1.1.1-test` (code 6, OTA cohort `android-6`) includes these native
resources. The verified APK is `tmp/Amens-icone-oficial.apk`; its certificate
matches the original test APK, allowing installation over the previous app.
Native icon changes require an APK update. Compatible web changes continue
through the signed production update workflow in `automatic-updates.md`.

iOS artwork is generated, but an iOS binary has not been built or tested here.
