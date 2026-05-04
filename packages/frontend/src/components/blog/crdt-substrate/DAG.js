export default class DAG {
  constructor(nodeName, root) {
    this.nodeName = nodeName;
    this.nodeRelation = new Map();
    this.seq = 0;
    if (root) {
      this.root = root;
    } else {
      this.root = {
        parents: new Set(),
        id: 'ROOT',
        event: { mutationName: '', mutationArgs: [] },
      };
    }
    this.nodeRelation.set(this.root.id, this.root);
  }

  addEvent(event) {
    const node = {
      parents: this.findLeaves(),
      id: `${this.nodeName}-${this.seq++}`,
      event,
    };
    this.nodeRelation.set(node.id, node);
    return node;
  }

  findLeaves() {
    const leaves = new Set([...this.nodeRelation.keys()]);
    for (const n of this.nodeRelation.values()) {
      for (const p of n.parents) {
        leaves.delete(p);
      }
    }
    return leaves;
  }

  getEventsInOrder() {
    const graph = new Map();
    for (const n of this.nodeRelation.keys()) {
      graph.set(n, []);
    }

    for (const n of this.nodeRelation.values()) {
      for (const p of n.parents) {
        graph.get(p).push(n);
      }
    }

    for (const children of graph.values()) {
      children.sort((a, b) => {
        const [aNode, aRawSeq] = a.id.split('-');
        const [bNode, bRawSeq] = b.id.split('-');
        const aSeq = parseInt(aRawSeq);
        const bSeq = parseInt(bRawSeq);
        if (aSeq === bSeq) return aNode < bNode ? -1 : 1;
        return aSeq - bSeq;
      });
    }

    const events = [];
    const visited = new Set();
    const toVisit = [this.root];
    for (const n of toVisit) {
      if (visited.has(n)) continue;
      visited.add(n);
      if (n.id !== 'ROOT') events.push(n);
      for (const child of graph.get(n.id)) {
        toVisit.push(child);
      }
    }

    return events;
  }

  merge(other) {
    const ret = new DAG(this.nodeName);
    ret.nodeRelation = new Map([...this.nodeRelation, ...other.nodeRelation]);
    ret.seq = Math.max(this.seq, other.seq) + 1;
    return ret;
  }

  // Note: this mutates the input
  applyTo(state, mutations) {
    const events = this.getEventsInOrder();
    for (const e of events) {
      mutations[e.event.mutationName](state, ...e.event.mutationArgs);
    }
    return state;
  }
}
