const MAX_BULK_STUDENTS = 1000;

const ROLE = {
  SUPER_ADMIN: "SUPER_ADMIN",
  SCHOOL_ADMIN: "SCHOOL_ADMIN",
  STUDENT: "STUDENT",
};

const appState = {
  user: null,
  view: null,
  loading: true,
  schoolAdminTab: "elections",
  schoolElectionSubTab: "create",
  schoolStudentSubTab: "create",
  editingSchoolId: null,
  editingElectionId: null,
  studentFilterStatus: "all",
  studentFilterStatusDraft: "all",
  studentSearchTerm: "",
  studentSearchDraft: "",
  studentNumberTerm: "",
  studentNumberDraft: "",
  studentFilterGrade: "all",
  studentFilterClass: "all",
  studentFilterGradeDraft: "all",
  studentFilterClassDraft: "all",
  selectedStudentIds: [],
  toast: null,
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function generatePassword(length = 10) {
  const chars = "0123456789";
  let password = "";
  for (let index = 0; index < length; index += 1) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function renderTimeOptions() {
  return Array.from({ length: 48 }, (_, index) => {
    const hour = String(Math.floor(index / 2)).padStart(2, "0");
    const minute = index % 2 === 0 ? "00" : "30";
    const value = `${hour}:${minute}`;
    return `<option value="${value}">${value}</option>`;
  }).join("");
}

function renderTimeOptionsWithSelected(selectedValue = "") {
  return Array.from({ length: 48 }, (_, index) => {
    const hour = String(Math.floor(index / 2)).padStart(2, "0");
    const minute = index % 2 === 0 ? "00" : "30";
    const value = `${hour}:${minute}`;
    return `<option value="${value}" ${selectedValue === value ? "selected" : ""}>${value}</option>`;
  }).join("");
}

function renderGradeOptions(selectedValue = "all", includeAll = true) {
  const options = [];
  if (includeAll) {
    options.push(`<option value="all" ${selectedValue === "all" ? "selected" : ""}>전체</option>`);
  }
  for (let index = 1; index <= 6; index += 1) {
    const value = String(index);
    options.push(`<option value="${value}" ${selectedValue === value ? "selected" : ""}>${value}학년</option>`);
  }
  return options.join("");
}

function toDateInputValue(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toTimeInputValue(value) {
  const date = new Date(value);
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = date.getMinutes() >= 30 ? "30" : "00";
  return `${hour}:${minute}`;
}

function formatDateLabel(value) {
  if (!value) return "-";
  return String(value).replaceAll("-", ". ") + ".";
}

function showToast(message, tone = "success") {
  if (appState.toast?.timer) {
    clearTimeout(appState.toast.timer);
  }
  const timer = setTimeout(() => {
    appState.toast = null;
    renderApp();
  }, 2200);
  appState.toast = { message, tone, timer };
  renderApp();
}

function getElectionStatus(election) {
  if (election.manualControl) {
    if (!election.endAt) return { code: "active", label: "진행 중" };
    return { code: "closed", label: "종료됨" };
  }
  const now = Date.now();
  const start = new Date(election.startAt).getTime();
  const end = new Date(election.endAt).getTime();
  if (now < start) return { code: "upcoming", label: "시작 전" };
  if (now > end) return { code: "closed", label: "종료됨" };
  return { code: "active", label: "진행 중" };
}

function getStudentVotingStatus(student, totalElectionCount) {
  const voteCount = Number(student.voteCount || 0);
  if (voteCount <= 0 || totalElectionCount <= 0) {
    return { code: "not-voted", label: "미투표" };
  }
  if (voteCount >= totalElectionCount) {
    return { code: "completed", label: "투표완료" };
  }
  return { code: "in-progress", label: "투표중" };
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (response.headers.get("Content-Type")?.includes("application/json")) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "요청 처리에 실패했습니다.");
    }
    return data;
  }

  if (!response.ok) {
    throw new Error("요청 처리에 실패했습니다.");
  }

  return response;
}

function downloadCsv(filename, rows) {
  const content = rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function compressImage(file) {
  if (!file) return "";
  if (!(file instanceof Blob)) {
    throw new Error("이미지 파일 형식이 올바르지 않습니다.");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSize = 320;
        const ratio = Math.min(maxSize / image.width, maxSize / image.height, 1);
        const width = Math.max(1, Math.round(image.width * ratio));
        const height = Math.max(1, Math.round(image.height * ratio));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("이미지 처리에 실패했습니다."));
          return;
        }
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.74));
      };
      image.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
      image.src = String(reader.result || "");
    };
    reader.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

function renderApp() {
  const root = document.getElementById("app");
  document.querySelector(".app-shell")?.classList.toggle("guest-mode", !appState.loading && !appState.user);
  if (appState.loading) {
    root.innerHTML = `
      <section class="panel">
        <p class="section-title">불러오는 중</p>
        <p class="muted">서버에서 데이터를 가져오고 있습니다.</p>
      </section>
    `;
    return;
  }

  if (!appState.user) {
    root.innerHTML = renderLogin();
    attachLoginEvents();
    return;
  }

  if (appState.user.role === ROLE.SUPER_ADMIN) {
    root.innerHTML = renderSuperAdmin();
  } else if (appState.user.role === ROLE.SCHOOL_ADMIN) {
    root.innerHTML = renderSchoolAdmin();
  } else {
    root.innerHTML = renderStudent();
  }

  if (appState.toast) {
    root.insertAdjacentHTML("beforeend", `
      <div class="app-toast app-toast-${escapeHtml(appState.toast.tone)}" role="status" aria-live="polite">
        ${escapeHtml(appState.toast.message)}
      </div>
    `);
  }

  attachSharedEvents();
}

function renderPageHeader({ roleLabel, title, description, actions = "" }) {
  return `
    <div class="page-header">
      <div class="page-header-main">
        <span class="pill">${escapeHtml(roleLabel)}</span>
        <div>
          <h2 class="page-title">${escapeHtml(title)}</h2>
          <p class="page-description">${escapeHtml(description)}</p>
        </div>
      </div>
      <div class="page-actions">${actions}</div>
    </div>
  `;
}

function renderStatCard(label, value, tone = "") {
  return `
    <article class="stat-card ${tone}">
      <span>${escapeHtml(label)}</span>
      <strong>${value}</strong>
    </article>
  `;
}

function renderLogin() {
  return `
    <section class="auth-stage">
      <article class="panel auth-card">
        <p class="section-title">로그인</p>
        <form id="login-form">
          <label>아이디<input name="username" required></label>
          <label>비밀번호<input name="password" type="password" required></label>
          <button type="submit">로그인</button>
        </form>
        <p class="muted auth-footnote">관리자 계정 정보는 별도로 안전하게 관리해주세요.</p>
      </article>
    </section>
  `;
}

function renderSuperAdmin() {
  const overview = appState.view;
  const schools = overview?.schools || [];
  const schoolOptions = schools.length
    ? schools.map((school) => `<option value="${school.id}">${escapeHtml(school.name)}</option>`).join("")
    : `<option value="">생성된 학교가 없습니다</option>`;

  return `
    <section>
      ${renderPageHeader({
        roleLabel: "운영자",
        title: `${appState.user.name}님, 학교 운영 구조를 관리하고 있습니다.`,
        description: "학교 생성과 학교 어드민 발급을 한 화면에서 처리하고 전체 현황을 빠르게 확인할 수 있습니다.",
        actions: `<button class="secondary" id="logout-button">로그아웃</button>`,
      })}

      <div class="stats-grid">
        ${renderStatCard("학교 수", overview.stats.schoolCount, "tone-warm")}
        ${renderStatCard("학교 어드민 수", overview.stats.schoolAdminCount)}
        ${renderStatCard("학생 수", overview.stats.studentCount)}
        ${renderStatCard("투표 수", overview.stats.electionCount, "tone-cool")}
      </div>

      <div class="dashboard-grid">
        <article class="panel">
          <div class="panel-header">
            <p class="section-kicker">Create</p>
            <p class="section-title">학교 생성</p>
            <p class="panel-copy">서비스에 새 학교를 등록하고 학교 코드를 부여합니다.</p>
          </div>
          <form id="school-form">
            <label>학교명<input name="name" required></label>
            <label>학교 코드<input name="code" required></label>
            <label class="toggle">
              <input type="checkbox" class="toggle-input date-period-toggle" checked>
              <span class="toggle-slider" aria-hidden="true"></span>
              <span class="toggle-label">사용 기간 지정</span>
            </label>
            <div class="split-fields date-fields-wrap">
              <label class="date-field">사용 시작일<input name="accessStartDate" type="date" required></label>
              <label class="date-field">사용 종료일<input name="accessEndDate" type="date" required></label>
            </div>
            <button type="submit">학교 생성</button>
          </form>
        </article>
        <article class="panel">
          <div class="panel-header">
            <p class="section-kicker">Create</p>
            <p class="section-title">학교 어드민 생성</p>
            <p class="panel-copy">학교별 운영 담당자 계정을 발급합니다.</p>
          </div>
          <form id="school-admin-form">
            <label>학교 선택<select name="schoolId" ${schools.length ? "" : "disabled"} required>${schoolOptions}</select></label>
            <label>이름<input name="name" required></label>
            <label>아이디<input name="username" required></label>
            <label>비밀번호<input name="password" type="password" required></label>
            <button type="submit" ${schools.length ? "" : "disabled"}>학교 어드민 생성</button>
          </form>
        </article>
      </div>

      <section class="list-grid">
        <article class="list-card">
          <div class="panel-header">
            <p class="section-kicker">Directory</p>
            <p class="section-title">등록된 학교</p>
          </div>
          <ul>
            ${schools.length ? schools.map((school) => `
              ${(() => {
                const isEditing = appState.editingSchoolId === school.id;
                return `
              <li class="list-item">
                <div class="item-head">
                  <div class="school-title-wrap">
                    <strong>${escapeHtml(school.name)}</strong>
                    <span class="pill subtle">CODE ${escapeHtml(school.code)}</span>
                    <span class="pill ${school.enabled ? "pill-voted" : "pill-completed"}">${school.enabled ? "사용 중" : "중지"}</span>
                  </div>
                </div>
                <p>사용 기간: ${escapeHtml(formatDateLabel(school.accessStartDate))} ~ ${escapeHtml(formatDateLabel(school.accessEndDate))}</p>
                <p>선생님: ${school.admin ? `${escapeHtml(school.admin.name)} (${escapeHtml(school.admin.username)})` : "없음"}</p>
                <p class="muted">학생 수 ${school.studentCount}명 · 투표 수 ${school.electionCount}개</p>
                <div class="section-actions school-card-actions">
                  <button class="secondary" type="button" data-action="toggle-school-edit" data-school-id="${school.id}">
                    ${isEditing ? "수정 닫기" : "학교 수정"}
                  </button>
                  <button class="secondary election-delete-button" type="button" data-action="delete-school" data-school-id="${school.id}">삭제</button>
                </div>
                ${isEditing ? `
                  <form class="inline-edit-form" data-school-edit-form="${school.id}">
                    <label>학교명<input name="name" value="${escapeHtml(school.name)}" required></label>
                    <label>학교 코드<input name="code" value="${escapeHtml(school.code)}" required></label>
                    <label class="toggle">
                      <input type="checkbox" class="toggle-input date-period-toggle" ${school.accessStartDate ? "checked" : ""}>
                      <span class="toggle-slider" aria-hidden="true"></span>
                      <span class="toggle-label">사용 기간 지정</span>
                    </label>
                    <div class="split-fields date-fields-wrap" ${!school.accessStartDate ? 'style="display:none"' : ""}>
                      <label class="date-field">사용 시작일<input name="accessStartDate" type="date" value="${escapeHtml(school.accessStartDate || "")}"></label>
                      <label class="date-field">사용 종료일<input name="accessEndDate" type="date" value="${escapeHtml(school.accessEndDate || "")}"></label>
                    </div>
                    ${school.admin ? `
                      <div class="split-fields">
                        <label>어드민 이름<input name="adminName" value="${escapeHtml(school.admin.name)}" required></label>
                        <label>어드민 아이디<input name="adminUsername" value="${escapeHtml(school.admin.username)}" required></label>
                      </div>
                      <label>새 어드민 비밀번호<input name="adminPassword" type="password" placeholder="변경할 때만 입력"></label>
                    ` : `<div class="status compact">학교 어드민이 아직 생성되지 않았습니다.</div>`}
                    <input type="hidden" name="enabled" value="${school.enabled ? "true" : "false"}">
                    <div class="section-actions school-card-actions">
                      <button type="submit">학교 정보 저장</button>
                    </div>
                  </form>
                ` : ""}
              </li>
            `;
              })()}
            `).join("") : `<li class="empty">아직 생성된 학교가 없습니다.</li>`}
          </ul>
        </article>
      </section>
    </section>
  `;
}

function renderCandidateField(candidate = {}, index = 0) {
  const hasPhoto = Boolean(candidate.photo);
  return `
    <div class="candidate-field" data-candidate-row draggable="true">
      <div class="row-between">
        <div class="candidate-field-head">
          <button class="candidate-drag-handle" type="button" tabindex="-1" aria-label="후보 순서 이동">
            <img src="move.svg" alt="" aria-hidden="true">
          </button>
          <p class="field-title">후보자 ${index + 1}</p>
        </div>
        <button class="danger candidate-remove-button" type="button" data-action="remove-candidate">삭제</button>
      </div>
      <input type="hidden" name="candidateId" value="${escapeHtml(candidate.id || "")}">
      <input type="hidden" name="candidatePhotoValue" value="${escapeHtml(candidate.photo || "")}">
      <label>이름<input name="candidateName" value="${escapeHtml(candidate.name || "")}" required></label>
      <label>설명<input name="candidateDescription" placeholder="후보 설명" value="${escapeHtml(candidate.description || "")}"></label>
      ${hasPhoto ? `<div class="candidate-photo-preview"><img class="candidate-photo" src="${candidate.photo}" alt="${escapeHtml(candidate.name || "후보")} 사진"></div>` : ""}
      <label>사진<input name="candidatePhoto" type="file" accept="image/*"></label>
    </div>
  `;
}

function renderCandidateMedia(candidate) {
  if (candidate.photo) {
    return `<img class="candidate-photo" src="${candidate.photo}" alt="${escapeHtml(candidate.name)} 사진">`;
  }
  return `<div class="candidate-photo placeholder">사진 없음</div>`;
}

function renderCandidateBuilder(options = {}) {
  const builderId = options.builderId || "candidate-builder";
  const candidates = options.candidates?.length ? options.candidates : [{}, {}];
  return `
    <div class="candidate-builder" data-candidate-builder="${builderId}">
      <div class="candidate-builder-header">
        <div>
          <p class="field-title">후보자 설정</p>
          <p class="muted helper">최소 2명의 후보가 필요하며 사진은 자동으로 축소됩니다.</p>
        </div>
        <button class="secondary" type="button" data-action="add-candidate" data-builder-id="${builderId}">후보자 추가</button>
      </div>
      <div class="candidate-list" data-candidate-list="${builderId}">
        ${candidates.map((candidate, index) => renderCandidateField(candidate, index)).join("")}
      </div>
    </div>
  `;
}

function renderResultsBox(election, isStudent = false) {
  const results = election.results || [];
  if (isStudent && !election.resultsVisible) return "";
  return `
    <div class="results-box ${isStudent ? "results-box-student" : "results-box-admin"}">
      <p class="muted">총 투표 수: ${election.totalVotes ?? results.reduce((sum, item) => sum + item.voteCount, 0)}표</p>
      <ul class="results-list">
        ${results.map((candidate) => `
          <li class="result-item">
            <div class="candidate-meta">
              ${renderCandidateMedia(candidate)}
              <div>
                <strong>${escapeHtml(candidate.name)}</strong>
                ${candidate.description ? `<p class="muted">${escapeHtml(candidate.description)}</p>` : ""}
              </div>
            </div>
            <p class="result-vote-meta">${candidate.voteCount}표 · ${candidate.rate}%</p>
            <div class="result-bar-track"><div class="result-bar-fill" style="width: ${candidate.rate}%"></div></div>
          </li>
        `).join("")}
      </ul>
    </div>
  `;
}

function renderSchoolAdmin() {
  const dashboard = appState.view;
  const school = dashboard.school;
  const students = dashboard.students || [];
  const elections = dashboard.elections || [];
  const totalElectionCount = Number(dashboard.stats?.electionCount || 0);
  const activeTab = appState.schoolAdminTab || "elections";
  const isElectionTab = activeTab === "elections";
  const activeElectionSubTab = appState.schoolElectionSubTab || "create";
  const activeStudentSubTab = appState.schoolStudentSubTab || "create";
  const normalizedSearch = (appState.studentSearchTerm || "").trim().toLowerCase();
  const filteredStudents = students.filter((student) => {
    const votingStatus = getStudentVotingStatus(student, totalElectionCount);
    const matchesStatus =
      appState.studentFilterStatus === "all" ||
      appState.studentFilterStatus === votingStatus.code;
    const matchesSearch =
      !normalizedSearch || student.name.toLowerCase().includes(normalizedSearch);
    const normalizedStudentNumber = (appState.studentNumberTerm || "").trim();
    const matchesStudentNumber =
      !normalizedStudentNumber || String(student.studentNumber || "").includes(normalizedStudentNumber);
    const matchesGrade =
      appState.studentFilterGrade === "all" ||
      String(student.grade || "") === appState.studentFilterGrade;
    const matchesClass =
      appState.studentFilterClass === "all" ||
      String(student.className || "") === appState.studentFilterClass;
    return matchesStatus && matchesSearch && matchesStudentNumber && matchesGrade && matchesClass;
  });
  const visibleStudents = filteredStudents.slice(0, 200);
  const selectedStudentIds = new Set(appState.selectedStudentIds || []);
  const selectedVisibleCount = visibleStudents.filter((student) => selectedStudentIds.has(student.id)).length;
  const allVisibleSelected = visibleStudents.length > 0 && selectedVisibleCount === visibleStudents.length;

  return `
    <section>
      ${renderPageHeader({
        roleLabel: "선생님",
        title: `${school?.name || ""} 운영 대시보드`,
        description: `${appState.user.name}님이 투표 개설과 학생 계정 관리를 진행할 수 있는 화면입니다.`,
        actions: `<button class="secondary" id="logout-button">로그아웃</button>`,
      })}

      <div class="stats-grid school-admin-stats-grid">
        ${renderStatCard("투표 수", dashboard.stats.electionCount)}
        ${renderStatCard("학생 수", dashboard.stats.studentCount)}
        ${renderStatCard("투표 참여 수", dashboard.stats.voteCount, "tone-cool")}
      </div>

      <div class="content-subtabs admin-main-tabs" role="tablist" aria-label="학교 운영 탭">
        <button class="content-subtab-button ${isElectionTab ? "active" : ""}" type="button" data-action="switch-admin-tab" data-tab="elections">투표 관리</button>
        <button class="content-subtab-button ${!isElectionTab ? "active" : ""}" type="button" data-action="switch-admin-tab" data-tab="students">학생 관리</button>
      </div>

      ${isElectionTab ? `
        <section class="admin-stack admin-content">
          <div class="content-subtabs" role="tablist" aria-label="투표 관리 세부 탭">
            <button class="content-subtab-button ${activeElectionSubTab === "create" ? "active" : ""}" type="button" data-action="switch-admin-subtab" data-group="elections" data-subtab="create">투표 생성</button>
            <button class="content-subtab-button ${activeElectionSubTab === "status" ? "active" : ""}" type="button" data-action="switch-admin-subtab" data-group="elections" data-subtab="status">투표 현황</button>
          </div>

          ${activeElectionSubTab === "create" ? `
          <article class="panel wide-panel">
            <div class="panel-header">
              <p class="section-kicker">Election Studio</p>
              <p class="section-title">투표 생성</p>
              <p class="panel-copy">제목, 일정, 후보자 구성을 한 번에 설정합니다.</p>
            </div>
            <form id="election-form">
              <label>투표 제목<input name="title" required></label>
              <label>설명<input name="description"></label>
              <!-- 대상 학년 기능은 잠시 비활성화 -->
              <div class="schedule-block">
                <label class="toggle">
                  <input type="checkbox" class="toggle-input" id="election-time-toggle">
                  <span class="toggle-slider" aria-hidden="true"></span>
                  <span class="toggle-label">투표 시간 지정</span>
                </label>
                <div class="schedule-fields" id="election-schedule-fields" style="display:none">
                  <label class="date-field schedule-input"><input name="startDate" type="date" aria-label="시작 날짜"></label>
                  <label class="select-field schedule-input"><select name="startTime" class="time-select" aria-label="시작 시간">${renderTimeOptions()}</select></label>
                  <span class="schedule-divider" aria-hidden="true">~</span>
                  <label class="date-field schedule-input"><input name="endDate" type="date" aria-label="종료 날짜"></label>
                  <label class="select-field schedule-input"><select name="endTime" class="time-select" aria-label="종료 시간">${renderTimeOptions()}</select></label>
                </div>
              </div>
              ${renderCandidateBuilder({ builderId: "create-candidates" })}
              <div class="form-actions">
                <button type="submit">투표 생성</button>
              </div>
            </form>
          </article>
          ` : ""}

          ${activeElectionSubTab === "status" ? `
          <article class="list-card wide-panel">
            <div class="panel-header">
              <p class="section-kicker">Election Feed</p>
              <p class="section-title">내 학교의 투표</p>
            </div>
            <ul>
              ${elections.length ? elections.map((election) => {
                const status = getElectionStatus(election);
                const isEditing = appState.editingElectionId === election.id;
                return `
                  <li class="list-item election-list-item ${isEditing ? "is-editing" : ""}">
                    <div class="row-between election-head">
                      <div class="election-title-wrap">
                        <strong>${escapeHtml(election.title)}</strong>
                        <span class="pill pill-election-${status.code}">${status.label}</span>
                      </div>
                      <p class="election-meta-inline">${election.manualControl ? "수동 제어" : `시작 시점 ${escapeHtml(formatDateTime(election.startAt))} ~ 종료 시점 ${escapeHtml(formatDateTime(election.endAt))}`}</p>
                    </div>
                    ${election.description ? `<p class="muted">${escapeHtml(election.description)}</p>` : ""}
                    ${isEditing ? `
                      <form class="inline-edit-form" data-election-edit-form="${election.id}">
                        <label>투표 제목<input name="title" value="${escapeHtml(election.title)}" required></label>
                        <label>설명<input name="description" value="${escapeHtml(election.description)}"></label>
                        <!-- 대상 학년 기능은 잠시 비활성화 -->
                        <div class="schedule-block">
                          <label class="toggle">
                            <input type="checkbox" class="toggle-input" data-action="toggle-edit-election-time" ${!election.manualControl ? "checked" : ""}>
                            <span class="toggle-slider" aria-hidden="true"></span>
                            <span class="toggle-label">투표 시간 지정</span>
                          </label>
                          <div class="schedule-fields" ${election.manualControl ? 'style="display:none"' : ""}>
                            <label class="date-field schedule-input"><input name="startDate" type="date" value="${election.manualControl ? "" : toDateInputValue(election.startAt)}" aria-label="시작 날짜"></label>
                            <label class="select-field schedule-input"><select name="startTime" class="time-select" aria-label="시작 시간">${renderTimeOptionsWithSelected(election.manualControl ? "" : toTimeInputValue(election.startAt))}</select></label>
                            <span class="schedule-divider" aria-hidden="true">~</span>
                            <label class="date-field schedule-input"><input name="endDate" type="date" value="${election.manualControl ? "" : toDateInputValue(election.endAt)}" aria-label="종료 날짜"></label>
                            <label class="select-field schedule-input"><select name="endTime" class="time-select" aria-label="종료 시간">${renderTimeOptionsWithSelected(election.manualControl ? "" : toTimeInputValue(election.endAt))}</select></label>
                          </div>
                        </div>
                        ${renderCandidateBuilder({ builderId: `edit-${election.id}`, candidates: election.results || [] })}
                        <div class="form-actions inline-edit-actions">
                          <button class="secondary" type="button" data-action="cancel-election-edit" data-election-id="${election.id}">취소</button>
                          <button type="submit">수정 저장</button>
                        </div>
                      </form>
                    ` : ""}
                    ${isEditing ? "" : `
                      <label class="check-row">
                        <input type="checkbox" data-action="toggle-results-visible" data-election-id="${election.id}" ${election.resultsVisible ? "checked" : ""}>
                        <span>체크 시, 학생에게 투표 결과가 공개됩니다.</span>
                      </label>
                      ${renderResultsBox(election)}
                      <div class="election-card-footer">
                        <label class="toggle election-progress-toggle danger-toggle">
                          <input
                            type="checkbox"
                            class="toggle-input"
                            data-action="close-election-toggle"
                            data-election-id="${election.id}"
                            ${status.code === "active" ? "checked" : ""}
                            ${status.code === "active" ? "" : "disabled"}
                          >
                          <span class="toggle-slider" aria-hidden="true"></span>
                          <span class="toggle-label">${status.code === "active" ? "투표 진행" : "투표 종료"}</span>
                        </label>
                        <div class="section-actions election-card-actions">
                          <a class="button-link" href="/api/admin/elections/${election.id}/export">결과 CSV 다운로드</a>
                          <button class="secondary election-edit-button" type="button" data-action="toggle-election-edit" data-election-id="${election.id}">수정</button>
                          <button class="secondary election-delete-button" type="button" data-action="delete-election" data-election-id="${election.id}">삭제</button>
                        </div>
                      </div>
                    `}
                  </li>
                `;
              }).join("") : `<li class="empty">생성된 투표가 없습니다.</li>`}
            </ul>
          </article>
          ` : ""}
        </section>
      ` : `
        <section class="admin-stack admin-content">
          <div class="content-subtabs" role="tablist" aria-label="학생 관리 세부 탭">
            <button class="content-subtab-button ${activeStudentSubTab === "create" ? "active" : ""}" type="button" data-action="switch-admin-subtab" data-group="students" data-subtab="create">계정 생성</button>
            <button class="content-subtab-button ${activeStudentSubTab === "manage" ? "active" : ""}" type="button" data-action="switch-admin-subtab" data-group="students" data-subtab="manage">계정 관리</button>
          </div>

          ${activeStudentSubTab === "create" ? `
          <div class="dashboard-grid student-admin-grid account-create-grid">
            <article class="panel split-panel split-panel-secondary">
              <div class="panel-header">
                <p class="section-kicker">Bulk Create</p>
                <p class="section-title">학생 엑셀 업로드</p>
                <p class="panel-copy">학년, 반, 이름이 들어 있는 엑셀 파일을 올리면 이름 기반 아이디와 비밀번호를 자동 생성합니다.</p>
              </div>
              <div class="row-between section-tools">
                <p class="muted helper">샘플 양식을 내려받아 그대로 작성한 뒤 업로드하면 됩니다.</p>
                <a class="button-link" href="/api/admin/students/template">양식 다운로드</a>
              </div>
              <form id="bulk-student-form">
                <label>엑셀 파일<input name="studentSheet" type="file" accept=".xlsx,.csv" required></label>
                <div class="status compact">
                  샘플과 같은 <code>이름</code>, <code>학년</code>, <code>학반</code>, <code>학번</code> 형식을 지원합니다. 엑셀(.xlsx) 또는 CSV 파일로 최대 ${MAX_BULK_STUDENTS}명까지 업로드할 수 있습니다.
                </div>
                <button type="submit">학생 계정 생성</button>
              </form>
              <div id="bulk-create-result"></div>
            </article>

            <div class="account-create-divider vertical" aria-hidden="true"></div>

            <article class="panel split-panel split-panel-primary">
              <div class="panel-header">
                <p class="section-kicker">Account</p>
                <p class="section-title">학생 계정 생성</p>
                <p class="panel-copy">단일 학생 계정을 바로 발급하고 CSV로 내려받습니다.</p>
              </div>
              <form id="student-form">
                <label>이름<input name="name" required></label>
                <div class="split-fields">
                  <label class="select-field">학년
                    <select name="grade">
                      <option value="">선택 안 함</option>
                      ${Array.from({ length: 6 }, (_, index) => `<option value="${index + 1}">${index + 1}학년</option>`).join("")}
                    </select>
                  </label>
                  <label class="select-field">반
                    <select name="className">
                      <option value="">선택 안 함</option>
                      ${Array.from({ length: 10 }, (_, index) => `<option value="${index + 1}">${index + 1}반</option>`).join("")}
                    </select>
                  </label>
                </div>
                <label>번호<input name="studentNumber" inputmode="numeric" placeholder="예: 12"></label>
                <div class="status compact">
                  아이디는 학생 이름과 고유번호를 조합해서 자동 생성됩니다.
                </div>
                <label class="toggle">
                  <input type="checkbox" class="toggle-input" id="student-password-mode">
                  <span class="toggle-slider" aria-hidden="true"></span>
                  <span class="toggle-label">비밀번호 직접 설정</span>
                </label>
                <label id="student-password-field" class="hidden-field">비밀번호<input name="password" autocomplete="new-password"></label>
                <button type="submit">학생 생성</button>
              </form>
              <div id="single-create-result"></div>
            </article>
          </div>
          ` : ""}

          ${activeStudentSubTab === "manage" ? `
          <article class="list-card wide-panel">
            <div class="panel-header">
              <p class="section-kicker">Student Directory</p>
              <p class="section-title">내 학교의 학생 계정</p>
            </div>
            <div class="student-filter-panel">
              <form id="student-filter-form" class="student-filter-form">
                <div class="filter-group">
                  <p class="filter-group-label">투표 상태</p>
                  <div class="student-filters" role="tablist" aria-label="학생 투표 상태 필터">
                    <button class="filter-chip ${appState.studentFilterStatusDraft === "all" ? "active" : ""}" type="button" data-action="filter-students" data-filter="all">전체</button>
                    <button class="filter-chip ${appState.studentFilterStatusDraft === "not-voted" ? "active" : ""}" type="button" data-action="filter-students" data-filter="not-voted">미투표</button>
                    <button class="filter-chip ${appState.studentFilterStatusDraft === "in-progress" ? "active" : ""}" type="button" data-action="filter-students" data-filter="in-progress">투표중</button>
                    <button class="filter-chip ${appState.studentFilterStatusDraft === "completed" ? "active" : ""}" type="button" data-action="filter-students" data-filter="completed">투표 완료</button>
                  </div>
                </div>
                <div class="filter-group filter-group-student">
                  <p class="filter-group-label">학생 정보</p>
                  <div class="student-info-fields">
                    <label class="mini-filter select-field">
                      <select id="student-grade-filter" aria-label="학년">
                        <option value="all">학년</option>
                        ${Array.from({ length: 6 }, (_, index) => {
                          const value = String(index + 1);
                          return `<option value="${value}" ${appState.studentFilterGradeDraft === value ? "selected" : ""}>${value}학년</option>`;
                        }).join("")}
                      </select>
                    </label>
                    <label class="mini-filter select-field">
                      <select id="student-class-filter" aria-label="반">
                        <option value="all">반</option>
                        ${Array.from({ length: 10 }, (_, index) => {
                          const value = String(index + 1);
                          return `<option value="${value}" ${appState.studentFilterClassDraft === value ? "selected" : ""}>${value}반</option>`;
                        }).join("")}
                      </select>
                    </label>
                    <label class="mini-filter">
                      <input id="student-number-input" type="search" inputmode="numeric" placeholder="번호" value="${escapeHtml(appState.studentNumberDraft || "")}">
                    </label>
                    <label class="search-field">
                      <input id="student-search-input" type="search" placeholder="이름" value="${escapeHtml(appState.studentSearchDraft || "")}">
                    </label>
                  </div>
                </div>
                <div class="student-filter-actions">
                  <button type="submit" id="student-filter-submit">검색</button>
                </div>
              </form>
            </div>
            <div class="row-between section-tools">
              <p class="muted helper">선택한 학생만 내려받거나 전체 목록 CSV를 받을 수 있습니다.</p>
              <div class="section-actions">
                <button class="secondary" type="button" id="download-selected-students" ${selectedStudentIds.size ? "" : "disabled"}>선택 학생 CSV 다운로드</button>
                <a class="button-link" href="/api/admin/students/export">전체 학생 CSV 다운로드</a>
              </div>
            </div>
            ${filteredStudents.length ? `
              <div class="student-table-wrap">
                <table class="student-table">
                  <thead>
                    <tr>
                      <th class="checkbox-cell">
                        <input id="select-all-visible-students" type="checkbox" ${allVisibleSelected ? "checked" : ""} aria-label="현재 보이는 학생 전체 선택">
                      </th>
                      <th>상태</th>
                      <th>이름</th>
                      <th>학년, 반, 번호</th>
                      <th>ID</th>
                      <th>PW</th>
                      <th>생성일</th>
                      <th>참여투표</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${visibleStudents.map((student) => {
                      const votingStatus = getStudentVotingStatus(student, totalElectionCount);
                      return `
                        <tr>
                          <td class="checkbox-cell">
                            <input type="checkbox" data-action="select-student" data-student-id="${student.id}" ${selectedStudentIds.has(student.id) ? "checked" : ""} aria-label="${escapeHtml(student.name)} 선택">
                          </td>
                          <td><span class="pill pill-${votingStatus.code}">${votingStatus.label}</span></td>
                          <td class="student-name-cell">${escapeHtml(student.name)}</td>
                          <td>${escapeHtml(student.grade || "-")} / ${escapeHtml(student.className || "-")} / ${escapeHtml(student.studentNumber || "-")}</td>
                          <td class="mono-cell">${escapeHtml(student.username)}</td>
                          <td class="mono-cell">${student.password ? escapeHtml(student.password) : "확인 불가"}</td>
                          <td>${escapeHtml(formatDateTime(student.createdAt))}</td>
                          <td>${student.voteCount || 0} / ${totalElectionCount}</td>
                        </tr>
                      `;
                    }).join("")}
                  </tbody>
                </table>
              </div>
            ` : `<div class="empty">조건에 맞는 학생 계정이 없습니다.</div>`}
          </article>
          ` : ""}
        </section>
      `}
    </section>
  `;
}

function renderStudent() {
  const dashboard = appState.view;
  const elections = dashboard.elections || [];

  return `
    <section>
      ${renderPageHeader({
        roleLabel: "학생",
        title: `${dashboard.school?.name || ""}`,
        description: `${appState.user.name}님이 참여 가능한 투표와 공개된 결과를 확인할 수 있습니다.`,
        actions: `<button class="secondary" id="logout-button">로그아웃</button>`,
      })}

      <div class="stats-grid student-stats-grid">
        ${renderStatCard("참여 가능 투표", dashboard.stats.electionCount)}
        ${renderStatCard("완료한 투표", dashboard.stats.completedVotes)}
      </div>

      <section class="vote-grid">
        ${elections.length ? elections.map((election) => {
          const status = getElectionStatus(election);
          const existingVote = election.existingVote;
          const canVote = status.code === "active" && !existingVote;
          return `
            <article class="vote-card">
              <div class="row-between">
                <p class="section-title">${escapeHtml(election.title)}</p>
                <span class="pill pill-election-${status.code}">${status.label}</span>
              </div>
              ${election.description ? `<p class="muted">${escapeHtml(election.description)}</p>` : ""}
              <div class="detail-grid">
                <p>시작: ${escapeHtml(formatDateTime(election.startAt))}</p>
                <p>종료: ${escapeHtml(formatDateTime(election.endAt))}</p>
              </div>
              ${existingVote ? `<div class="status">이미 이 투표에 참여했습니다. 선택 후보: ${escapeHtml(existingVote.candidateName)}</div>` : ""}
              <ul>
                ${election.candidates.map((candidate) => `
                  <li class="candidate-item">
                    <div class="candidate-meta">
                      ${renderCandidateMedia(candidate)}
                      <div>
                        <strong>${escapeHtml(candidate.name)}</strong>
                        ${candidate.description ? `<p class="muted">${escapeHtml(candidate.description)}</p>` : ""}
                      </div>
                    </div>
                    ${canVote ? `
                      <button data-action="vote" data-election-id="${election.id}" data-candidate-id="${candidate.id}" data-candidate-name="${escapeHtml(candidate.name)}">
                        투표하기
                      </button>
                    ` : ""}
                    ${election.resultsVisible ? `<p class="result-vote-meta">${candidate.voteCount}표 · ${candidate.rate}%</p>` : ""}
                    ${election.resultsVisible ? `<div class="result-bar-track"><div class="result-bar-fill" style="width: ${candidate.rate}%"></div></div>` : ""}
                  </li>
                `).join("")}
              </ul>
            </article>
          `;
        }).join("") : `<div class="empty">참여 가능한 투표가 없습니다.</div>`}
      </section>
    </section>
  `;
}

function attachLoginEvents() {
  const loginForm = document.getElementById("login-form");
  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    try {
      await api("/api/login", {
        method: "POST",
        body: JSON.stringify({
          username: String(formData.get("username")).trim(),
          password: String(formData.get("password")).trim(),
        }),
      });
      await refreshSession();
    } catch (error) {
      alert(error.message);
    }
  });
}

function attachCandidateBuilder() {
  document.querySelectorAll("[data-candidate-builder]").forEach((builder) => {
    const builderId = String(builder.dataset.candidateBuilder || "");
    const list = builder.querySelector(`[data-candidate-list="${builderId}"]`);
    const addButton = builder.querySelector(`[data-action="add-candidate"][data-builder-id="${builderId}"]`);
    if (!list || !addButton) return;

    function syncRows() {
      [...list.querySelectorAll("[data-candidate-row]")].forEach((row, index, rows) => {
        row.querySelector(".field-title").textContent = `후보자 ${index + 1}`;
        row.querySelector('[data-action="remove-candidate"]').disabled = rows.length <= 2;
      });
      list.querySelectorAll('[data-action="remove-candidate"]').forEach((button) => {
        button.onclick = () => {
          button.closest("[data-candidate-row]")?.remove();
          syncRows();
        };
      });
    }

    let draggedRow = null;

    list.addEventListener("dragstart", (event) => {
      const row = event.target.closest("[data-candidate-row]");
      if (!row) return;
      draggedRow = row;
      row.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
    });

    list.addEventListener("dragend", (event) => {
      const row = event.target.closest("[data-candidate-row]");
      row?.classList.remove("dragging");
      draggedRow = null;
    });

    list.addEventListener("dragover", (event) => {
      event.preventDefault();
      const row = event.target.closest("[data-candidate-row]");
      if (!draggedRow || !row || row === draggedRow) return;
      const rect = row.getBoundingClientRect();
      const isAfter = event.clientY > rect.top + rect.height / 2;
      if (isAfter) {
        row.after(draggedRow);
      } else {
        row.before(draggedRow);
      }
    });

    list.addEventListener("drop", () => {
      syncRows();
    });

    addButton.onclick = () => {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = renderCandidateField({}, list.children.length);
      list.appendChild(wrapper.firstElementChild);
      syncRows();
    };

    syncRows();
  });
}

function attachSharedEvents() {
  document.getElementById("logout-button")?.addEventListener("click", async () => {
    try {
      await api("/api/logout", { method: "POST", body: JSON.stringify({}) });
    } finally {
      await refreshSession();
    }
  });

  if (appState.user.role === ROLE.SUPER_ADMIN) {
    attachSuperAdminEvents();
  } else if (appState.user.role === ROLE.SCHOOL_ADMIN) {
    attachSchoolAdminEvents();
  } else {
    attachStudentEvents();
  }
}

function attachSuperAdminEvents() {
  document.getElementById("school-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const dateWrap = form.querySelector(".date-fields-wrap");
    const datesHidden = dateWrap && dateWrap.style.display === "none";
    try {
      await api("/api/schools", {
        method: "POST",
        body: JSON.stringify({
          name: String(formData.get("name")).trim(),
          code: String(formData.get("code")).trim(),
          accessStartDate: datesHidden ? "" : String(formData.get("accessStartDate")).trim(),
          accessEndDate: datesHidden ? "" : String(formData.get("accessEndDate")).trim(),
        }),
      });
      form.reset();
      const createToggle = form.querySelector(".date-period-toggle");
      const createDateWrap = form.querySelector(".date-fields-wrap");
      if (createToggle) createToggle.checked = true;
      if (createDateWrap) createDateWrap.style.display = "";
      await loadRoleView();
      showToast("학교가 생성되었습니다.");
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById("school-admin-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      await api("/api/school-admins", {
        method: "POST",
        body: JSON.stringify({
          schoolId: String(formData.get("schoolId")).trim(),
          name: String(formData.get("name")).trim(),
          username: String(formData.get("username")).trim(),
          password: String(formData.get("password")).trim(),
        }),
      });
      event.currentTarget.reset();
      await loadRoleView();
      showToast("학교 계정이 생성되었습니다.");
    } catch (error) {
      alert(error.message);
    }
  });

  document.querySelectorAll('[data-action="toggle-school-edit"]').forEach((button) => {
    button.addEventListener("click", () => {
      const schoolId = String(button.dataset.schoolId || "");
      appState.editingSchoolId = appState.editingSchoolId === schoolId ? null : schoolId;
      renderApp();
    });
  });

  document.querySelectorAll("[data-school-edit-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const schoolId = String(form.dataset.schoolEditForm || "");
      try {
        const dateWrap = form.querySelector(".date-fields-wrap");
        const datesHidden = dateWrap && dateWrap.style.display === "none";
        await api(`/api/schools/${schoolId}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: String(form.elements.name.value || "").trim(),
            code: String(form.elements.code.value || "").trim(),
            accessStartDate: datesHidden ? "" : String(form.elements.accessStartDate?.value || "").trim(),
            accessEndDate: datesHidden ? "" : String(form.elements.accessEndDate?.value || "").trim(),
            enabled: String(form.elements.enabled?.value || "true") === "true",
            adminName: String(form.elements.adminName?.value || "").trim(),
            adminUsername: String(form.elements.adminUsername?.value || "").trim(),
            adminPassword: String(form.elements.adminPassword?.value || "").trim(),
          }),
        });
        appState.editingSchoolId = null;
        await loadRoleView();
        showToast("학교 정보가 수정되었습니다.");
      } catch (error) {
        alert(error.message);
      }
    });
  });

  document.querySelectorAll(".date-period-toggle").forEach((input) => {
    input.addEventListener("change", () => {
      const form = input.closest("form");
      if (!form) return;
      const dateWrap = form.querySelector(".date-fields-wrap");
      if (dateWrap) dateWrap.style.display = input.checked ? "" : "none";
    });
  });

  document.querySelectorAll('[data-action="toggle-school-enabled"]').forEach((input) => {
    input.addEventListener("change", async () => {
      const school = (appState.view?.schools || []).find((item) => item.id === String(input.dataset.schoolId || ""));
      if (!school) return;
      try {
        await api(`/api/schools/${school.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: school.name,
            code: school.code,
            accessStartDate: school.accessStartDate,
            accessEndDate: school.accessEndDate,
            enabled: input.checked,
            adminName: String(school.admin?.name || "").trim(),
            adminUsername: String(school.admin?.username || "").trim(),
          }),
        });
        await loadRoleView();
        showToast(input.checked ? "학교가 사용 상태로 변경되었습니다." : "학교가 중지 상태로 변경되었습니다.");
      } catch (error) {
        input.checked = !input.checked;
        alert(error.message);
      }
    });
  });

  document.querySelectorAll('[data-action="delete-school"]').forEach((button) => {
    button.addEventListener("click", async () => {
      const confirmed = window.confirm("학교와 연결된 어드민, 학생, 투표 데이터를 모두 삭제할까요?");
      if (!confirmed) return;
      try {
        await fetch(`/api/schools/${button.dataset.schoolId}`, {
          method: "DELETE",
          credentials: "same-origin",
        }).then(async (response) => {
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || "요청 처리에 실패했습니다.");
          }
        });
        if (appState.editingSchoolId === String(button.dataset.schoolId || "")) {
          appState.editingSchoolId = null;
        }
        await loadRoleView();
        showToast("학교가 삭제되었습니다.");
      } catch (error) {
        alert(error.message);
      }
    });
  });
}

function credentialRows(credentials, schoolName = "") {
  const includePassword = credentials.some((item) => typeof item.password === "string" && item.password);
  return [
    includePassword ? ["이름", "아이디", "비밀번호", "학교"] : ["이름", "아이디", "학교"],
    ...credentials.map((item) => (includePassword
      ? [item.name, item.username, item.password || "", schoolName]
      : [item.name, item.username, schoolName])),
  ];
}

function attachSchoolAdminEvents() {
  attachCandidateBuilder();

  document.querySelectorAll('[data-action="switch-admin-tab"]').forEach((button) => {
    button.addEventListener("click", () => {
      appState.schoolAdminTab = button.dataset.tab || "elections";
      renderApp();
    });
  });

  document.querySelectorAll('[data-action="switch-admin-subtab"]').forEach((button) => {
    button.addEventListener("click", () => {
      const group = String(button.dataset.group || "");
      const subtab = String(button.dataset.subtab || "");
      if (group === "elections") {
        appState.schoolElectionSubTab = subtab || "create";
      } else if (group === "students") {
        appState.schoolStudentSubTab = subtab || "create";
      }
      renderApp();
    });
  });

  document.querySelectorAll('[data-action="filter-students"]').forEach((button) => {
    button.addEventListener("click", () => {
      appState.studentFilterStatusDraft = button.dataset.filter || "all";
      renderApp();
    });
  });

  document.getElementById("student-search-input")?.addEventListener("input", (event) => {
    appState.studentSearchDraft = String(event.currentTarget.value || "");
  });

  document.getElementById("student-number-input")?.addEventListener("input", (event) => {
    appState.studentNumberDraft = String(event.currentTarget.value || "");
  });

  document.getElementById("student-grade-filter")?.addEventListener("change", (event) => {
    appState.studentFilterGradeDraft = String(event.currentTarget.value || "all");
  });

  document.getElementById("student-class-filter")?.addEventListener("change", (event) => {
    appState.studentFilterClassDraft = String(event.currentTarget.value || "all");
  });

  document.getElementById("student-filter-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    appState.studentFilterStatus = appState.studentFilterStatusDraft;
    appState.studentSearchTerm = appState.studentSearchDraft;
    appState.studentNumberTerm = appState.studentNumberDraft;
    appState.studentFilterGrade = appState.studentFilterGradeDraft;
    appState.studentFilterClass = appState.studentFilterClassDraft;
    renderApp();
  });

  document.getElementById("select-all-visible-students")?.addEventListener("change", (event) => {
    const normalizedSearch = (appState.studentSearchTerm || "").trim().toLowerCase();
    const totalElectionCount = Number(appState.view?.stats?.electionCount || 0);
    const visibleIds = (appState.view?.students || [])
      .filter((student) => {
        const votingStatus = getStudentVotingStatus(student, totalElectionCount);
        const matchesStatus =
          appState.studentFilterStatus === "all" ||
          appState.studentFilterStatus === votingStatus.code;
        const matchesSearch = !normalizedSearch || student.name.toLowerCase().includes(normalizedSearch);
        const matchesGrade =
          appState.studentFilterGrade === "all" ||
          String(student.grade || "") === appState.studentFilterGrade;
        const matchesClass =
          appState.studentFilterClass === "all" ||
          String(student.className || "") === appState.studentFilterClass;
        return matchesStatus && matchesSearch && matchesGrade && matchesClass;
      })
      .slice(0, 200)
      .map((student) => student.id);
    const selectedIds = new Set(appState.selectedStudentIds || []);
    if (event.currentTarget.checked) {
      visibleIds.forEach((id) => selectedIds.add(id));
    } else {
      visibleIds.forEach((id) => selectedIds.delete(id));
    }
    appState.selectedStudentIds = [...selectedIds];
    renderApp();
  });

  document.querySelectorAll('[data-action="select-student"]').forEach((input) => {
    input.addEventListener("change", () => {
      const selectedIds = new Set(appState.selectedStudentIds || []);
      const studentId = String(input.dataset.studentId || "");
      if (input.checked) {
        selectedIds.add(studentId);
      } else {
        selectedIds.delete(studentId);
      }
      appState.selectedStudentIds = [...selectedIds];
      renderApp();
    });
  });

  document.getElementById("download-selected-students")?.addEventListener("click", () => {
    const selectedIds = new Set(appState.selectedStudentIds || []);
    const selectedStudents = (appState.view?.students || []).filter((student) => selectedIds.has(student.id));
    if (!selectedStudents.length) {
      alert("다운로드할 학생을 먼저 선택해주세요.");
      return;
    }
    downloadCsv(
      `${appState.view.school?.code || "students"}_selected_credentials.csv`,
      credentialRows(selectedStudents, appState.view.school?.name || "")
    );
  });

  document.querySelectorAll('[data-action="toggle-results-visible"]').forEach((input) => {
    input.addEventListener("change", async () => {
      try {
        await api(`/api/admin/elections/${input.dataset.electionId}/results-visibility`, {
          method: "PATCH",
          body: JSON.stringify({ resultsVisible: input.checked }),
        });
        await loadRoleView();
        showToast(input.checked ? "학생 결과 공개가 설정되었습니다." : "학생 결과 공개가 해제되었습니다.");
      } catch (error) {
        alert(error.message);
      }
    });
  });

  document.querySelectorAll('[data-action="toggle-election-edit"]').forEach((button) => {
    button.addEventListener("click", () => {
      const electionId = String(button.dataset.electionId || "");
      appState.editingElectionId = appState.editingElectionId === electionId ? null : electionId;
      renderApp();
    });
  });

  document.querySelectorAll('[data-action="cancel-election-edit"]').forEach((button) => {
    button.addEventListener("click", () => {
      appState.editingElectionId = null;
      renderApp();
    });
  });

  document.querySelectorAll('[data-action="toggle-edit-election-time"]').forEach((input) => {
    const form = input.closest("[data-election-edit-form]");
    const fields = form?.querySelector(".schedule-fields");
    const scheduleInputs = fields?.querySelectorAll('input, select') || [];
    const syncEditScheduleMode = () => {
      const enabled = Boolean(input.checked);
      if (fields) fields.style.display = enabled ? "" : "none";
      scheduleInputs.forEach((field) => {
        field.required = enabled;
        if (!enabled) {
          field.value = "";
        }
      });
    };
    input.addEventListener("change", syncEditScheduleMode);
    syncEditScheduleMode();
  });

  document.querySelectorAll('[data-election-edit-form]').forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const electionId = String(form.dataset.electionEditForm || "");
      const scheduleToggle = form.querySelector('[data-action="toggle-edit-election-time"]');
      const scheduleEnabled = Boolean(scheduleToggle?.checked);
      const startDate = String(form.elements.startDate.value || "").trim();
      const startTime = String(form.elements.startTime.value || "").trim();
      const endDate = String(form.elements.endDate.value || "").trim();
      const endTime = String(form.elements.endTime.value || "").trim();
      try {
        let startAt = null;
        let endAt = null;
        if (scheduleEnabled) {
          if (!startDate || !startTime || !endDate || !endTime) {
            alert("시작일과 종료일, 시간을 모두 선택해주세요.");
            return;
          }
          startAt = new Date(`${startDate}T${startTime}:00`).toISOString();
          endAt = new Date(`${endDate}T${endTime}:00`).toISOString();
        }
        const rows = [...form.querySelectorAll("[data-candidate-row]")];
        const candidates = await Promise.all(rows.map(async (row) => {
          const file = row.querySelector('input[name="candidatePhoto"]').files[0];
          const existingPhoto = String(row.querySelector('input[name="candidatePhotoValue"]').value || "").trim();
          return {
            id: String(row.querySelector('input[name="candidateId"]').value || "").trim(),
            name: String(row.querySelector('input[name="candidateName"]').value || "").trim(),
            description: String(row.querySelector('input[name="candidateDescription"]').value || "").trim(),
            photo: file ? await compressImage(file) : existingPhoto,
          };
        }));
        await api(`/api/admin/elections/${electionId}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: String(form.elements.title.value || "").trim(),
            description: String(form.elements.description.value || "").trim(),
            startAt,
            endAt,
            candidates,
          }),
        });
        appState.editingElectionId = null;
        await loadRoleView();
        showToast("투표가 수정되었습니다.");
      } catch (error) {
        alert(error.message);
      }
    });
  });

  document.querySelectorAll('[data-action="delete-election"]').forEach((button) => {
    button.addEventListener("click", async () => {
      const confirmed = window.confirm("이 투표와 관련 투표 기록을 삭제할까요?");
      if (!confirmed) return;
      try {
        await fetch(`/api/admin/elections/${button.dataset.electionId}`, {
          method: "DELETE",
          credentials: "same-origin",
        }).then(async (response) => {
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || "요청 처리에 실패했습니다.");
          }
        });
        if (appState.editingElectionId === String(button.dataset.electionId || "")) {
          appState.editingElectionId = null;
        }
        await loadRoleView();
        showToast("투표가 삭제되었습니다.");
      } catch (error) {
        alert(error.message);
      }
    });
  });

  document.querySelectorAll('[data-action="close-election-toggle"]').forEach((input) => {
    input.addEventListener("change", async () => {
      if (input.checked) return;
      const confirmed = window.confirm("이 투표를 지금 바로 종료할까요?");
      if (!confirmed) {
        input.checked = true;
        return;
      }
      try {
        await api(`/api/admin/elections/${input.dataset.electionId}/close`, {
          method: "PATCH",
          body: JSON.stringify({}),
        });
        await loadRoleView();
        showToast("투표가 종료되었습니다.");
      } catch (error) {
        input.checked = true;
        alert(error.message);
      }
    });
  });

  const passwordModeToggle = document.getElementById("student-password-mode");
  const passwordField = document.getElementById("student-password-field");
  const passwordInput = passwordField?.querySelector('input[name="password"]');
  const syncPasswordMode = () => {
    const manual = Boolean(passwordModeToggle?.checked);
    passwordField?.classList.toggle("hidden-field", !manual);
    if (passwordInput) {
      passwordInput.required = manual;
      if (!manual) {
        passwordInput.value = "";
      }
    }
  };
  passwordModeToggle?.addEventListener("change", syncPasswordMode);
  syncPasswordMode();

  document.getElementById("election-time-toggle")?.addEventListener("change", (e) => {
    const fields = document.getElementById("election-schedule-fields");
    if (fields) fields.style.display = e.target.checked ? "" : "none";
  });

  document.getElementById("election-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const scheduleHidden = document.getElementById("election-schedule-fields")?.style.display === "none";
    let startAt = null;
    let endAt = null;
    if (!scheduleHidden) {
      const startDate = String(form.elements.startDate.value || "").trim();
      const startTime = String(form.elements.startTime.value || "").trim();
      const endDate = String(form.elements.endDate.value || "").trim();
      const endTime = String(form.elements.endTime.value || "").trim();
      if (!startDate || !startTime || !endDate || !endTime) {
        alert("시작일과 종료일, 시간을 모두 선택해주세요.");
        return;
      }
      startAt = new Date(`${startDate}T${startTime}:00`).toISOString();
      endAt = new Date(`${endDate}T${endTime}:00`).toISOString();
    }
    const rows = [...form.querySelectorAll("[data-candidate-row]")];

    try {
      const candidates = await Promise.all(rows.map(async (row) => {
        const file = row.querySelector('input[name="candidatePhoto"]').files[0];
        return {
          name: String(row.querySelector('input[name="candidateName"]').value).trim(),
          description: String(row.querySelector('input[name="candidateDescription"]').value).trim(),
          photo: await compressImage(file),
        };
      }));

      await api("/api/admin/elections", {
        method: "POST",
        body: JSON.stringify({
          title: String(form.elements.title.value).trim(),
          description: String(form.elements.description.value).trim(),
          startAt,
          endAt,
          candidates,
        }),
      });

      await loadRoleView();
      showToast("투표가 생성되었습니다.");
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById("student-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const manualPassword = String(formData.get("password") || "").trim();
    const password = manualPassword || generatePassword(8);
    const payload = {
      name: String(formData.get("name")).trim(),
      grade: String(formData.get("grade") || "").trim(),
      className: String(formData.get("className") || "").trim(),
      studentNumber: String(formData.get("studentNumber") || "").trim(),
      password,
    };

    try {
      const result = await api("/api/admin/students", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      downloadCsv(
        `${result.username}.csv`,
        credentialRows([{ ...payload, username: result.username }], appState.view.school?.name || "")
      );
      document.getElementById("single-create-result").innerHTML = `
        <div class="status">
          학생 계정 생성 완료<br>
          ID: <code>${escapeHtml(result.username)}</code><br>
          PW: <code>${escapeHtml(password)}</code><br>
          계정 정보 CSV가 바로 다운로드되었습니다.
        </div>
      `;
      form.reset();
      await loadRoleView();
      showToast("학생 계정이 생성되었습니다.");
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById("bulk-student-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const file = form.elements.studentSheet.files?.[0];
    if (!file) {
      alert("엑셀 또는 CSV 파일을 선택해주세요.");
      return;
    }

    try {
      const fileDataUrl = await readFileAsDataUrl(file);
      const result = await api("/api/admin/students/import", {
        method: "POST",
        body: JSON.stringify({
          filename: file.name,
          fileDataUrl,
        }),
      });
      downloadCsv(
        `${appState.view.school?.code || "students"}_credentials.csv`,
        credentialRows(result.users || [], appState.view.school?.name || "")
      );
      document.getElementById("bulk-create-result").innerHTML = `
        <div class="status">
          ${result.created}명 생성 완료. 계정 정보 CSV가 바로 다운로드되었습니다.
        </div>
      `;
      form.reset();
      await loadRoleView();
      showToast(`${result.created}명 학생 계정이 생성되었습니다.`);
    } catch (error) {
      alert(error.message);
    }
  });
}

function attachStudentEvents() {
  document.querySelectorAll('[data-action="vote"]').forEach((button) => {
    button.addEventListener("click", async () => {
      const candidateName = String(button.dataset.candidateName || "").trim();
      const electionId = String(button.dataset.electionId || "").trim();
      const candidateId = String(button.dataset.candidateId || "").trim();
      const confirmed = window.confirm(`선택한 후보: ${candidateName}\n\n한 번 투표하면 수정할 수 없습니다. 이 후보에게 투표할까요?`);
      if (!confirmed) return;
      try {
        await api(`/api/student/elections/${electionId}/vote`, {
          method: "POST",
          body: JSON.stringify({ candidateId }),
        });
        const elections = appState.view?.elections || [];
        const targetElection = elections.find((item) => item.id === electionId);
        if (targetElection) {
          targetElection.existingVote = {
            candidateId,
            candidateName,
          };
        }
        if (appState.view?.stats) {
          appState.view.stats.completedVotes = Number(appState.view.stats.completedVotes || 0) + 1;
        }
        renderApp();
        await loadRoleView();
        showToast("투표가 완료되었습니다.");
      } catch (error) {
        alert(error.message);
      }
    });
  });
}

async function loadRoleView() {
  if (!appState.user) {
    appState.view = null;
    return;
  }

  if (appState.user.role === ROLE.SUPER_ADMIN) {
    appState.view = await api("/api/super-admin/overview");
  } else if (appState.user.role === ROLE.SCHOOL_ADMIN) {
    appState.view = await api("/api/admin/dashboard");
  } else {
    appState.view = await api("/api/student/dashboard");
  }
}

async function refreshSession() {
  appState.loading = true;
  renderApp();
  try {
    const data = await api("/api/me", { headers: {} });
    appState.user = data.user || data;
    await loadRoleView();
  } catch (error) {
    console.error(error);
    appState.user = null;
    appState.view = null;
  } finally {
    appState.loading = false;
    renderApp();
  }
}

refreshSession();
