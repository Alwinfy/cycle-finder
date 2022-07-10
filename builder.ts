class Builder {
	body: HTMLElement;

	constructor(name: string | HTMLElement) {
		this.body = name instanceof HTMLElement ? name : document.createElement(name);
	}

	text(...texts: string[]) {
		for (const text of texts) {
			this.body.appendChild(document.createTextNode(text));
		}
		return this;
	}
	grokChild(child: string | HTMLElement | Builder) {
		if (typeof child === "string") {
			return document.createTextNode(child);
		}
		if (child instanceof Builder) {
			return child.build();
		}
		return child;
	}
	child(...children: (string | HTMLElement | Builder)[]) {
		for (const child of children) {
			this.body.appendChild(this.grokChild(child));
		}
		return this;
	}
	build() {
		return this.body;
	}
	clazz(...classes: string[]) {
		for (const clazz of classes) {
			this.body.classList.add(clazz);
		}
		return this;
	}
	attr(key: string, value: string) {
		(this.body as any)[key] = value;
		return this;
	}
	onto(parent: HTMLElement) {
		parent.appendChild(this.body);
		return this.body;
	}
}

const builder = (name: string | HTMLElement) => new Builder(name);
