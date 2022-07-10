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
	root: HTMLInputElement;

	constructor(root: HTMLInputElement, rhsVal: string) {
		super();
		this.root = root;
		this.root.value = rhsVal;
		hookEmpty(this.root, () => this.delete());
		propagateChange(this.root, this);
	}

	set state(state: string) {
		this.root.value = state;
	}
	get state() {
		return this.root.value;
	}

	delete() {
		this.dispatchEvent(new Event("remove"));
		this.root.remove();
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
		this.lhs = builder("input").clazz("lhs-input").onto(root) as HTMLInputElement;
		hookEmpty(this.lhs, () => this.delete());
		propagateChange(this.lhs, this);
		this.lhs.value = lhsVal;
		builder(root).text(" depends on ");
		this.rhsRoot = builder("span").clazz("row-container").onto(root);
		this.rhs = [];
		this.add = builder("input").clazz("rhs-input", "new-rhs-input").onto(root) as HTMLInputElement;
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
		this.remove = builder("button").clazz("glyphicon", "glyphicon-remove").onto(root) as HTMLButtonElement;
		this.remove.addEventListener("click", () => this.delete());
	}

	addRhs(rhsVal: string) {
		const base = builder("input").clazz("rhs-input", "filled-rhs-input").onto(this.rhsRoot) as HTMLInputElement;
		const rhs = new GraphSrc(base, rhsVal);
		hookRemove(rhs, this.rhs);
		propagateChange(rhs, this);
		this.rhs.push(rhs);
		this.add.value = "";
		this.dispatchEvent(new Event("change"));
		return rhs;
	}

	set state(state: any) {
		if (!(state instanceof Array)) return;

		for (const row of Array.from(this.rhs)) {
			row.delete();
		}
		this.add.value = "";

		for (const st of state) {
			if (typeof st !== "string" || !st.length) continue;
			const sink = this.addRhs(st);
		}
	}
	get state() {
		return {lhs: this.lhs.value, rhs: this.rhs.map(x => x.state)};
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

	constructor(root: HTMLElement) {
		super();
		this.root = root;
		//this.sort = builder("button").clazz("glyphicon", "glyphicon-sort-by-attributes").onto(root) as HTMLButtonElement;
		this.rowRoot = builder("div").clazz("graph-rows").onto(root);
		this.add = builder("input").clazz("lhs-input").attr("placeholder", "Theorem").onto(root) as HTMLInputElement;
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
		this.rows = [];
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
		this.body = builder("ul").clazz("report-body").onto(root);
	}
	update(input: GraphInput) {
		const graph = toGraph(input);
		console.log(graph);
		const [success, report] = analyzeGraph(graph);
		while (this.body.firstChild) {
			this.body.removeChild(this.body.firstChild);
		}
		if (success) {
			this.root.classList.remove("bad-report");
			this.root.classList.add("ok-report");
			this.header.innerText = "NO CYCLES FOUND";
			const [axioms, toposort] = report;
			const axSet = new Set(axioms);
			const thms = toposort.filter(x => !axSet.has(x));
			if (axioms.length) {
				builder("li").text(`${thms.length} proof(s), ${axioms.length} axiom(s).`).onto(this.body);
				const axBuild = builder("ul");
				for (const axiom of axioms) {
					axBuild.child(builder("li").text(axiom));
				}
				builder("details").attr("open", "true")
					.child(builder("summary").text("List of axioms:"))
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
			builder("li").text(`${report.length} cycle(s) detected:`).onto(this.body);
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
		this.timeout = setTimeout(() => this.trigger());
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
