import { createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";

export const LoginContext = createContext();
export const dirsUrl = (parent) =>
    `https://www.googleapis.com/drive/v3/files?q='${parent}' in parents and mimeType = 'application/vnd.google-apps.folder'&fields=files(id,name,mimeType,appProperties,parents,hasThumbnail,thumbnailLink,createdTime,modifiedTime)`;
export const filesUrl = (parent) =>
    `https://www.googleapis.com/drive/v3/files?q='${parent}' in parents and mimeType contains 'image/'&fields=files(id,name,mimeType,appProperties,parents,hasThumbnail,thumbnailLink,createdTime,modifiedTime)`;
export const loadScript = (handler) => {
    const src = "https://accounts.google.com/gsi/client";
    const gsiIfExists = document.querySelector(`script[src='${src}']`);
    if (gsiIfExists) document.body.removeChild(gsiIfExists);
    const script = document.createElement("script");
    script.src = src;
    script.onload = handler;
    script.onerror = console.log;
    document.body.append(script);
};

export const handleGoogleSignIn = async (res, setLoggedIn) => {
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
        console.warn(req.status, await req.text());
        return;
    }
    const { token, root } = await req.json();
    localStorage.setItem("secret", token);
    localStorage.setItem("root", root);
    getToken();
    setLoggedIn(true);
};

export const getToken = async () => {
    const secret = window.localStorage.getItem("secret");
    const api = import.meta.env.VITE_API;
    const req = await fetch(`${api}/auth`, {
        headers: {
            Authorization: `Bearer ${secret}`,
        },
    });
    if (req.status !== 200) {
        if (req.status === 401) {
            console.log("session timeout. Logging off");
            return;
        }
        console.warn(req.status, await req.text());
        return;
    }
    const { token } = await req.json();
    localStorage.setItem("token", token);
};

export const logoutHandler = async (setLoggedIn) => {
    const api = import.meta.env.VITE_API;
    const secret = window.localStorage.getItem("secret");
    const req = await fetch(`${api}/auth`, {
        headers: {
            Authorization: `Bearer ${secret}`,
        },
    });
    if (req.status !== 200) {
        console.warn(req.status, await req.text());
        return;
    }
    window.localStorage.clear();
    setLoggedIn(false);
};

export async function getDirs(parent) {
    try {
        const token = window.localStorage.getItem("token");
        let req = await fetch(dirsUrl(parent), {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (req.status !== 200) {
            if (req.status === 401) {
                await getToken();
                return getDirs(parent);
            }
        }
        let { files } = await req.json();
        return { dirs: files };
    } catch (error) {
        console.warn(error);
    }
}

export async function getFiles(parent) {
    try {
        const token = window.localStorage.getItem("token");
        let req = await fetch(filesUrl(parent), {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (req.status !== 200) {
            if (req.status === 401) {
                await getToken();
                return getFiles(parent);
            }
        }
        let { files } = await req.json();
        return { files };
    } catch (error) {
        console.warn(error);
    }
}
