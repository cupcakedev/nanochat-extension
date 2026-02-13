function toTraversalRoot(root: ParentNode): Node | null {
  if (root instanceof Document) return root.documentElement;
  return root as Node;
}

function collectRootsFromNode(root: ParentNode, allRoots: ParentNode[]): void {
  const traversalRoot = toTraversalRoot(root);
  if (!traversalRoot) return;

  const walker = document.createTreeWalker(traversalRoot, NodeFilter.SHOW_ELEMENT);
  let current: Node | null = walker.currentNode;
  while (current) {
    if (current instanceof HTMLElement && current.shadowRoot) {
      allRoots.push(current.shadowRoot);
      collectRootsFromNode(current.shadowRoot, allRoots);
    }
    current = walker.nextNode();
  }
}

export function collectSearchRoots(): ParentNode[] {
  const roots: ParentNode[] = [document];
  collectRootsFromNode(document, roots);
  return roots;
}
