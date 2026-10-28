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

/**
 * What Pokket asks to be allowed to do: everything, at lok and at every service
 * (as Orkestrator does).
 *
 * Each service declares one scope that grants all it offers (`<service>_all`); lok grants
 * the ones the organization has and skips the rest, so this list works on any hub.
 * Narrow it to what the app actually calls once its clients say what they need.
 */
export const ALL_SCOPES = [
    "openid",
    "lok_all",
    "alpaka_all",
    "bank_all",
    "dokuments_all",
    "elektro_all",
    "fluss_all",
    "kabinet_all",
    "kraph_all",
    "kuvert_all",
    "lokate_all",
    "lovekit_all",
    "mikro_all",
    "omero_ark_all",
    "rekuest_all",
];

export const manifest: Manifest = {
    version: "0.0.1",
    identifier: "live.arkitekt.docs",
    scopes: ALL_SCOPES,
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