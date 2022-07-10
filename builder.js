"use strict";
class Builder {
    constructor(name) {
        this.body = name instanceof HTMLElement ? name : document.createElement(name);
    }
    text(...texts) {
        for (const text of texts) {
            this.body.appendChild(document.createTextNode(text));
        }
        return this;
    }
    grokChild(child) {
        if (typeof child === "string") {
            return document.createTextNode(child);
        }
        if (child instanceof Builder) {
            return child.build();
        }
        return child;
    }
    child(...children) {
        for (const child of children) {
            this.body.appendChild(this.grokChild(child));
        }
        return this;
    }
    build() {
        return this.body;
    }
    clazz(...classes) {
        for (const clazz of classes) {
            this.body.classList.add(clazz);
        }
        return this;
    }
    attr(key, value) {
        this.body[key] = value;
        return this;
    }
    onto(parent) {
        parent.appendChild(this.body);
        return this.body;
    }
}
const builder = (name) => new Builder(name);
//# sourceMappingURL=builder.js.map