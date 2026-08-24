import { Theme } from "expo-router/react-navigation";
import { Manifest } from "./arkitekt/fakts/manifestSchema";
import { buildBrandTokens } from "./theme/brandTokens";

/**
 * react-navigation's chrome (stack header, tab bar) is styled from a plain JS
 * object, not from CSS variables — `vars()` cannot reach it. So the nav theme
 * is built from the SAME token table as everything else, and rebuilt whenever
 * the brand changes; see lib/theme/BrandProvider.tsx.
 */
export const buildNavTheme = (
    hue?: number,
    chroma?: number,
): Theme["colors"] => {
    const t = buildBrandTokens(hue, chroma);
    const hsl = (token: string) => `hsl(${t[token]})`;

    return {
        background: hsl("--background"),
        border: hsl("--border"),
        card: hsl("--card"),
        notification: hsl("--destructive"),
        primary: hsl("--primary"),
        text: hsl("--foreground"),
    };
};

export const manifest: Manifest = {
    version: "0.0.1",
    identifier: "live.arkitekt.docs",
    scopes: ["openid"],
    requirements: [
        {
            key: "lok",
            service: "live.arkitekt.lok",
        },
        {
            key: "rekuest",
            service: "live.arkitekt.rekuest",
            optional: false,
        },
        {
            key: "mikro",
            service: "live.arkitekt.mikro",
            optional: false,
        },
        {
            key: "fluss",
            service: "live.arkitekt.fluss",
            optional: false,
        },
        {
            key: "kabinet",
            service: "live.arkitekt.kabinet",
            optional: true,
        },
        {
            key: "datalayer",
            service: "live.arkitekt.datalayer",
            optional: false,
        },
        {
            key: "livekit",
            service: "io.livekit.livekit",
            optional: false,
        },
        {
            key: "omero_ark",
            service: "live.arkitekt.omero_ark",
            optional: true,
        },
    ],
};