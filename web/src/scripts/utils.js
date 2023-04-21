import { useNavigate } from "react-router-dom";

export const loadScript = (handler) => {
    const src = "https://accounts.google.com/gsi/client";
    const script = document.createElement("script");
    script.src = src;
    script.onload = handler;
    script.onerror = console.log;
    document.body.appendChild(script);
};

export const handleGoogleSignIn = async (res) => {
    const creds = res?.credential;
    const api = import.meta.env.VITE_API;
    const req = await fetch(`${api}/login`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({ id_token: creds, app: "WEB" }),
    });
    if (req.status !== 200) {
        console.log(req.status, await req.text());
        return;
    }
    const { token, root } = await req.json();
    localStorage.setItem("secret", token);
    localStorage.setItem("root", root);
    getToken(token);
};

export const getToken = async (secret) => {
    const api = import.meta.env.VITE_API;
    const req = await fetch(`${api}/auth`, {
        headers: {
            Authorization: `Bearer ${secret}`,
        },
    });
    if (req.status !== 200) {
        if (req.status === 401) {
            console.log("session timeout. Logging off");
            const navigate = useNavigate();
            navigate("/");
            return;
        }
        console.log(req.status, await req.text());
        return;
    }
    const { token } = await req.json();
    localStorage.setItem("token", token);
};
