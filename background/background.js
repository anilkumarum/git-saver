function setBadge(tabId, text, color) {
	chrome.action.setBadgeText({ tabId, text: text });
	chrome.action.setBadgeBackgroundColor({ tabId, color });
	chrome.action.setIcon({ tabId, path: text === "on" ? "/icon.png" : "/icon-gray.png" });
}

async function toggleScripting(tab) {
	if (!tab.url || !tab.url.startsWith("https://github.com/")) return;
	const status = await chrome.action.getBadgeText({ tabId: tab.id });
	if (status === "on") {
		chrome.tabs.onUpdated.removeListener(onUpdateTab);
		setBadge(tab.id, "off", "gray");
		return await chrome.tabs.sendMessage(tab.id, "removeSaveCheckBox");
	}

	try {
		await chrome.tabs.sendMessage(tab.id, "insertSaveCheckBox");
	} catch (error) {
		injectScript(tab.id);
	} finally {
		chrome.tabs.onUpdated.addListener(onUpdateTab);
		setBadge(tab.id, "on", "green");
	}
}

chrome.action.onClicked.addListener(toggleScripting);

export async function onUpdateTab(tabId, info, tab) {
	if (info.status === "complete") {
		if (!tab.url && !tab.url?.startsWith("https://github.com/")) return;
		try {
			await chrome.tabs.sendMessage(tab.id, "insertSaveCheckBox");
		} catch (error) {
			injectScript(tabId);
			setBadge(tab.id, "on", "green");
		}
	}
}

function injectScript(tabId) {
	chrome.scripting
		.executeScript({
			target: { tabId },
			files: ["/scripts/content.js"],
		})
		.catch((err) => console.info(err));
}

export function setInstallation({ reason }) {
	async function oneTimeInstall() {
		const LAMBA_KD = crypto.randomUUID();
		chrome.storage.local.set({ extUserId: LAMBA_KD });
		chrome.tabs.create({ url: "/guide/welcome-guide.html" });
		//> uninstall survey setup
		const SURVEY_URL = `https://uninstall-form.pages.dev/?e=${chrome.runtime.id}&u=${LAMBA_KD}`;
		chrome.runtime.setUninstallURL(SURVEY_URL);
	}
	reason === "install" && oneTimeInstall();

	chrome.tabs.query({ currentWindow: true }).then((tabs) => {
		for (const tab of tabs) {
			chrome.action.setBadgeText({ tabId: tab.id, text: "off" }),
				chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "gray" });
		}
	});
}

// installation setup
chrome.runtime.onInstalled.addListener(setInstallation);
