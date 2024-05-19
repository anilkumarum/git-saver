import { getAllFoldersName, getFolder, saveFolderInDb } from "./db.js";
import { DirPath, createFolderTree, getDirHandle } from "./dir-handle.js";

export class DirectoryTree extends HTMLElement {
	constructor() {
		super();
	}

	createFolder() {
		if (!this.selectedFolder) return this.pickFolderFromOs();

		const folderName = "Untitled";
		const dirItem = new DirPath(folderName, "/" + folderName);
		const dirElem = this.firstElementChild.querySelector(`div[data-path="${this.selectedFolderPath}"]`);
		dirElem.nextElementSibling.insertAdjacentHTML("beforeend", this.layerItem(dirItem));
		const titleInput = dirElem.nextElementSibling.lastElementChild.querySelector("span");
		titleInput.setAttribute("contenteditable", "true");
		titleInput["focus"]();
		getSelection().getRangeAt(0).selectNodeContents(titleInput);

		const updateFolderName = async ({ target }) => {
			const path = this.selectedFolderPath.startsWith("/")
				? target.textContent
				: this.selectedFolderPath + "/" + target.textContent;
			target.parentElement.dataset.path = path;
			this.onDirSelect(path);
			target.setAttribute("contenteditable", "false");
			titleInput.removeEventListener("beforeinput", onInput);
			titleInput.removeEventListener("blur", updateFolderName);
		};

		const onInput = (event) => {
			if (event.inputType !== "insertParagraph") return;
			updateFolderName(event), event.preventDefault();
		};
		titleInput.addEventListener("beforeinput", onInput);
		titleInput.addEventListener("blur", updateFolderName, { once: true });
	}

	async pickFolderFromOs() {
		try {
			// @ts-ignore
			const dirHandle = await showDirectoryPicker({ mode: "readwrite", startIn: "documents" });
			const dirFolders = await createFolderTree(dirHandle);
			if (!dirFolders) return;
			const dirItem = new DirPath(dirHandle.name, "/" + dirHandle.name);
			dirItem.dirs = dirFolders;
			this.firstElementChild.insertAdjacentHTML("beforeend", this.layerItem(dirItem));
			await saveFolderInDb(dirHandle);
		} catch (error) {
			if (navigator["brave"] && error.message === "showDirectoryPicker is not defined")
				return chrome.tabs.create({ url: "https://crxextstatic.blob.core.windows.net/note-rail/brave-flag.html" });
			console.error(error.message);
		}
	}

	async onDirSelect(path) {
		const dirHandle = path.startsWith("/") ? this.dirHandle : await getDirHandle(this.dirHandle, path);
		this.selectedFolder = dirHandle;
		this.selectedFolderPath = path;
		this.dispatchEvent(new CustomEvent("selectfolder", { detail: path }));
	}

	/**@param {HTMLLIElement} dirElem, @param {string} dirName*/
	async insertDirTree(dirElem, dirName) {
		this.dirHandle = await getFolder(dirName);
		const dirFolders = await createFolderTree(this.dirHandle);
		dirElem.insertAdjacentHTML("afterend", this.createLayer(dirFolders));
		dirElem.nextElementSibling["hidden"] = false;
	}

	async selectFolder({ target }) {
		const div = target.closest("div");
		this.querySelector("div.selected")?.classList.remove("selected");
		div.classList.add("selected");
		const nxtElem = div.nextElementSibling;
		const path = div.dataset.path;

		if (nxtElem?.nodeName === "UL") nxtElem.hidden = !nxtElem.hidden;
		else if (path.startsWith("/")) await this.insertDirTree(div, path.slice(1));
		div.firstElementChild.toggleAttribute("open");
		this.onDirSelect(path);
	}

	layerItem(entry) {
		return `<li class="tree-item">
			<div class="file-item" data-path="${entry.path}">
				<svg class="folder" viewBox="0 0 24 24">
					<path></path>
				</svg>
				<span>${entry.name.slice(0, 24)}</span>
			</div>
			${entry.dirs.length !== 0 ? this.createLayer(entry.dirs) : ""}
		</li> `;
	}

	createLayer(entries) {
		return `<ul hidden>
			${entries.map(this.layerItem.bind(this)).join("")}
		</ul>`;
	}

	insertAddBtn() {
		const addFolderBtn = document.createElement("button");
		addFolderBtn.className = "add-folder";
		addFolderBtn.innerText = "Add Folder";
		addFolderBtn.addEventListener("click", this.createFolder.bind(this));
		this.appendChild(addFolderBtn);
	}

	async connectedCallback() {
		this.tabIndex = 0;
		const folderNames = await getAllFoldersName();
		const dirList = folderNames.map((name) => new DirPath(name, "/" + name));
		this.innerHTML = this.createLayer(dirList);
		this.insertAddBtn();
		this.firstElementChild["hidden"] = false;
		this.firstElementChild.addEventListener("click", this.selectFolder.bind(this));
	}
}
