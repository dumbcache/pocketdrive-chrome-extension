export function initTouchEvents() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    const preview = document.querySelector(".preview") as HTMLDivElement;

    function checkDirection() {
        if (
            Math.abs(touchStartX - touchEndX) > 30 ||
            Math.abs(touchStartY - touchEndY) > 30
        ) {
            console.log("x", touchStartX, touchEndX);
            console.log("y", touchStartY, touchEndY);
            if (touchStartX > touchEndX) {
                console.log("swipe left");
            }
            if (touchStartX < touchEndX) {
                console.log("swipe right");
            }
            if (touchStartY < touchEndY) {
                console.log("swipe down");
                preview.hidden = true;
            }
            if (touchStartY > touchEndY) {
                console.log("swipe up");
            }
        }
    }
    preview.addEventListener("touchstart", (e) => {
        e.stopPropagation();
        e.preventDefault();
        if ((e.target as HTMLImageElement).classList.contains("preview-img")) {
            if (e.changedTouches.length === 0) return;
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }
    });
    preview.addEventListener("touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if ((e.target as HTMLImageElement).classList.contains("preview-img")) {
            if (e.changedTouches.length === 0) return;
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            checkDirection();
        }
    });
}
