export class DirPath {
	/**@param {string} name, @param {string} path*/
	constructor(name, path) {
		this.name = name;
		this.path = path;
		this.dirs = [];
	}
}

const descriptor = { mode: "readwrite" };
export const requestAccess = async (dirHandle) => (await dirHandle.requestPermission(descriptor)) === "granted";

/**@param {FileSystemDirectoryHandle} dirHandle*/
export async function createFolderTree(dirHandle) {
	const isGranted = (await dirHandle["requestPermission"](descriptor)) === "granted";
	if (!isGranted) return alert("Permission denied");

	const dirTree = [];
	let promises = [];
	async function walkDir(dirHandle, openDir, dirPath) {
		for await (const entry of dirHandle.values()) {
			if (entry.kind === "directory") {
				const entryPath = (dirPath && dirPath + "/") + entry.name;
				const folderPath = new DirPath(entry.name, entryPath);
				openDir.push(folderPath);
				promises.push(walkDir(entry, folderPath.dirs, entryPath));
			}
		}
	}

	promises.push(walkDir(dirHandle, dirTree, dirHandle.name));
	await Promise.all(promises).catch((err) => console.error(err));
	await new Promise((r) => setTimeout(r, 100)); //FIX later
	return dirTree;
}

/**@param {FileSystemDirectoryHandle} dirHandle*/
export async function getDirHandle(dirHandle, filePath) {
	filePath = filePath.slice(filePath.indexOf("/") + 1);
	if (filePath.includes("/")) {
		const dirPaths = filePath.split("/");
		filePath = dirPaths.pop();
		for (const dirName of dirPaths) dirHandle = await dirHandle.getDirectoryHandle(dirName, { create: true });
	}
	return await dirHandle.getDirectoryHandle(filePath, { create: true });
}

export async function getFileHandle(dirHandle, filePath) {
	if (filePath.includes("/")) {
		const dirPaths = filePath.split("/");
		filePath = dirPaths.pop();
		for (const dirName of dirPaths) dirHandle = await dirHandle.getDirectoryHandle(dirName, { create: true });
	}
	return await dirHandle.getFileHandle(filePath, { create: true });
}

export async function writeGithubFilesToLocalDisk(dirHandle, fileUrls) {
	async function fetchAndWriteFile(info) {
		try {
			const fileHandle = await getFileHandle(dirHandle, info.fileName);
			/**@type {FileSystemWritableFileStream} */
			const writableStream = await fileHandle.createWritable();
			const response = await fetch(info.fileUrl);
			if (response.ok) await response.body.pipeTo(writableStream);
			else console.error("failed to fetch");
		} catch (error) {
			console.error(error);
		}
	}
	await Promise.all(fileUrls.map(fetchAndWriteFile));
}
