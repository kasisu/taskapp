"use strict";

const STORAGE_KEY = "taskapp.board.v1";
const boardTitle = document.querySelector("#board-title");
const listsElement = document.querySelector("#lists");
const addListForm = document.querySelector("#add-list-form");
const statusMessage = document.querySelector("#status-message");

let board = createEmptyBoard();
let editing = null;
let dragging = null;

function createEmptyBoard() {
  return { id: createId("board"), title: "タスクボード", lists: [] };
}

function createId(prefix) {
  if (window.crypto?.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeTitle(value) {
  return value.trim();
}

function isValidBoard(candidate) {
  if (!candidate || typeof candidate !== "object" || typeof candidate.title !== "string" || !Array.isArray(candidate.lists)) return false;
  return candidate.lists.every((list) =>
    list && typeof list.id === "string" && typeof list.title === "string" && Array.isArray(list.cards) &&
    list.cards.every((card) => card && typeof card.id === "string" && typeof card.title === "string"),
  );
}

function loadBoard() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyBoard();
    const savedBoard = JSON.parse(raw);
    if (isValidBoard(savedBoard)) return savedBoard;
    showMessage("保存データの形式が正しくないため、空のボードで開始しました。", true);
  } catch {
    showMessage("保存データを読み込めないため、空のボードで開始しました。", true);
  }
  return createEmptyBoard();
}

function saveBoard() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
    return true;
  } catch {
    showMessage("変更は画面に反映されましたが、保存できませんでした。ブラウザの保存設定を確認してください。", true);
    return false;
  }
}

function commit(message) {
  render();
  const saved = saveBoard();
  if (saved && message) showMessage(message);
}

function showMessage(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("is-error", isError);
}

function findList(listId) {
  return board.lists.find((list) => list.id === listId);
}

function findCard(listId, cardId) {
  return findList(listId)?.cards.find((card) => card.id === cardId);
}

function render() {
  boardTitle.textContent = board.title;
  if (board.lists.length === 0) {
    listsElement.innerHTML = '<div class="empty-board">リストがありません。下の入力欄から最初のリストを追加してください。</div>';
    return;
  }
  listsElement.innerHTML = board.lists.map((list, listIndex) => renderList(list, listIndex)).join("");
}

function renderList(list, listIndex) {
  const isEditing = editing?.type === "list" && editing.listId === list.id;
  const cards = list.cards.length
    ? list.cards.map((card, cardIndex) => renderCard(list, card, listIndex, cardIndex)).join("")
    : '<p class="empty-list">カードはありません</p>';
  const header = isEditing
    ? `<form class="inline-form" data-form="edit-list" data-list-id="${list.id}">
        <label>リスト名<input name="title" value="${escapeHtml(list.title)}" maxlength="80" required autofocus /></label>
        <div class="form-row"><button class="primary-button" type="submit">保存</button><button class="secondary-button" type="button" data-action="cancel-edit">取消</button></div>
      </form>`
    : `<div class="list-header"><h2>${escapeHtml(list.title)}</h2><div>
        <button class="icon-button" type="button" data-action="edit-list" data-list-id="${list.id}">編集</button>
        <button class="icon-button danger" type="button" data-action="delete-list" data-list-id="${list.id}">削除</button>
      </div></div>`;
  return `<section class="list" data-list-id="${list.id}">${header}
    <div class="cards" data-list-id="${list.id}" aria-label="${escapeHtml(list.title)}のカード一覧">${cards}</div>
    <form class="add-card-form" data-form="add-card" data-list-id="${list.id}">
      <label>カードを追加<input name="title" maxlength="120" placeholder="カード名" autocomplete="off" /></label>
      <button class="primary-button" type="submit">カードを追加</button>
    </form>
  </section>`;
}

function renderCard(list, card, listIndex, cardIndex) {
  const isEditing = editing?.type === "card" && editing.cardId === card.id;
  if (isEditing) {
    return `<article class="card" data-card-id="${card.id}"><form class="inline-form" data-form="edit-card" data-list-id="${list.id}" data-card-id="${card.id}">
      <label>カード名<input name="title" value="${escapeHtml(card.title)}" maxlength="120" required autofocus /></label>
      <div class="form-row"><button class="primary-button" type="submit">保存</button><button class="secondary-button" type="button" data-action="cancel-edit">取消</button></div>
    </form></article>`;
  }
  const previousList = listIndex > 0;
  const nextList = listIndex < board.lists.length - 1;
  return `<article class="card" draggable="true" data-card-id="${card.id}" data-list-id="${list.id}">
    <div class="card-header"><p class="card-title">${escapeHtml(card.title)}</p></div>
    <div class="card-actions">
      <button class="icon-button" type="button" data-action="edit-card" data-list-id="${list.id}" data-card-id="${card.id}">編集</button>
      <button class="icon-button danger" type="button" data-action="delete-card" data-list-id="${list.id}" data-card-id="${card.id}">削除</button>
    </div>
    <div class="card-move-actions" aria-label="カード移動">
      <button type="button" data-action="move-card" data-direction="up" data-list-id="${list.id}" data-card-id="${card.id}" ${cardIndex === 0 ? "disabled" : ""}>上へ</button>
      <button type="button" data-action="move-card" data-direction="down" data-list-id="${list.id}" data-card-id="${card.id}" ${cardIndex === list.cards.length - 1 ? "disabled" : ""}>下へ</button>
      <button type="button" data-action="move-card" data-direction="previous-list" data-list-id="${list.id}" data-card-id="${card.id}" ${previousList ? "" : "disabled"}>前のリスト</button>
      <button type="button" data-action="move-card" data-direction="next-list" data-list-id="${list.id}" data-card-id="${card.id}" ${nextList ? "" : "disabled"}>次のリスト</button>
    </div>
  </article>`;
}

function addList(title) {
  board.lists.push({ id: createId("list"), title, cards: [] });
  commit(`「${title}」を追加しました。`);
}

function addCard(listId, title) {
  const list = findList(listId);
  if (!list) return;
  list.cards.push({ id: createId("card"), title });
  commit(`「${title}」を追加しました。`);
}

function deleteList(listId) {
  const list = findList(listId);
  if (!list) return;
  const detail = list.cards.length ? `「${list.title}」と${list.cards.length}件のカードを完全に削除します。` : `「${list.title}」を完全に削除します。`;
  if (!window.confirm(`${detail}\nこの操作は元に戻せません。`)) return;
  board.lists = board.lists.filter((item) => item.id !== listId);
  commit("リストを削除しました。");
}

function deleteCard(listId, cardId) {
  const card = findCard(listId, cardId);
  const list = findList(listId);
  if (!card || !list) return;
  if (!window.confirm(`「${card.title}」を完全に削除します。\nこの操作は元に戻せません。`)) return;
  list.cards = list.cards.filter((item) => item.id !== cardId);
  commit("カードを削除しました。");
}

function moveCardTo(listId, cardId, destinationListId, targetCardId = null) {
  const sourceList = findList(listId);
  const destinationList = findList(destinationListId);
  if (!sourceList || !destinationList || (listId === destinationListId && cardId === targetCardId)) return;
  const sourceIndex = sourceList.cards.findIndex((card) => card.id === cardId);
  if (sourceIndex < 0) return;
  const [card] = sourceList.cards.splice(sourceIndex, 1);
  const targetIndex = targetCardId ? destinationList.cards.findIndex((item) => item.id === targetCardId) : destinationList.cards.length;
  destinationList.cards.splice(targetIndex < 0 ? destinationList.cards.length : targetIndex, 0, card);
  commit(`「${card.title}」を移動しました。`);
}

function moveCardByButton(listId, cardId, direction) {
  const listIndex = board.lists.findIndex((list) => list.id === listId);
  const list = board.lists[listIndex];
  const cardIndex = list?.cards.findIndex((card) => card.id === cardId) ?? -1;
  if (!list || cardIndex < 0) return;
  if (direction === "up" && cardIndex > 0) moveCardTo(listId, cardId, listId, list.cards[cardIndex - 1].id);
  if (direction === "down" && cardIndex < list.cards.length - 1) {
    const cardAfterNext = list.cards[cardIndex + 2];
    moveCardTo(listId, cardId, listId, cardAfterNext?.id ?? null);
  }
  if (direction === "previous-list" && listIndex > 0) moveCardTo(listId, cardId, board.lists[listIndex - 1].id);
  if (direction === "next-list" && listIndex < board.lists.length - 1) moveCardTo(listId, cardId, board.lists[listIndex + 1].id);
}

addListForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = normalizeTitle(new FormData(addListForm).get("title"));
  if (!title) return showMessage("リスト名を入力してください。", true);
  addList(title);
  addListForm.reset();
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!form.matches("[data-form]")) return;
  event.preventDefault();
  const title = normalizeTitle(new FormData(form).get("title"));
  if (!title) return showMessage("名前を入力してください。", true);
  if (form.dataset.form === "add-card") {
    addCard(form.dataset.listId, title);
    form.reset();
  }
  if (form.dataset.form === "edit-list") {
    const list = findList(form.dataset.listId);
    if (list) list.title = title;
    editing = null;
    commit("リスト名を変更しました。");
  }
  if (form.dataset.form === "edit-card") {
    const card = findCard(form.dataset.listId, form.dataset.cardId);
    if (card) card.title = title;
    editing = null;
    commit("カード名を変更しました。");
  }
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const { action, listId, cardId, direction } = button.dataset;
  if (action === "cancel-edit") {
    editing = null;
    render();
  }
  if (action === "edit-list") {
    editing = { type: "list", listId };
    render();
  }
  if (action === "delete-list") deleteList(listId);
  if (action === "edit-card") {
    editing = { type: "card", listId, cardId };
    render();
  }
  if (action === "delete-card") deleteCard(listId, cardId);
  if (action === "move-card") moveCardByButton(listId, cardId, direction);
});

listsElement.addEventListener("dragstart", (event) => {
  const card = event.target.closest(".card[draggable='true']");
  if (!card) return;
  dragging = { listId: card.dataset.listId, cardId: card.dataset.cardId };
  card.classList.add("is-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", card.dataset.cardId);
});

listsElement.addEventListener("dragover", (event) => {
  const cards = event.target.closest(".cards");
  if (!cards || !dragging) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  cards.classList.add("is-drop-target");
});

listsElement.addEventListener("dragleave", (event) => {
  const cards = event.target.closest(".cards");
  if (cards && !cards.contains(event.relatedTarget)) cards.classList.remove("is-drop-target");
});

listsElement.addEventListener("drop", (event) => {
  const cards = event.target.closest(".cards");
  if (!cards || !dragging) return;
  event.preventDefault();
  const targetCard = event.target.closest(".card");
  moveCardTo(dragging.listId, dragging.cardId, cards.dataset.listId, targetCard?.dataset.cardId ?? null);
  dragging = null;
  document.querySelectorAll(".is-drop-target, .is-dragging").forEach((element) => element.classList.remove("is-drop-target", "is-dragging"));
});

listsElement.addEventListener("dragend", () => {
  dragging = null;
  document.querySelectorAll(".is-drop-target, .is-dragging").forEach((element) => element.classList.remove("is-drop-target", "is-dragging"));
});

board = loadBoard();
render();
