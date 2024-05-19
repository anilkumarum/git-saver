export class GithubFileExtractor {
	constructor() {}

	getDirectoryFiles(entries, dirPath) {
		const fileUrls = [];
		const path = dirPath.slice(dirPath.indexOf("/") + 1);
		for (const entry in entries) {
			if (entry.includes(".")) {
				const fileName = dirPath ? `${path}/${entry}` : entry;
				const fileUrl = `https://github.com/${this.repoPath}/raw/${this.branch}/${dirPath}/${entry}`;
				fileUrls.push({ fileName, fileUrl });
			} else this.fetchDirectoryFiles(dirPath + "/" + entry);
		}
		return fileUrls;
	}

	async fetchDirectoryFiles(dirPath) {
		try {
			const url = `https://github.com/${this.repoPath}/tree-commit-info/${this.branch}/${dirPath}`;
			const response = await fetch(url, {
				headers: { Accept: "application/json" },
			});
			if (response.ok) {
				const entries = await response.json();
				return this.getDirectoryFiles(entries, dirPath);
			}
		} catch (error) {
			console.error(error);
		}
	}

	async *extract() {
		const fileUrls = [];
		const selectedFiles = document.querySelectorAll('input[name="codebook"]:checked');
		if (selectedFiles.length === 0) return toast("Files not selected");
		const path = location.pathname;
		const repoIndex = path.indexOf("/", path.indexOf("/", 1) + 1);
		this.repoPath = path.slice(1, repoIndex === -1 ? path.length : repoIndex);
		this.branch = document.getElementById("branch-picker-repos-header-ref-selector").textContent.trimStart();
		if (!this.branch) return toast("Branch name not available");

		for (const checkElem of selectedFiles) {
			const aElem = checkElem.parentElement.querySelector("a");
			const path = aElem.getAttribute("href");
			if (aElem.ariaLabel.includes("(File)")) {
				const filePath = path.split("/blob/" + this.branch).at(-1);
				const fileName = filePath.slice(filePath.lastIndexOf("/") + 1);
				const fileUrl = `https://github.com/${this.repoPath}/raw/${this.branch}` + filePath;
				fileUrls.push({ fileName, fileUrl });
			} else if (aElem.ariaLabel.includes("(Directory)")) {
				const dirPath = path.split("/tree/" + this.branch).at(-1);
				yield this.fetchDirectoryFiles(dirPath.slice(1));
			}
		}
		yield fileUrls;
	}
}
