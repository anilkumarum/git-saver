"use strict";
function insertSaveCheckBox() {
	/**@type {HTMLTableElement} */
	const fileTable = document.querySelector(`table[aria-labelledby="folders-and-files"]`);
	if (!fileTable) return;
	const rows = fileTable.tBodies[0].rows;
	for (let index = 1; index < rows.length; index++) {
		const cellElem = rows[index].cells[1]?.firstElementChild;
		cellElem?.querySelector('input[name="codebook"]') ?? cellElem?.prepend(createInputElem());
	}

	const inputElem = createInputElem();
	inputElem.style.marginTop = "-16px";
	rows[0].cells[0].appendChild(inputElem);
	inputElem.addEventListener("change", toggleMarkAll);

	fileTable.onchange = insertClipBtn.bind(null, fileTable);
}
insertSaveCheckBox();

function createInputElem() {
	const input = document.createElement("input");
	input.type = "checkbox";
	input.name = "codebook";
	return input;
}

function toggleMarkAll({ target }) {
	for (const input of document.querySelectorAll('input[name="codebook"]')) input["checked"] = target.checked;
}

async function insertClipBtn(fileTable, { target }) {
	fileTable.onchange = null;
	document.querySelector("gitsaver-button");
	if (document.querySelector("gitsaver-button")) return;
	const saveBtn = document.createElement("gitsaver-button");
	const btnUrl = chrome.runtime.getURL("/scripts/save-button/gitsaver-button.js");
	const { GitsaverButton } = await import(btnUrl);
	const descriptors = Object.getOwnPropertyDescriptors(GitsaverButton.prototype);
	Object.defineProperties(saveBtn, descriptors);
	saveBtn["connectedCallback"]();
	//prettier-ignore
	location.pathname.includes("tree") ? document.getElementById("StickyHeader").firstElementChild.firstElementChild.firstElementChild.appendChild(saveBtn):document.getElementById("branch-picker-repos-header-ref-selector").parentElement.parentElement.after(saveBtn);
	location.pathname.includes("tree") || (saveBtn.style.position = "absolute");
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request === "insertSaveCheckBox") {
		setTimeout(insertSaveCheckBox, 2000);
		sendResponse("inserted");
	} else if (request === "removeSaveCheckBox") {
		for (const input of document.querySelectorAll('input[name="codebook"]')) input.remove();
		document.querySelector("gitsaver-button")?.remove();
		sendResponse("removed");
	}
});

const snackbar = document.createElement("ouput");
snackbar.id = "snackbar";
snackbar.hidden = true;
document.body.appendChild(snackbar);
globalThis.toast = (msg) => {
	snackbar.isConnected || document.body.appendChild(snackbar);
	snackbar.hidden = false;
	snackbar.innerText = msg;
	setTimeout(() => (snackbar.hidden = true), 6000);
};

const styleSheetElem = document.createElement("style");
styleSheetElem.id = "git-saver";
styleSheetElem.innerHTML = `
	input[name="codebook"] {
		position: absolute;
		margin-left: -18px;
		opacity: 0;
		transition: opacity 200ms ease-out;
		cursor:pointer;

		&:hover,&:checked{
			opacity: 1;
		}
	}

	td:nth-of-type(2):hover input[name="codebook"]{
		opacity: 1;
	}

	#snackbar {
		min-width: 5em;
		background-color: #333;
		color: rgb(255, 208, 0);
		text-align: center;
		border-radius: 1em;
		padding: 0.6em;
		position: fixed;
		z-index: 1000;
		left: 33%;
		bottom: 2em;
		width: max-content;
		translate: 0 280%;
		animation: in-out 6s ease-out;
	}
	
	@keyframes in-out {
		10%,
		90% {
			translate: 0 0;
		}
	}`;
document.head.appendChild(styleSheetElem);
