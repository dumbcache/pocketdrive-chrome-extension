import type { GoogleFile, GoogleFileRes } from "../types";
import LinkButton from "../assets/link.svg";

export function createElement<T extends HTMLElement>(
    type: string,
    attributes: [string, string][] = [],
    ...childNodes: HTMLElement[] | string[]
): T {
    const ele = document.createElement(type) as T;
    for (let [key, val] of attributes) {
        ele.setAttribute(key, val);
    }
    childNodes.length !== 0 && ele.append(...childNodes);
    return ele;
}

function anchorHandler(e: Event) {
    const { id, name } = (e.currentTarget as HTMLAnchorElement).dataset;
    history.pushState({ dir: name, id }, "", id);
    window.dispatchEvent(new Event("locationchange"));
}

export function createDir(file: GoogleFile, worker: Worker): HTMLDivElement {
    const token = window.localStorage.getItem("token")!;
    worker.postMessage({
        context: "FETCH_FILES_COVER",
        parent: file.id,
        token,
    });
    const cover = createElement<HTMLDivElement>("div", [
        ["class", "cover"],
        ["data-parent", file.id],
    ]);
    const title = createElement("h2", [["class", "dir-title"]], file.name);
    const anchor = createElement<HTMLAnchorElement>("a", [
        ["href", "javascript:void(0)"],
        ["data-id", file.id],
        ["data-name", file.name],
    ]);
    anchor.onclick = anchorHandler;
    anchor.append(cover);
    const div = createElement<HTMLDivElement>(
        "div",
        [["class", "dir"]],
        anchor,
        title
    );
    return div;
}

export function createImg(
    file: GoogleFile,
    className: string = ""
): HTMLDivElement {
    const frag = createElement<HTMLDivElement>("div", [["class", "img-card"]]);
    const img = createElement<HTMLImageElement>("img", [
        ["src", file.thumbnailLink!],
        ["class", className],
        ["referrerpolicy", "no-referrer"],
        ["data-id", file.id],
        ["loading", "lazy"],
        ["height", "200"],
        ["width", "200"],
    ]);
    frag.append(img);
    if (file.appProperties?.origin) {
        const linkImg = createElement("img", [["src", LinkButton]]);
        const link = createElement(
            "a",
            [
                ["target", "_blank"],
                ["class", "img-link"],
                ["href", file.appProperties.origin],
                ["rel", "noopener noreferrer nofollow"],
            ],
            linkImg
        );
        frag.append(link);
    }
    return frag;
}

export function updateCoverPics(id: string, imgs: GoogleFileRes) {
    const cover = document.querySelector(
        `[data-parent='${id}']`
    ) as HTMLDivElement;
    cover.innerHTML = "";
    if (cover) {
        for (let img of imgs.files) {
            const coverPic = createElement("img", [
                ["src", img.thumbnailLink!],
                ["referrerpolicy", "no-referrer"],
            ]);
            cover.append(coverPic);
        }
    }
}

export function previewCloseHandler() {
    const preview = document.querySelector(".preview") as HTMLDivElement;
    const previewClose = document.querySelector(
        ".preview-close"
    ) as HTMLDivElement;
    preview.hidden = true;
    previewClose.removeEventListener("click", previewCloseHandler);
}

export function togglePreview() {
    const preview = document.querySelector(".preview") as HTMLDivElement;
    const previewClose = document.querySelector(
        ".preview-close"
    ) as HTMLDivElement;
    preview.hidden = false;
    previewClose.addEventListener("click", previewCloseHandler);
}

function generateDirs(files: GoogleFile[], worker: Worker) {
    const dirsEle = document.querySelector(".dirs") as HTMLDivElement;
    dirsEle.innerHTML = "";
    for (let dir of files) {
        const folder = createDir(dir, worker);
        dirsEle?.append(folder);
    }
}
function generateImgs(files: GoogleFile[]) {
    const imgsEle = document.querySelector(".imgs") as HTMLDivElement;
    imgsEle.innerHTML = "";
    for (let img of files) {
        const pic = createImg(img, "img");
        imgsEle?.append(pic);
    }
}

export async function crateMaincontent(
    files: [dirs: GoogleFileRes, imgs: GoogleFileRes],
    worker: Worker
) {
    const [dirs, imgs] = files;

    generateDirs(dirs.files, worker);
    generateImgs(imgs.files);
}
