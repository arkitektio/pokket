import { Manifest } from "./arkitekt/fakts/manifestSchema";

export const NAV_THEME = {
    light: {
        background: 'hsl(0 0% 100%)', // background
        border: 'hsl(240 5.9% 90%)', // border
        card: 'hsl(0 0% 100%)', // card
        notification: 'hsl(0 84.2% 60.2%)', // destructive
        primary: 'hsla(240, 20%, 40%, 1.00)', // primary
        text: 'hsl(240 10% 3.9%)', // foreground
    },
    dark: {
        background: 'hsl(240 10% 3.9%)', // background
        border: 'hsl(240 3.7% 15.9%)', // border
        card: 'hsl(240 10% 3.9%)', // card
        notification: 'hsl(0 72% 51%)', // destructive
        primary: 'hsl(0 0% 98%)', // primary
        text: 'hsl(0 0% 98%)', // foreground
    },
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