"use strict";
const toGraph = (input) => {
    const state = input.state;
    const map = new Map();
    const nodes = new Set();
    for (const { lhs, rhs } of state) {
        if (!map.has(lhs)) {
            map.set(lhs, new Set());
        }
        const set = map.get(lhs);
        nodes.add(lhs);
        for (const src of rhs) {
            set.add(src);
            nodes.add(src);
        }
    }
    return { graph: map, cover: nodes };
};
const remove = (graph, node) => {
    const newSet = new Set(graph.cover);
    newSet.delete(node);
    const newGraph = {
        graph: graph.graph,
        set: newSet,
    };
    return newGraph;
};
const isLeaf = (graph, node) => {
    return !graph.graph.has(node) || Array.from(graph.graph.get(node)).every(x => !graph.cover.has(x));
};
const neighbors = (graph, node) => {
    return graph.graph.has(node) ? Array.from(graph.graph.get(node)).filter(x => graph.cover.has(x)) : [];
};
const pull = (graph) => {
    for (const value of graph.cover) {
        return [value, remove(graph, value)];
    }
};
const analyzeGraph = (graph) => {
    const wgraph = { graph: graph.graph, cover: new Set(graph.cover) };
    const chain = [];
    let done;
    do {
        done = true;
        const nodes = Array.from(wgraph.cover);
        for (const node of nodes) {
            if (isLeaf(wgraph, node)) {
                done = false;
                chain.push(node);
                wgraph.cover.delete(node);
            }
        }
    } while (!done);
    console.log("wgraph", wgraph);
    if (!wgraph.cover.size) {
        const axioms = Array.from(graph.cover).filter(ax => isLeaf(graph, ax));
        return [true, [axioms, chain]];
    }
    else {
        const cycle = findShortCycle(wgraph);
        for (const node of cycle) {
            wgraph.cover.delete(node);
        }
        const [result, data] = analyzeGraph(wgraph);
        let cycles;
        if (result) {
            cycles = [cycle];
        }
        else {
            cycles = data;
            cycles.push(cycle);
        }
        return [false, cycles];
    }
};
const chainToList = (chain) => {
    const list = [];
    while (chain) {
        list.push(chain.car);
        chain = chain.cdr;
    }
    return list;
};
const findShortCycle = (graph) => {
    let queue = Array.from(graph.cover).map(x => [x, { car: x, cdr: null }]);
    while (queue.length) {
        const [first, chain] = queue.shift();
        for (const neighbor of neighbors(graph, chain.car)) {
            if (neighbor === first) {
                return chainToList({ car: neighbor, cdr: chain });
            }
            queue.push([first, { car: neighbor, cdr: chain }]);
        }
    }
    throw ("Shits fucked! " + graph);
};
//# sourceMappingURL=solver.js.map