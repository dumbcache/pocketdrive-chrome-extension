import { useEffect, useRef } from "react";
import { handleGoogleSignIn, loadScript } from "../scripts/utils";

const Login = () => {
    const signInButton = useRef(null);
    useEffect(() => {
        loadScript(() => {
            const CLIENT_ID = import.meta.env.VITE_CLIENT_ID;
            google.accounts.id.initialize({
                client_id: CLIENT_ID,
                nonce: import.meta.env.VITE_NONCE,
                callback: handleGoogleSignIn,
            });
            google.accounts.id.renderButton(signInButton.current, {
                theme: "outline",
                size: "medium",
                text: "signin",
            });
            // google.accounts.id.prompt();
            google.accounts.id.disableAutoSelect();
        });
    });
    return (
        <button className="login" ref={signInButton}>
            Sign in using Google
        </button>
    );
};

export default Login;
