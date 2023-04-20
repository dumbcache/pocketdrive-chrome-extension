import { Route, Routes, useLoaderData, useParams } from "react-router-dom";
import Dir from "./Dir";
import File from "./File";

const dirsUrl = (parent) =>
    `https://www.googleapis.com/drive/v3/files?q='${parent}' in parents and mimeType = 'application/vnd.google-apps.folder'&fields=files(id,name,mimeType,appProperties,parents,hasThumbnail,thumbnailLink,createdTime,modifiedTime)`;
const filesUrl = (parent) =>
    `https://www.googleapis.com/drive/v3/files?q='${parent}' in parents and mimeType contains 'image/'&fields=files(id,name,mimeType,appProperties,parents,hasThumbnail,thumbnailLink,createdTime,modifiedTime)`;

async function getData(parent) {
    const token = window.localStorage.getItem("token");
    let dirReq = await fetch(dirsUrl(parent), {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    let fileReq = await fetch(filesUrl(parent), {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    let { files: dirs } = await dirReq.json();
    let { files } = await fileReq.json();
    return { files, dirs };
}

export async function loader({ params }) {
    if (params.id !== "home") {
        return await getData(params.id);
    }
    const root = import.meta.env.VITE_ROOT;
    return await getData(root);
}

export default function Template() {
    const { dirs, files } = useLoaderData();
    console.log(dirs, files);
    return (
        <>
            <Dir dirs={dirs} />
            <File files={files} />
        </>
    );
}
