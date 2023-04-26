import "./css/style.css";
import { handleGoogleSignIn } from "./scripts/utils";

window.onGoogleLibraryLoad = (e) => {
    google.accounts.id.initialize({
        client_id: import.meta.env.VITE_CLIENT_ID,
        callback: handleGoogleSignIn,
    });
    google.accounts.id.prompt();
    google.accounts.id.renderButton(document.querySelector(".signin-button"), {
        type: "standard",
        shape: "circle",
    });
    google.accounts.id.disableAutoSelect();
};
