const Store = { Directories: "Directories" };

function onupgradeneeded({ target }) {
	target.result.createObjectStore(Store.Directories);
}

/**@returns {Promise<IDBDatabase>} */
function connect() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open("gitsaver", 1);
		request.onupgradeneeded = onupgradeneeded;
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
		request.onblocked = () => console.warn("Pending until unblocked");
	});
}

/**@returns {Promise<FileSystemDirectoryHandle>} */
export async function getFolder(dirName) {
	dirName.startsWith("/") && (dirName = dirName.slice(1));
	return new Promise((resolve, reject) => {
		connect().then((db) => {
			const store = db.transaction(Store.Directories, "readonly").objectStore(Store.Directories);
			const fetchQuery = store.get(dirName);
			fetchQuery.onsuccess = ({ target }) => resolve(target["result"]);
			fetchQuery.onerror = (e) => reject(e);
			db.close();
		});
	});
}

/**@returns {Promise<string[]>} */
export async function getAllFoldersName() {
	return new Promise((resolve, reject) => {
		connect().then((db) => {
			const store = db.transaction(Store.Directories, "readonly").objectStore(Store.Directories);
			const fetchQuery = store.getAllKeys();
			fetchQuery.onsuccess = ({ target }) => resolve(target["result"]);
			fetchQuery.onerror = (e) => reject(e);
			db.close();
		});
	});
}

/**@param {FileSystemDirectoryHandle} dirHandle*/
export async function saveFolderInDb(dirHandle) {
	return new Promise((resolve, reject) => {
		connect().then((db) => {
			const store = db.transaction(Store.Directories, "readwrite").objectStore(Store.Directories);
			//TODO if exist then add number at end
			const insertTask = store.add(dirHandle, dirHandle.name);
			insertTask.onsuccess = (e) => resolve(e);
			insertTask.onerror = (e) => reject(e);
			db.close();
		});
	});
}

export async function removeFolder(foldername) {
	return new Promise((resolve, reject) => {
		connect().then((db) => {
			const store = db.transaction(Store.Directories, "readonly").objectStore(Store.Directories);
			const deleteTask = store.delete(foldername);
			deleteTask.onsuccess = ({ target }) => resolve(target["result"]);
			deleteTask.onerror = (e) => reject(e);
			db.close();
		});
	});
}
