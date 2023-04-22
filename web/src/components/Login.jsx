import { Link } from "react-router-dom";
import { useContext, useEffect, useRef, useState } from "react";
import {
    LoginContext,
    handleGoogleSignIn,
    loadScript,
    logoutHandler,
} from "../scripts/utils";

const Login = () => {
    const { loggedIn, setLoggedIn } = useContext(LoginContext);
    const signInButton = useRef(null);
    useEffect(() => {
        loadScript(() => {
            const CLIENT_ID = import.meta.env.VITE_CLIENT_ID;
            google.accounts.id.initialize({
                client_id: CLIENT_ID,
                nonce: import.meta.env.VITE_NONCE,
                callback: (res) => handleGoogleSignIn(res, setLoggedIn),
            });
            google.accounts.id.renderButton(signInButton.current, {
                theme: "outline",
                size: "medium",
                text: "signin",
            });
            // google.accounts.id.prompt();
            google.accounts.id.disableAutoSelect();
            return () => {
                const gsiIfExists = document.querySelector(
                    `script[src='${src}']`
                );
                console.log(gsiIfExists);
            };
        }, []);
    });
    return (
        <aside className="menu">
            {loggedIn === false ? (
                <button className="child1" ref={signInButton} />
            ) : (
                <div className="child2">
                    <div>
                        <Link to="/d">Drive</Link>
                    </div>
                    <button
                        className="logout-button"
                        onClick={() => logoutHandler(setLoggedIn)}
                    >
                        Logout
                    </button>
                </div>
            )}
        </aside>
    );
};

export default Login;
