const propChange = (input: HTMLInputElement, onChange: (text: string, ev: Event) => void) => {
	input.addEventListener("change", ev => {
		const val = input.value;
		if (val.length) {
			onChange(val, ev);
		}
	});
};

const hookRemove = <T extends EventTarget>(base: T, array: T[]) => {
	base.addEventListener("remove", () => {
		const ix = array.indexOf(base);
		if (~ix) {
			array.splice(ix, 1);
		}
	});
};
const hookEmpty = (base: HTMLInputElement, cb: () => void) => {
	base.addEventListener("change", () => {
		const val = base.value;
		if (!val.length) {	
			cb();
		}
	});
};
const propagateChange = (child: EventTarget, parent: EventTarget) => {
	child.addEventListener("change", ev => parent.dispatchEvent(new Event("change")));
}

class GraphSrc extends EventTarget {
	root: HTMLElement;
	input: HTMLInputElement;

	constructor(root: HTMLElement, rhsVal: string) {
		super();
		this.root = root;
		this.input = builder("input").clazz("form-control", "rhs-input", "filled-rhs-input").onto(root) as HTMLInputElement;
		builder(root).text(", ");
		this.input.value = rhsVal;
		hookEmpty(this.input, () => this.delete());
		propagateChange(this.root, this);
	}

	set state(state: string) {
		this.input.value = state;
	}
	get state() {
		return this.input.value.trim();
	}

	delete() {
		this.dispatchEvent(new Event("remove"));
		this.input.nextSibling!.remove();
		this.input.remove();
		this.dispatchEvent(new Event("change"));
	}
}

class GraphSink extends EventTarget {
	root: HTMLElement;
	lhs: HTMLInputElement;
	rhsRoot: HTMLElement;
	rhs: GraphSrc[];
	add: HTMLInputElement;
	remove: HTMLButtonElement;

	constructor(root: HTMLElement, lhsVal: string) {
		super();
		this.root = root;
		this.lhs = builder("input").clazz("lhs-input", "form-control").onto(root) as HTMLInputElement;
		hookEmpty(this.lhs, () => this.delete());
		propagateChange(this.lhs, this);
		this.lhs.value = lhsVal;
		builder(root).text(" depends on ");
		this.rhsRoot = builder("span").clazz("row-container").onto(root);
		this.rhs = [];
		this.add = builder("input").clazz("rhs-input", "new-rhs-input", "form-control").onto(root) as HTMLInputElement;
		propChange(this.add, rhsVal => this.addRhs(rhsVal));
		this.add.addEventListener("beforeinput", e => {
			const keys = e.data;
			if (!keys) return;
			if (keys.includes(";") || keys.includes(" ") || keys.includes(",")) {
				const val = this.add.value;
				if (val.length) {
					const rhs = this.addRhs(val);
				}
				e.preventDefault();
			}
		});
		builder(root).text(" ");
		this.remove = builder("button").clazz("btn", "btn-default", "glyphicon", "glyphicon-trash").onto(root) as HTMLButtonElement;
		this.remove.addEventListener("click", () => {
			if (this.rhs.length) {
				this.state = [];
			} else {
				this.delete();
			}
		});
	}

	addRhs(rhsVal: string) {
		const rhs = new GraphSrc(this.rhsRoot, rhsVal);
		hookRemove(rhs, this.rhs);
		propagateChange(rhs, this);
		this.rhs.push(rhs);
		this.add.value = "";
		this.dispatchEvent(new Event("change"));
		console.log("after add", this.rhs);
		console.log(this.rhsRoot);
		return rhs;
	}

	set state(state: any) {
		if (!(state instanceof Array)) return;

		for (const row of Array.from(this.rhs)) {
			row.delete();
		}
		console.log(this.rhs);
		console.log(this.rhsRoot);
		this.add.value = "";

		for (const st of state) {
			if (typeof st !== "string" || !st.length) continue;
			const sink = this.addRhs(st);
		}
	}
	get state() {
		return {lhs: this.lhs.value.trim(), rhs: this.rhs.map(x => x.state)};
	}

	delete() {
		this.dispatchEvent(new Event("remove"));
		this.root.remove();
		this.dispatchEvent(new Event("change"));
	}
}

class GraphInput extends EventTarget {
	root: HTMLElement;
	//sort: HTMLButtonElement;
	rowRoot: HTMLElement;
	rows: GraphSink[];
	add: HTMLInputElement;
	clear: HTMLButtonElement;
	copy: HTMLButtonElement;
	paste: HTMLButtonElement;
	pasteHelper: HTMLInputElement;

	constructor(root: HTMLElement) {
		super();
		this.root = root;
		//this.sort = builder("button").clazz("glyphicon", "glyphicon-sort-by-attributes").onto(root) as HTMLButtonElement;
		this.rowRoot = builder("div").clazz("graph-rows").onto(root);
		this.add = builder("input").clazz("lhs-input", "form-control").attr("placeholder", "Theorem").onto(root) as HTMLInputElement;
		this.add.addEventListener("beforeinput", e => {
			const keys = e.data;
			if (!keys) return;
			if (keys.includes(":") || keys.includes(";") || keys.includes(" ")) {
				const val = this.add.value;
				if (val.length) {
					const sink = this.addSink(val);
					sink.add.focus();
				}
				e.preventDefault();
			}
		});
		propChange(this.add, addVal => this.addSink(addVal));
		builder(root).text(" ");
		this.clear = builder("button").clazz("btn", "btn-default", "glyphicon", "glyphicon-remove").onto(root) as HTMLButtonElement;
		this.clear.addEventListener("click", () => {
			if (confirm("This will clear everything! Are you sure?")) {
				this.state = [];
			}
		});
		this.rows = [];
		builder("br").onto(root);
		builder("br").onto(root);

		this.pasteHelper = builder("input").clazz("form-control").attr("placeholder", "Save/load a theorem list").onto(root) as HTMLInputElement;
		builder(root).text(" ");
		this.copy = builder("button").clazz("btn", "btn-default", "glyphicon", "glyphicon-save").onto(root) as HTMLButtonElement;
		this.copy.addEventListener("click", ev => {
			const state = JSON.stringify(this.state);
			this.pasteHelper.value = state;
			navigator.clipboard.writeText(state);
		});
		builder(root).text(" ");
		this.paste = builder("button").clazz("btn", "btn-default", "glyphicon", "glyphicon-open").onto(root) as HTMLButtonElement;
		this.paste.addEventListener("click", ev => {
			const str = this.pasteHelper.value;
			if (!str.length) return;
			try {
				const stored = JSON.parse(str);
				if (stored) {
					this.state = stored;
				}
			} catch (e) {
				console.warn(e);
			}
		});
	}

	addSink(addVal: string) {
		const base = builder("div").clazz("sink-container").onto(this.rowRoot);
		const sink = new GraphSink(base, addVal);
		this.rows.push(sink);
		hookRemove(sink, this.rows);
		propagateChange(sink, this);
		this.add.value = "";
		this.dispatchEvent(new Event("change"));
		return sink;
	}

	set state(state: any) {
		if (!(state instanceof Array)) return;

		for (const row of Array.from(this.rows)) {
			row.delete();
		}
		this.add.value = "";

		for (const st of state) {
			if (!("lhs" in st)) continue;
			if (!("rhs" in st)) continue;
			const lhs = st.lhs;
			if (typeof lhs !== "string") continue;
			if (!lhs.length) continue;
			const sink = this.addSink(lhs);
			sink.state = st.rhs;
		}
	}
	get state() {
		return this.rows.map(row => row.state);
	}
}

class GraphOutput {
	root: HTMLElement;
	header: HTMLElement;
	body: HTMLElement;
	constructor(root: HTMLElement) {
		this.root = root;
		this.header = builder("h2").clazz("report-header").onto(root);
		this.body = builder("div").clazz("report-body").onto(root);
	}
	update(input: GraphInput) {
		const graph = toGraph(input);
		const [success, report] = analyzeGraph(graph);
		while (this.body.firstChild) {
			this.body.removeChild(this.body.firstChild);
		}
		const plur = (x: number, s: string) => x === 1 ? s : (s + "s");
		if (success) {
			this.root.classList.remove("bad-report");
			this.root.classList.add("ok-report");
			this.header.innerText = "NO CYCLES FOUND";
			const [axioms, toposort] = report;
			const axSet = new Set(axioms);
			const implicitAxia = new Set(axioms.filter(x => !graph.graph.has(x)));
			const thms = toposort.filter(x => !axSet.has(x));
			builder("p").text(`${thms.length} ${plur(thms.length, "proof")}, ${axioms.length} ${plur(axioms.length, "axiom")} (${implicitAxia.size} implicit).`).onto(this.body);
			if (axioms.length) {
				const axBuild = builder("ul");
				for (const axiom of axioms) {
					if (implicitAxia.has(axiom)) {
						axBuild.child(builder("li").child(builder("u").text(axiom)));
					} else {
						axBuild.child(builder("li").text(axiom));
					}
				}
				builder("details").attr("open", "true")
					.child(builder("summary").text("List of axioms (").child(builder("u").text("underlined")).text(" are implicitly declared):"))
					.child(axBuild).onto(this.body);
			}
			if (thms.length) {
				const sortBuild = builder("ul");
				for (const thm of toposort) {
					if (axioms.indexOf(thm) === -1) {
						sortBuild.child(builder("li").text(thm));
					}
				}
				builder("details").attr("open", "true")
					.child(builder("summary").text("One possible writeup order:"))
					.child(sortBuild).onto(this.body);
			}
		} else {
			this.root.classList.remove("ok-report");
			this.root.classList.add("bad-report");
			this.header.innerText = "CYCLES DETECTED";
			builder("p").text(`${report.length} ${plur(report.length, "cycle")} detected:`).onto(this.body);
			const cycles = builder("ul");
			for (const cycle of report) {
				cycles.child(builder("li").text(cycle.join(" \u2192 ")));
			}
			cycles.onto(this.body);
		}
	}
}

class QueueJoin {
	timeout: ReturnType<typeof setTimeout> | null;
	cb: () => void;

	constructor(cb: () => void) {
		this.cb = cb;
		this.timeout = null;
	}
	set() {
		this.timeout = setTimeout(() => this.trigger(), 100);
	}
	trigger() {
		this.clear();
		this.cb();
	}
	clear() {
		this.timeout = null;
	}
}

class Applet {
	root: HTMLElement;
	input: GraphInput;
	output: GraphOutput;
	qj: QueueJoin;

	constructor(root: HTMLElement) {
		this.root = root;
		const input = root.querySelector(".deps-input")! as HTMLElement;
		this.input = new GraphInput(builder("div").clazz("input-root").onto(input));
		const output = root.querySelector(".deps-output")! as HTMLElement;
		this.output = new GraphOutput(builder("div").clazz("output-root").onto(output));
		this.qj = new QueueJoin(() => this.writeState());
		this.input.addEventListener("change", () => this.qj.set());
		this.output.update(this.input);
	}

	writeState() {
		localStorage.setItem("stored-cycles", JSON.stringify(this.state));
		this.output.update(this.input);
	}

	set state(state: any) {
		if (!(state instanceof Object)) return;
		if ("input" in state) {
			this.input.state = state.input;
		}
	}
	get state() {
		return {input: this.input.state};
	}
}
