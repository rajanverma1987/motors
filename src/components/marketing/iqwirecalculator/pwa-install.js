import path from "path";
import { FaAndroid, FaApple } from "react-icons/fa";
import QRCode from "qrcode";
import sharp from "sharp";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { IQWIRECALCULATOR_APP_PATH } from "@/lib/iqwirecalculator-marketing";

const QR_SIZE = 640;
const LOGO_RATIO = 0.2;
const LOGO_PAD = 10;
const LOGO_RADIUS = 22;

async function qrWithCenterLogo(appUrl) {
  const qrBuf = await QRCode.toBuffer(appUrl, {
    type: "png",
    width: QR_SIZE,
    margin: 2,
    color: { dark: "#1f1c1a", light: "#ffffff" },
    errorCorrectionLevel: "H",
  });

  const logoSize = Math.round(QR_SIZE * LOGO_RATIO);
  const box = logoSize + LOGO_PAD * 2;
  const logoPath = path.join(process.cwd(), "public", "apple-touch-icon.png");

  const padSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${box}" height="${box}"><rect x="0" y="0" width="${box}" height="${box}" rx="${LOGO_RADIUS}" ry="${LOGO_RADIUS}" fill="#ffffff"/></svg>`
  );
  const maskSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${logoSize}" height="${logoSize}"><rect x="0" y="0" width="${logoSize}" height="${logoSize}" rx="${Math.round(LOGO_RADIUS * 0.7)}" ry="${Math.round(LOGO_RADIUS * 0.7)}" fill="#ffffff"/></svg>`
  );

  const roundedLogo = await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: "cover" })
    .composite([{ input: maskSvg, blend: "dest-in" }])
    .png()
    .toBuffer();

  const badge = await sharp(padSvg)
    .composite([{ input: roundedLogo, left: LOGO_PAD, top: LOGO_PAD }])
    .png()
    .toBuffer();

  const left = Math.round((QR_SIZE - box) / 2);
  const composed = await sharp(qrBuf)
    .composite([{ input: badge, left, top: left }])
    .png()
    .toBuffer();

  return `data:image/png;base64,${composed.toString("base64")}`;
}

export default async function IqwirePwaInstall({ headingId = "install-heading" }) {
  const site = getPublicSiteUrl().replace(/\/$/, "");
  const appUrl = `${site}${IQWIRECALCULATOR_APP_PATH}`;
  const qr = await qrWithCenterLogo(appUrl);

  return (
    <section className="border-b border-border bg-card py-12 sm:py-16" aria-labelledby={headingId}>
      <div className="mx-auto grid max-w-[86.4rem] items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <h2 id={headingId} className="text-2xl font-bold tracking-tight text-title sm:text-3xl">
            Scan to open the app on your phone
          </h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-secondary">
            Point your camera at the QR code. It opens IQWireCalculator in your browser. Then add it to your home
            screen so it launches like a native app.
          </p>
          <ol className="mt-6 space-y-4">
            <li className="rounded-2xl border border-border bg-bg p-4">
              <p className="flex items-center gap-2.5 text-sm font-semibold text-title">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                  <FaApple className="h-5 w-5" aria-hidden />
                </span>
                iPhone (Safari)
              </p>
              <p className="mt-1 text-sm leading-relaxed text-secondary">
                Open the app URL. Tap the Share button. Tap Add to Home Screen. Tap Add. The IQWireCalculator icon
                appears on your home screen.
              </p>
            </li>
            <li className="rounded-2xl border border-border bg-bg p-4">
              <p className="flex items-center gap-2.5 text-sm font-semibold text-title">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                  <FaAndroid className="h-5 w-5 text-[#3DDC84]" aria-hidden />
                </span>
                Android (Chrome)
              </p>
              <p className="mt-1 text-sm leading-relaxed text-secondary">
                Open the app URL. Tap the menu (three dots). Tap Install app or Add to Home Screen. Confirm. Launch it
                from your app drawer or home screen.
              </p>
            </li>
          </ol>
          <p className="mt-4 text-sm text-secondary">
            Direct link:{" "}
            <a href={appUrl} className="font-medium text-primary hover:underline">
              {appUrl}
            </a>
          </p>
        </div>
        <div className="flex justify-center lg:justify-end">
          <figure className="rounded-2xl border border-border bg-bg p-6 text-center sm:p-8">
            <img
              src={qr}
              alt={`QR code that opens ${appUrl}`}
              width={400}
              height={400}
              className="mx-auto h-72 w-72 sm:h-80 sm:w-80 lg:h-96 lg:w-96"
            />
            <figcaption className="mt-4 text-sm text-secondary">Scan to open IQWireCalculator</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
