"use client";

import { PrivyProvider as Privy } from "@privy-io/react-auth";

export function PrivyProvider({ children }: { children: React.ReactNode }) {
    return (
        <Privy
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID && process.env.NEXT_PUBLIC_PRIVY_APP_ID !== "FILL_IN" ? process.env.NEXT_PUBLIC_PRIVY_APP_ID : "cmkkk59s100a0js0dv4k6na8k"}
            config={{
                appearance: {
                    theme: "dark",
                    accentColor: "#7C3AED",
                    landingHeader: "Sign in to TradeMind",
                    loginMessage: "Type your email, press Submit, then enter the 6 digit passcode we email you. No password.",
                },
                loginMethods: ["email", "google"],
            }}
        >
            {children}
        </Privy>
    );
}
