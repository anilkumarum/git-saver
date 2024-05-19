import { getDirHandle, writeGithubFilesToLocalDisk } from "./dir-handle.js";
import { GithubFileExtractor } from "../fileExtractor.js";
import { DirectoryTree } from "./directory-tree.js";
import { getFolder } from "./db.js";
// @ts-ignore
import styleCss from "../style/style.css" assert { type: "css" };
// @ts-ignore
import treeCss from "../style/folder-tree.css" assert { type: "css" };

const excludeRx = new RegExp(/[\s:|?<>/~#^*\[\]]/g);

export class GitsaverButton extends HTMLElement {
	constructor() {
		super();
	}

	updateUi(saved) {
		this.shadowRoot.firstElementChild["style"].display = saved ? "none" : "inline-block";
		this.btnElem.className = saved ? "file-saved" : "file-save";
		this.btnElem.lastElementChild.textContent = saved ? "Saved" : "Save Files";
		setTimeout(() => this.updateUi(), 6000, false);
	}

	async extractGithubFiles() {
		const inputPath = this.pathInput.value;
		if (!inputPath) return toast("Please select folder"), this.pathInput.focus();
		const selectedFolder = this.folderTree.selectedFolder;
		const folderPath = this.folderTree.selectedFolderPath;
		let destinationFolder;
		if (inputPath === folderPath) destinationFolder = selectedFolder;
		else {
			const slashIdx = inputPath.indexOf("/", 1);
			const baseDirName = inputPath.slice(0, slashIdx);
			try {
				const dirHandle = this.folderTree.dirHandle ?? (await getFolder(baseDirName));
				const dirPath = inputPath.slice(slashIdx + 1).replaceAll(excludeRx, "");
				destinationFolder = await getDirHandle(dirHandle, dirPath);
			} catch (error) {
				return alert(error.message);
			}
		}

		try {
			const promises = [];
			this.btnElem.lastElementChild.textContent = "Saving...";
			toast("Saving...");
			const extractGen = new GithubFileExtractor().extract();
			for await (const fileUrls of extractGen) {
				promises.push(writeGithubFilesToLocalDisk(destinationFolder, fileUrls));
			}
			//await Promise.all(promises);
			Promise.all(promises);
			this.updateUi(true);
			const lastFolderPath = inputPath.startsWith("/") ? inputPath.slice(1) : inputPath;
			chrome.storage.local.set({ lastFolderPath });
			toast("Selected files saved");
		} catch (error) {
			alert(error.message);
		}
	}

	render() {
		return `<div class="selected-folder">
				<svg class="chev-down" viewBox="0 0 24 24">
					<path></path>
				</svg>
				<input type="url" name="folder-path" placeholder="Select destination path"></input>
				<directory-tree id="gs-directory-tree"></directory-tree>
			</div>
			<button class="file-save">
				<svg viewBox="0 0 24 24">
					<path></path>
				</svg>
				<span>Save Files</span>
			</button>`;
	}

	connectedCallback() {
		this.attachShadow({ mode: "open" });
		this.shadowRoot.adoptedStyleSheets = [styleCss, treeCss];
		this.shadowRoot.innerHTML = this.render();
		/**@type {DirectoryTree}*/
		// @ts-ignore
		this.folderTree = this.shadowRoot.getElementById("gs-directory-tree");
		const descriptors = Object.getOwnPropertyDescriptors(DirectoryTree.prototype);
		Object.defineProperties(this.folderTree, descriptors);
		this.folderTree["connectedCallback"]();

		this.pathInput = this.shadowRoot.querySelector("input");
		this.folderTree.addEventListener("selectfolder", (evt) => (this.pathInput.value = evt["detail"]));
		this.btnElem = this.shadowRoot.querySelector("button");
		this.btnElem.addEventListener("click", this.extractGithubFiles.bind(this));
		chrome.storage.local.get("lastFolderPath").then(({ lastFolderPath }) => {
			this.pathInput.value = lastFolderPath ?? "";
		});
	}
}
