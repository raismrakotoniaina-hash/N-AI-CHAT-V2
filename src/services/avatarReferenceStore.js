const DB_NAME = "nai-avatar-references";
const STORE = "images";

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) return reject(new Error("IndexedDB unavailable"));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact(key, mode, operation, value) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      const request = operation === "put" ? store.put(value, key) : operation === "delete" ? store.delete(key) : store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export const saveAvatarReference = (userId, avatarId, file) => transact(userId + ":" + avatarId, "readwrite", "put", file);
export const getAvatarReference = (userId, avatarId) => transact(userId + ":" + avatarId, "readonly", "get");
export const deleteAvatarReference = (userId, avatarId) => transact(userId + ":" + avatarId, "readwrite", "delete");
