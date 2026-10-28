/// <mls fileReference="_102035_/l2/newRelease/widgets/commonModel.ts" enhancement="_blank" />

export interface TextTreeNode {
  id: string;
  label: string;
  changed?: boolean;
  suffix?: string;
  value: string;
  children: TextTreeNode[];
}

export function textTree(label: string, value: unknown, id = label): TextTreeNode {
  const entries = value !== null && typeof value === 'object' ? Object.entries(value) : [];
  return {
    id, label, value: entries.length ? '' : value == null ? '' : String(value),
    children: entries.map(([key, child]) => textTree(key, child, `${id}/${key}`)),
  };
}

export function filterTextTree(roots: TextTreeNode[], search: string, rootId = ''): TextTreeNode[] {
  const query = search.trim().toLocaleLowerCase();
  const match = (node: TextTreeNode): TextTreeNode | null => {
    if (!query || `${node.label} ${node.suffix || ''} ${node.value}`.toLocaleLowerCase().includes(query)) return node;
    const children = node.children.map(match).filter((child): child is TextTreeNode => child !== null);
    return children.length ? { ...node, children } : null;
  };
  return roots.filter(root => !rootId || root.id === rootId).map(match)
    .filter((node): node is TextTreeNode => node !== null);
}

/** Comparing values also recognizes an edit reverted to its original value. */
export function hasDraftChanges(initial: unknown, draft: unknown): boolean {
  const canonical = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
    if (value !== null && typeof value === 'object') return `{${Object.entries(value)
      .filter(([, child]) => child !== undefined).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`).join(',')}}`;
    return JSON.stringify(value) ?? 'null';
  };
  return canonical(initial) !== canonical(draft);
}
