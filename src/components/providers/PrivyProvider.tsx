"use client";

import { PrivyProvider as Privy } from "@privy-io/react-auth";

export function PrivyProvider({ children }: { children: React.ReactNode }) {
    return (
        <Privy
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
            config={{
                appearance: {
                    theme: "dark",
                    accentColor: "#7C3AED",
                    logo: "/logo.png",
                },
                loginMethods: ["email", "google", "apple"],
                embeddedWallets: {
                    createOnLogin: "off",
                },
            }}
        >
            {children}
        </Privy>
    );
}
