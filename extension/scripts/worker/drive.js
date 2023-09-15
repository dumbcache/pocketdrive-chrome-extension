import { login, logout } from "./connection.js";
import { addtoLocalDirs, getToken } from "./utils.js";

export const GDRIVE = "https://www.googleapis.com/drive/v3/files";

export const fetchRootDir = async (token) => {
    const res = await fetch(
        `${GDRIVE}?&pageSize=1&fields=files(id,name)&orderBy=createdTime`,
        {
            headers: { authorization: `Bearer ${token}` },
        }
    );
    if (res.status !== 200) {
        if (res.status === 401) {
            login();
            return;
        }
    }
    const { files } = await res.json();
    if (files.length === 0) {
        const data = createRootDir(token);
        return { root: data.id };
    }
    return { root: files[0].id };
};

export const createRootDir = async (token) => {
    let req = await fetch(GDRIVE, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            name: "Pocket_#Drive",
            mimeType: "application/vnd.google-apps.folder",
            folderColorRgb: "#f83a22",
            description: "",
        }),
    });
    let { status, statusText } = req;
    let data = await req.json();
    if (status !== 200) {
        console.log(
            `error while creating root dir ${status} ${statusText}`,
            data
        );
        if (status === 401) {
            // login();
            return;
        }
    }
    const { active, roots } = await chrome.storage.local.get();
    roots[active] = data.id;
    await chrome.storage.local.set({ roots });
    return data;
};

export const fetchDirs = async (parent) => {
    const token = await getToken();
    const res = await fetch(
        `${GDRIVE}?q='${parent}' in parents and mimeType='application/vnd.google-apps.folder'&fields=files(name,id)&orderBy=name&pageSize=1000`,
        {
            headers: { Authorization: `Bearer ${token}` },
        }
    );
    if (res.status !== 200) {
        if (res.status === 401) {
            login();
            return;
        }
    }
    const { files } = await res.json();
    return { status: 200, data: files };
};

export const createDir = async (dirName, parents) => {
    const token = await getToken();
    const req = await fetch(GDRIVE, {
        method: "POST",
        headers: {
            "Content-Type": "applications/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            name: dirName.trim(),
            mimeType: "application/vnd.google-apps.folder",
            parents: [parents],
        }),
    });
    let { status, statusText } = req;
    if (status !== 200) {
        if (status === 401) {
            login();
            return;
        }
        throw new Error("error while creating dirs", {
            cause: `${status} ${statusText} ${await req.text()}`,
        });
    }
    const { id, name } = await req.json();
    addtoLocalDirs({ id, name }, parents);
    return { status, data: { id, name } };
};

export const createImgMetadata = async (imgMeta, token) => {
    const url =
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable";
    let req = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(imgMeta),
    });
    let { status, statusText } = req;
    if (status !== 200) {
        if (status === 401) {
            return;
        }

        console.log(`error while creatingImgMetaData ${status} ${statusText}`, {
            cause: await req.json(),
        });
        return;
    }
    return { location: req.headers.get("Location") };
};

export const uploadImg = async (location, imgData, mimeType) => {
    let req = await fetch(location, {
        method: "PUT",
        headers: {
            "Content-Type": mimeType,
        },
        body: imgData,
    });
    let { status, statusText } = req;
    let data = await req.json();
    if (status !== 200)
        if (status === 401) {
        }
    console.log(`error while uploadingImg ${status} ${statusText}`, {
        cause: data,
    });
    return { status, id: data.id };
};
