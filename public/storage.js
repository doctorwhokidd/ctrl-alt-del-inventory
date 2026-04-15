export function getData() {
  return JSON.parse(localStorage.getItem("inventoryData")) || {
    spirits: [],
    relics: [],
    findings: []
  };
}

export function saveData(data) {
  localStorage.setItem("inventoryData", JSON.stringify(data));
}