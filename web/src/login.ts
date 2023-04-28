import "./css/style.css";
import { handleGoogleSignIn } from "./scripts/utils";

function createLoginButton() {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = (e) => {
        google.accounts.id.initialize({
            client_id: import.meta.env.VITE_CLIENT_ID,
            callback: handleGoogleSignIn,
        });
        google.accounts.id.prompt();
        google.accounts.id.renderButton(
            document.querySelector(".signin-button"),
            {
                type: "standard",
                shape: "circle",
            }
        );
        google.accounts.id.disableAutoSelect();
    };
    script.onerror = (e) => console.log(e);

    const loginWrapper = document.querySelector(
        ".login-wrapper"
    ) as HTMLDivElement;
    loginWrapper.append(script);
    // loginWrapper.style.display = "initial";
    loginWrapper.hidden = false;
}
createLoginButton();
