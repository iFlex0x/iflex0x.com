import { renderSVG } from "uqr";

export function qrSvg(text: string): string {
    return renderSVG(text, {
        ecc: "M",
        border: 2,
        pixelSize: 1,
        whiteColor: "#ffffff",
        blackColor: "#000000",
    }).replace(
        "<svg ",
        '<svg class="qr" role="img" aria-label="PayPal QR code" shape-rendering="crispEdges" ',
    );
}
