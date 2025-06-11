from typing import List, Dict, Any, Annotated

from anytree.importer import DictImporter
from anytree.resolver import Resolver
from anytree.search import findall
from anytree import RenderTree, Node
from rich import print

def build_directory_tree(
    rows: List[Dict[str, Any]],
    user_id: str,
    *,
    root_name: str = "root",
    keep_keys: List[str] | None = None,
) -> Dict[str, Any]:
    """
    Convert a flat list of directory / experiment records into a nested tree,
    adding a computed ``user_permission`` to every node.

    Permission resolution rules
    ---------------------------
    1.  Starting at the current node and walking up toward the root, stop at the
        *nearest* ancestor whose ``authenticated_users_*`` array contains
        ``user_id``.  The union of the matching arrays gives the permission
        string::
            r ➜ read    | user_id ∈ authenticated_users_read
            w ➜ write   | user_id ∈ authenticated_users_write
            d ➜ delete  | user_id ∈ authenticated_users_delete
        The characters are sorted (e.g. "rwd").

    2.  If no ancestor grants an explicit user permission, walk up again looking
        for the *nearest* non-empty ``permission`` field and use that.

    3.  If everything is empty all the way to the synthetic root, ``user_permission``
        is the empty string ``""`` (no access).

    Parameters
    ----------
    rows      : flat list as in your example
    user_id   : the authenticated user we’re evaluating
    root_name : label for the synthetic root node (default "root")
    keep_keys : extra columns to copy verbatim into every node
                (e.g. ``["id", "permission"]``)

    Returns
    -------
    dict : nested tree with ``user_permission`` added
    """
    # ---------- build node shells ------------------------------------------------
    node_lookup: dict[str, dict] = {}
    parent_of: dict[str, str | None] = {}

    for r in rows:
        node = {
            "name": r["name"],
            "entity_type": r["entity_type"],
            "children": [],              # filled later
        }
        if keep_keys:
            for k in keep_keys:
                if k in r:
                    node[k] = r[k]
        node_lookup[r["id"]] = node
        parent_of[r["id"]] = r["parent_id"]

    # ---------- attach children --------------------------------------------------
    root = {"name": root_name, "children": []}
    for r in rows:
        (root["children"] if r["parent_id"] is None
         else node_lookup[r["parent_id"]]["children"]).append(node_lookup[r["id"]])

    # ---------- permission helper -----------------------------------------------
    def _collect_perm_chars(row: Dict[str, Any]) -> str:
        chars: list[str] = []
        if user_id in row.get("authenticated_users_read", []):
            chars.append("r")
        if user_id in row.get("authenticated_users_write", []):
            chars.append("w")
        if user_id in row.get("authenticated_users_delete", []):
            chars.append("d")
        return ''.join(chars)
#         return "".join(sorted(set(chars)))      # e.g. "rw", "rwd", "r"

    row_by_id = {r["id"]: r for r in rows}

    def _resolve_user_permission(node_id: str) -> str:
        # Pass 1 ─ explicit user grants
        cur = node_id
        while cur is not None:
            chars = _collect_perm_chars(row_by_id[cur])
            if chars:
                return chars
            cur = parent_of[cur]

        # Pass 2 ─ fall back on default permission strings
        cur = node_id
        while cur is not None:
            perm = row_by_id[cur].get("permission", "")
            if perm:
                return perm
            cur = parent_of[cur]

        return ""                             # nothing found

    # ---------- annotate every node in-place ------------------------------------
    for node_id, node in node_lookup.items():
        node["user_permission"] = _resolve_user_permission(node_id)

    # ---------- prune empty 'children' lists ------------------------------------
    def _prune(n: dict):
        if not n["children"]:
            n.pop("children")
        else:
            for c in n["children"]:
                _prune(c)
    _prune(root)

    return root

def anytree_from_directory_entities(
        data: Annotated[dict, 'Data from directory_entities table.'],
        user_id: Annotated[str, 'Users ID. Is used to determine read/write/delete permissions for a directory/experiment.'],
        keep_keys: Annotated[list[str], 'List of keys to keep associated with each directory node.'] = ['id', 'permission']
    ) -> Node:
    importer = DictImporter()
    tree = build_directory_tree(
        rows=data,
        user_id=user_id,
        keep_keys=keep_keys
    )
    return importer.import_(tree)

def search_by(
        search: Annotated[str, 'Search string.'],
        root: Annotated[Node, 'Node to start search from'],
        field: Annotated[str, 'Field to search by'] = 'name'
    ):
    nodes = findall(root, filter_=lambda node: node.__dict__.get(field, None) == search)
    return nodes

def get_node(
        path: Annotated[str, 'Path of node.'],
        root: Annotated[Node, 'Node to search.']
    ):
    resolver = Resolver('name')

    # if we have a leading / but it is not /root, let's add it in.
    prefix = path[:5]
    if prefix[0] == '/' and prefix != '/root':
        path = '/root' + path

    return resolver.get(root, path)

def display_anytree_node(
        root: Annotated[Node, 'Node to display']
    ):
    colors = {
        '': 'red',
        'r': 'cyan',
        'rw': 'green',
        'rwd': 'magenta'
    }
    print(f'Permission level :key:: [bold {colors['r']}]read[/bold {colors['r']}] [bold {colors['rw']}]write[/bold {colors['rw']}] [bold {colors['rwd']}]delete[/bold {colors['rwd']}]')
    for pre, _, node in RenderTree(root):
        if 'user_permission' in node.__dict__:
            c = colors.get(node.user_permission)
            tail = ':microscope: ' if node.entity_type == 'experiment' else ':file_folder: '
            print(f'{pre}{tail}[bold {c}]{node.name}[/bold {c}]')