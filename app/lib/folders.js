// Active folder is stored as "inbox" or "custom:<id>".

export function parseFolderKey(activeFolder) {
  if (!activeFolder.includes(":")) {
    return { resolvedActiveFolder: activeFolder, activeCustomFolderId: null };
  }

  const [type, id] = activeFolder.split(":");

  return { resolvedActiveFolder: type, activeCustomFolderId: id };
}

export function makeFolderKey(type, id = null) {
  return id ? `${type}:${id}` : type;
}
