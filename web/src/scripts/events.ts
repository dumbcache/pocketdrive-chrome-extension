import { signUserOut, togglePreview } from "./utils";

export function initTouchEvents() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    const preview = document.querySelector(".preview") as HTMLDivElement;
    const header = document.querySelector(".header") as HTMLDivElement;

    function checkDirection(childWorker: Worker) {
        if (Math.abs(touchStartX - touchEndX) > 40) {
            //swipe left
            if (touchStartX > touchEndX) {
                previewChange("PREV", childWorker);
                return;
            }
            //swipe right
            if (touchStartX < touchEndX) {
                previewChange("NEXT", childWorker);
                return;
            }
        }
        if (Math.abs(touchStartY - touchEndY) > 40) {
            // swipe down
            if (touchStartY < touchEndY) {
                preview.hidden = true;
                return;
            }
            // swipe up
            if (touchStartY > touchEndY) {
                preview.hidden = true;
                return;
            }
        }
    }
    preview.addEventListener("touchstart", (e) => {
        e.stopPropagation();
        if ((e.target as HTMLImageElement).classList.contains("preview-img")) {
            if (e.changedTouches.length === 0) return;
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }
    });
    preview.addEventListener("touchend", (e) => {
        e.stopPropagation();
        if ((e.target as HTMLImageElement).classList.contains("preview-img")) {
            if (e.changedTouches.length === 0) return;
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            checkDirection();
        }
    });

    preview.addEventListener("touchmove", (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    header.addEventListener("click", () => {
        const main = document.querySelector(".main-wrapper") as HTMLDivElement;
        main.scrollTo(0, 0);
    });
}

export function initMenuEvents() {
    const refresh = document.querySelector(
        ".refresh-button"
    ) as HTMLButtonElement;
    const back = document.querySelector(".back-button") as HTMLButtonElement;
    const signoutButton = document.querySelector(
        ".signout-button"
    )! as HTMLDivElement;
    refresh.addEventListener("click", (e) => {
        e.stopPropagation();
        window.dispatchEvent(new Event("refresh"));
    });
    back.addEventListener("click", (e) => {
        e.stopPropagation();
        window.history.back();
    });
    signoutButton.addEventListener("click", signUserOut);
}

export function initPreviewClose() {
    const preview = document.querySelector(".preview") as HTMLDivElement;
    const previewClose = document.querySelector(
        ".preview-close"
    ) as HTMLDivElement;
    previewClose.addEventListener("click", () => {
        preview.hidden = true;
    });
}

export function initPreviewFull() {
    const preview = document.querySelector(".preview") as HTMLDivElement;
    const previewExpand = document.querySelector(
        ".preview-expand"
    ) as HTMLDivElement;
    previewExpand.addEventListener("click", () => {
        preview.classList.toggle("preview-full");
    });
}

export function previewChange(type: "PREV" | "NEXT", childWorker: Worker) {
    const previewImg = document.querySelector(
        ".preview-img"
    ) as HTMLImageElement;
    const imgs = document.querySelector(".imgs") as HTMLDivElement;
    const targetImg = imgs.querySelector(
        `[data-id='${previewImg.dataset.id}']`
    );
    const targetParent = targetImg?.parentElement;
    const latestParent =
        type === "NEXT"
            ? targetParent?.nextElementSibling
            : targetParent?.previousElementSibling;
    if (!latestParent) return;
    const latestImg = latestParent?.firstElementChild as HTMLImageElement;
    const latestId = latestImg.dataset.id;
    previewImg.src = latestImg.src;
    previewImg.dataset.id = latestId;
    if (latestImg.dataset.url) {
        previewImg.src = latestImg.dataset.url;
    } else {
        const token = window.localStorage.getItem("token")!;
        childWorker.postMessage({
            context: "FETCH_IMAGE",
            id: latestId,
            token,
        });
    }
}

export function initPreviewChange(childWorker: Worker) {
    const previewPrev = document.querySelector(
        ".preview-prev"
    ) as HTMLDivElement;
    const previewNext = document.querySelector(
        ".preview-next"
    ) as HTMLDivElement;
    previewPrev.onclick = () => previewChange("PREV", childWorker);
    previewNext.onclick = () => previewChange("NEXT", childWorker);
}

export function initPreviewEvents(childWorker: Worker) {
    initPreviewClose();
    initPreviewFull();
    initPreviewChange(childWorker);
}

function initImgEvents(childWorker: Worker) {
    const imgsEle = document.querySelector(".imgs") as HTMLDivElement;
    imgsEle?.addEventListener("click", async (e) => {
        const target = e.target as HTMLImageElement;
        if (!target.classList.contains("img")) return;
        const dataset = target.dataset;
        const previewImg = document.querySelector(
            ".preview-img"
        ) as HTMLImageElement;
        if (previewImg.dataset.id === dataset.id) {
            togglePreview(false);
            return;
        }
        previewImg.src = target.src;
        previewImg.dataset.id = target.dataset.id;
        togglePreview(false);
        if (dataset.url) {
            previewImg.src = dataset.url;
        } else {
            const token = window.localStorage.getItem("token")!;
            childWorker.postMessage({
                context: "FETCH_IMAGE",
                id: dataset.id,
                token,
            });
        }
    });
}

export function initMainEvents(childWorker: Worker) {
    initTouchEvents(childWorker);
    initImgEvents(childWorker);
    initPreviewEvents(childWorker);
}
