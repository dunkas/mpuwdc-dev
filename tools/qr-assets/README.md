# QR assets

Pinned local browser bundle for member-card generation and QR camera scanning. Build with `npm ci --prefix tools/qr-assets --cache /workspace/.mpu-runtime/npm-cache` and `npm run build --prefix tools/qr-assets`. The package lock verifies npm artifact integrity. The generated `public/assets/qr-tools.min.js` is included in release archives so the portal does not require a third-party scanner CDN.

The camera uses ZXing's browser QR reader (including an iPhone-compatible JavaScript decoder); QR rendering uses qrcode. See `licenses/` and the bundle's retained legal notices.
