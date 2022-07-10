"use strict";
const buildApplet = (root, storage) => {
    const applet = new Applet(root);
    try {
        const stored = JSON.parse(storage);
        if (stored) {
            applet.state = stored;
        }
    }
    catch (e) {
        console.warn(e);
    }
    return applet;
};
const runHooks = () => {
    const storage = localStorage.getItem("stored-cycles") || "";
    for (const root of document.getElementsByClassName("applet")) {
        const applet = buildApplet(root, storage);
    }
    ;
};
document.addEventListener("DOMContentLoaded", runHooks);
//# sourceMappingURL=core.js.map