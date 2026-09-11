const views = {
  home: document.getElementById("homeView"),
  booking: document.getElementById("bookingView"),
  confirm: document.getElementById("confirmView"),
  complete: document.getElementById("completeView"),
  lookup: document.getElementById("lookupView"),
  info: document.getElementById("infoView"),
  admin: document.getElementById("adminView")
};

const STORAGE_KEY = "genkikkoReservations";
let draft = null;

function getReservations() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveReservations(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
function showView(name) {
  Object.values(views).forEach(v => v.classList.remove("active"));
  (views[name] || views.home).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
  document.getElementById("mainNav").classList.remove("open");
  if (name === "lookup") renderReservations();
  if (name === "admin") renderAdmin();
}
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

document.querySelectorAll("[data-view]").forEach(el => {
  el.addEventListener("click", e => {
    e.preventDefault();
    showView(el.dataset.view);
  });
});

document.getElementById("menuBtn").addEventListener("click", () => {
  document.getElementById("mainNav").classList.toggle("open");
});

const today = new Date();
const isoToday = today.toISOString().split("T")[0];
document.getElementById("visitDate").min = isoToday;

document.querySelectorAll("[data-service]").forEach(btn => {
  btn.addEventListener("click", () => {
    const service = btn.dataset.service;
    document.getElementById("serviceType").value = service;
    document.getElementById("bookingServiceBadge").textContent = service;
    document.getElementById("vaccinationField").classList.toggle("hidden", service !== "予防接種");
    showView("booking");
  });
});

function collectForm() {
  return {
    service: document.getElementById("serviceType").value,
    date: document.getElementById("visitDate").value,
    time: document.getElementById("visitTime").value,
    name: document.getElementById("patientName").value.trim(),
    kana: document.getElementById("patientKana").value.trim(),
    birthDate: document.getElementById("birthDate").value,
    visitType: document.getElementById("visitType").value,
    phone: document.getElementById("phone").value.trim(),
    symptom: document.getElementById("symptom").value.trim(),
    vaccine: document.getElementById("vaccineName").value
  };
}

document.getElementById("bookingForm").addEventListener("submit", e => {
  e.preventDefault();
  draft = collectForm();
  const labels = [
    ["予約内容", draft.service],
    ["受診日時", `${draft.date} ${draft.time}`],
    ["お子さまのお名前", draft.name],
    ["ふりがな", draft.kana],
    ["生年月日", draft.birthDate],
    ["受診区分", draft.visitType],
    ["電話番号", draft.phone],
    ["症状・相談内容", draft.symptom || "入力なし"]
  ];
  if (draft.service === "予防接種") labels.splice(2, 0, ["希望ワクチン", draft.vaccine || "未選択"]);
  document.getElementById("confirmDetails").innerHTML = labels.map(([a,b]) => `<dl class="confirm-row"><dt>${escapeHtml(a)}</dt><dd>${escapeHtml(b)}</dd></dl>`).join("");
  showView("confirm");
});

document.getElementById("editBooking").addEventListener("click", () => showView("booking"));

document.getElementById("confirmBooking").addEventListener("click", () => {
  if (!draft) return;
  const list = getReservations();
  const id = "GK" + Date.now().toString().slice(-6);
  const record = {
    id,
    ...draft,
    status: "予約済み",
    createdAt: new Date().toISOString()
  };
  list.unshift(record);
  saveReservations(list);
  document.getElementById("reservationNumber").textContent = id;
  document.getElementById("completeSummary").innerHTML = `
    <p><strong>${escapeHtml(record.service)}</strong></p>
    <p>📅 ${escapeHtml(record.date)} ${escapeHtml(record.time)}</p>
    <p>👤 ${escapeHtml(record.name)} さま</p>`;
  document.getElementById("bookingForm").reset();
  draft = null;
  showView("complete");
});

function renderReservations() {
  const container = document.getElementById("reservationList");
  const list = getReservations();
  if (!list.length) {
    container.innerHTML = `<div class="empty-state">まだ予約はありません。<br><button class="text-btn" onclick="showView('home')">WEB予約へ進む →</button></div>`;
    return;
  }
  container.innerHTML = list.map(r => `
    <article class="reservation-card">
      <div class="reservation-top">
        <div><span class="status ${r.status === "キャンセル" ? "cancel" : ""}">${escapeHtml(r.status)}</span><h3>${escapeHtml(r.service)}</h3></div>
        <strong>${escapeHtml(r.date)} ${escapeHtml(r.time)}</strong>
      </div>
      <div class="reservation-meta">
        <span>予約番号：${escapeHtml(r.id)}</span>
        <span>患者名：${escapeHtml(r.name)} さま</span>
        <span>区分：${escapeHtml(r.visitType)}</span>
        <span>電話：${escapeHtml(r.phone)}</span>
      </div>
      ${r.status !== "キャンセル" && r.status !== "診察完了"
        ? `<div class="card-actions"><button class="danger-btn" onclick="cancelReservation('${r.id}')">予約をキャンセル</button></div>`
        : ""}
    </article>`).join("");
}

window.cancelReservation = function(id) {
  if (!confirm("この予約をキャンセルしますか？")) return;
  const list = getReservations().map(r => r.id === id ? { ...r, status: "キャンセル" } : r);
  saveReservations(list);
  renderReservations();
  toast("予約をキャンセルしました");
};

function renderAdmin() {
  const list = getReservations();
  const filter = document.getElementById("adminFilter").value;
  const filtered = filter === "all" ? list : list.filter(r => r.status === filter);
  const body = document.getElementById("adminTableBody");
  document.getElementById("adminEmpty").classList.toggle("hidden", filtered.length !== 0);
  body.innerHTML = filtered.map(r => `
    <tr>
      <td><strong>${escapeHtml(r.date)}</strong><br>${escapeHtml(r.time)}</td>
      <td>${escapeHtml(r.name)}<br><span class="muted">${escapeHtml(r.phone)}</span></td>
      <td>${escapeHtml(r.service)}</td>
      <td>${escapeHtml(r.visitType)}</td>
      <td><span class="status ${r.status === "キャンセル" ? "cancel" : ""}">${escapeHtml(r.status)}</span></td>
      <td>
        <select class="status-select" onchange="updateStatus('${r.id}', this.value)">
          ${["予約済み","受付済み","診察中","診察完了","キャンセル"].map(s => `<option ${r.status === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </td>
    </tr>`).join("");

  const todayStr = new Date().toISOString().split("T")[0];
  const todayList = list.filter(r => r.date === todayStr);
  document.getElementById("todayCount").textContent = todayList.filter(r => r.status !== "キャンセル").length;
  document.getElementById("waitingCount").textContent = list.filter(r => ["予約済み","受付済み"].includes(r.status)).length;
  document.getElementById("doneCount").textContent = list.filter(r => r.status === "診察完了").length;
  document.getElementById("cancelCount").textContent = list.filter(r => r.status === "キャンセル").length;
}

window.updateStatus = function(id, status) {
  const list = getReservations().map(r => r.id === id ? { ...r, status } : r);
  saveReservations(list);
  renderAdmin();
  toast(`ステータスを「${status}」に変更しました`);
};

document.getElementById("adminFilter").addEventListener("change", renderAdmin);

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[m]);
}
