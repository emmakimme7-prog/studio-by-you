/**
 * Vote Demo Mock API
 * Intercepts fetch() calls to /api/* and responds with localStorage data.
 */
(function () {
  const STORE_KEY = "vote_demo_db";
  const SESSION_KEY = "vote_demo_session";
  const STORE_VERSION_KEY = "vote_demo_db_version";
  const STORE_VERSION = "6";

  // ──────────────────────────────────────────────
  // Utilities
  // ──────────────────────────────────────────────
  let _idCounter = Date.now();
  function newId() {
    return String(++_idCounter);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function readDb() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  }

  function writeDb(db) {
    localStorage.setItem(STORE_KEY, JSON.stringify(db));
  }

  function readSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  }

  function writeSession(session) {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  function getDemoRole() {
    try {
      const params = new URLSearchParams(window.location.search);
      const role = params.get("demoRole");
      if (role === "school" || role === "student") return role;
    } catch (_) {}
    return "school";
  }

  function getDemoUsername(role) {
    return role === "student" ? "student2" : "school";
  }

  function syncDemoSession(db) {
    const username = getDemoUsername(getDemoRole());
    const user = db.users.find((item) => item.username === username);
    if (user) {
      writeSession({ userId: user.id });
    }
  }

  function buildElectionResults(db, election) {
    const votes = db.votes.filter((vote) => vote.electionId === election.id);
    const totalVotes = votes.length;
    const results = election.candidates.map((candidate) => {
      const voteCount = votes.filter((vote) => vote.candidateId === candidate.id).length;
      const rate = totalVotes ? Math.round((voteCount / totalVotes) * 100) : 0;
      return {
        ...candidate,
        voteCount,
        rate,
      };
    });
    return { totalVotes, results };
  }

  function sortByCreatedAtDesc(items) {
    return [...items].sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  }

  // ──────────────────────────────────────────────
  // Seed default data if DB is empty
  // ──────────────────────────────────────────────
  function initDb() {
    const savedVersion = localStorage.getItem(STORE_VERSION_KEY);
    let db = savedVersion === STORE_VERSION ? readDb() : null;
    if (db) return db;

    const schoolId = "school-1";
    const adminId = "user-admin";
    const schoolAdminId = "user-school";
    const studentId1 = "student-1";
    const studentId2 = "student-2";
    const studentId3 = "student-3";
    const studentId4 = "student-4";
    const electionId1 = "election-1";
    const electionId2 = "election-2";
    const candidateId1 = "cand-1";
    const candidateId2 = "cand-2";
    const candidateId3 = "cand-3";
    const candidateId4 = "cand-4";
    const candidateId5 = "cand-5";
    const candidateId6 = "cand-6";
    const candidatePhoto1 = "/vote-demo/student1.jpg";
    const candidatePhoto2 = "/vote-demo/student2.jpg";
    const bandPhoto = "/vote-demo/band.png";
    const foodPhoto = "/vote-demo/food.png";
    const photozonePhoto = "/vote-demo/photozone.png";
    const micPhoto = "/vote-demo/mic.png";
    const now = new Date();
    const closedStart = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 14).toISOString();
    const closedEnd = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7).toISOString();

    db = {
      schools: [
        {
          id: schoolId,
          name: "늘봄중학교",
          code: "NBM",
          enabled: true,
          accessStartDate: null,
          accessEndDate: null,
          createdAt: nowIso(),
        },
      ],
      users: [
        {
          id: adminId,
          role: "SUPER_ADMIN",
          name: "슈퍼관리자",
          username: "admin",
          password: "admin",
          schoolId: null,
          createdAt: nowIso(),
        },
        {
          id: schoolAdminId,
          role: "SCHOOL_ADMIN",
          name: "정다은 선생님",
          username: "school",
          password: "school",
          schoolId: schoolId,
          createdAt: nowIso(),
        },
        {
          id: studentId1,
          role: "STUDENT",
          name: "김민준",
          username: "student1",
          password: "student1",
          schoolId: schoolId,
          grade: "3",
          classNum: "1",
          number: "1",
          createdAt: nowIso(),
        },
        {
          id: studentId2,
          role: "STUDENT",
          name: "이지우",
          username: "student2",
          password: "student2",
          schoolId: schoolId,
          grade: "3",
          classNum: "1",
          number: "2",
          createdAt: nowIso(),
        },
        {
          id: studentId3,
          role: "STUDENT",
          name: "박서윤",
          username: "student3",
          password: "student3",
          schoolId: schoolId,
          grade: "3",
          classNum: "2",
          number: "3",
          createdAt: nowIso(),
        },
        {
          id: studentId4,
          role: "STUDENT",
          name: "최하람",
          username: "student4",
          password: "student4",
          schoolId: schoolId,
          grade: "2",
          classNum: "4",
          number: "7",
          createdAt: nowIso(),
        },
      ],
      elections: [
        {
          id: electionId1,
          schoolId: schoolId,
          title: "2026 학생회장 선거",
          description: "전교 학생회장 후보 2명 중 한 명에게 투표하는 현재 진행 중인 선거입니다.",
          startAt: null,
          endAt: null,
          manualControl: true,
          resultsVisible: false,
          candidates: [
            {
              id: candidateId1,
              name: "강도윤",
              description: "급식 만족도 조사와 학생회 소통 게시판 운영을 약속합니다.",
              photo: candidatePhoto1,
              createdAt: nowIso(),
            },
            {
              id: candidateId2,
              name: "윤채린",
              description: "체육대회 확대와 자율 동아리 지원 강화를 공약으로 제시합니다.",
              photo: candidatePhoto2,
              createdAt: nowIso(),
            },
          ],
          createdAt: nowIso(),
        },
        {
          id: electionId2,
          schoolId: schoolId,
          title: "축제 프로그램 선호도 조사",
          description: "지난주 종료된 행사 선호도 조사 결과를 확인할 수 있는 예시 투표입니다.",
          startAt: closedStart,
          endAt: closedEnd,
          manualControl: false,
          resultsVisible: true,
          candidates: [
            {
              id: candidateId3,
              name: "밴드 공연",
              description: "학생 밴드와 게스트 공연 중심 구성",
              photo: bandPhoto,
              createdAt: nowIso(),
            },
            {
              id: candidateId4,
              name: "먹거리 부스",
              description: "학급별 먹거리와 체험형 부스 운영",
              photo: foodPhoto,
              createdAt: nowIso(),
            },
            {
              id: candidateId5,
              name: "포토존 이벤트",
              description: "교내 포토존과 굿즈 증정 이벤트 구성",
              photo: photozonePhoto,
              createdAt: nowIso(),
            },
            {
              id: candidateId6,
              name: "장기자랑 무대",
              description: "학생 참여형 무대 프로그램 확대",
              photo: micPhoto,
              createdAt: nowIso(),
            },
          ],
          createdAt: nowIso(),
        },
      ],
      votes: [
        {
          id: "vote-1",
          electionId: electionId1,
          studentId: studentId1,
          candidateId: candidateId1,
          schoolId: schoolId,
          createdAt: nowIso(),
        },
        {
          id: "vote-2",
          electionId: electionId2,
          studentId: studentId1,
          candidateId: candidateId4,
          schoolId: schoolId,
          createdAt: closedEnd,
        },
        {
          id: "vote-3",
          electionId: electionId2,
          studentId: studentId2,
          candidateId: candidateId3,
          schoolId: schoolId,
          createdAt: closedEnd,
        },
        {
          id: "vote-4",
          electionId: electionId2,
          studentId: studentId3,
          candidateId: candidateId4,
          schoolId: schoolId,
          createdAt: closedEnd,
        },
        {
          id: "vote-5",
          electionId: electionId2,
          studentId: studentId4,
          candidateId: candidateId6,
          schoolId: schoolId,
          createdAt: closedEnd,
        },
      ],
    };

    writeDb(db);
    localStorage.setItem(STORE_VERSION_KEY, STORE_VERSION);
    return db;
  }

  // ──────────────────────────────────────────────
  // API handlers
  // ──────────────────────────────────────────────
  function ok(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  function err(message, status = 400) {
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  function currentUser(db) {
    const session = readSession();
    if (!session) return null;
    return db.users.find((u) => u.id === session.userId) || null;
  }

  function requireUser(db) {
    const user = currentUser(db);
    if (!user) throw { status: 401, message: "로그인이 필요합니다." };
    return user;
  }

  function requireRole(user, role) {
    if (user.role !== role)
      throw { status: 403, message: "권한이 없습니다." };
  }

  function getSchool(db, id) {
    const s = db.schools.find((s) => s.id === id);
    if (!s) throw { status: 404, message: "학교를 찾을 수 없습니다." };
    return s;
  }

  function formatUser(user) {
    const { password, ...rest } = user;
    return rest;
  }

  async function handleRequest(url, options) {
    const db = initDb();
    const method = (options.method || "GET").toUpperCase();
    const path = url.replace(/\?.*$/, "");
    const body = options.body ? JSON.parse(options.body) : {};

    try {
      // ── Auth ───────────────────────────────────
      if (path === "/api/login" && method === "POST") {
        const username = String(body.username || "").trim();
        const password = String(body.password || "").trim();
        const user = db.users.find(
          (u) => u.username === username && u.password === password
        );
        if (!user) return err("아이디 또는 비밀번호가 올바르지 않습니다.", 401);
        writeSession({ userId: user.id });
        return ok(formatUser(user));
      }

      if (path === "/api/logout" && method === "POST") {
        writeSession(null);
        return ok({ ok: true });
      }

      if (path === "/api/me") {
        const user = currentUser(db);
        if (!user) return err("로그인이 필요합니다.", 401);
        return ok(formatUser(user));
      }

      // ── Super admin overview ───────────────────
      if (path === "/api/super-admin/overview" && method === "GET") {
        const user = requireUser(db);
        requireRole(user, "SUPER_ADMIN");
        const schools = db.schools.map((school) => {
          const admin = db.users.find(
            (u) => u.role === "SCHOOL_ADMIN" && u.schoolId === school.id
          );
          const studentCount = db.users.filter(
            (u) => u.role === "STUDENT" && u.schoolId === school.id
          ).length;
          const electionCount = db.elections.filter(
            (e) => e.schoolId === school.id
          ).length;
          return {
            ...school,
            adminName: admin ? admin.name : "-",
            adminUsername: admin ? admin.username : "-",
            studentCount,
            electionCount,
          };
        });
        return ok({ schools });
      }

      // ── Schools CRUD ───────────────────────────
      if (path === "/api/schools" && method === "POST") {
        const user = requireUser(db);
        requireRole(user, "SUPER_ADMIN");
        const name = String(body.name || "").trim();
        const code = String(body.code || "").trim();
        const adminName = String(body.adminName || "").trim();
        const adminUsername = String(body.adminUsername || "").trim();
        const adminPassword = String(body.adminPassword || "").trim();
        if (!name || !code || !adminName || !adminUsername || !adminPassword)
          return err("모든 필수 항목을 입력해주세요.");
        if (db.schools.find((s) => s.code === code))
          return err("이미 사용 중인 학교 코드입니다.");
        if (db.users.find((u) => u.username === adminUsername))
          return err("이미 사용 중인 아이디입니다.");
        const schoolId = newId();
        db.schools.push({
          id: schoolId,
          name,
          code,
          enabled: true,
          accessStartDate: body.accessStartDate || null,
          accessEndDate: body.accessEndDate || null,
          createdAt: nowIso(),
        });
        db.users.push({
          id: newId(),
          role: "SCHOOL_ADMIN",
          name: adminName,
          username: adminUsername,
          password: adminPassword,
          schoolId,
          createdAt: nowIso(),
        });
        writeDb(db);
        return ok({ ok: true }, 201);
      }

      const schoolsMatch = path.match(/^\/api\/schools\/([^/]+)$/);
      if (schoolsMatch) {
        const user = requireUser(db);
        requireRole(user, "SUPER_ADMIN");
        const schoolId = schoolsMatch[1];
        if (method === "PATCH") {
          const school = getSchool(db, schoolId);
          const name = String(body.name || "").trim();
          const code = String(body.code || "").trim();
          if (!name || !code) return err("학교명과 학교 코드를 입력해주세요.");
          if (db.schools.find((s) => s.code === code && s.id !== schoolId))
            return err("이미 사용 중인 학교 코드입니다.");
          Object.assign(school, {
            name,
            code,
            enabled: body.enabled !== false,
            accessStartDate: body.accessStartDate || null,
            accessEndDate: body.accessEndDate || null,
          });
          const admin = db.users.find(
            (u) => u.role === "SCHOOL_ADMIN" && u.schoolId === schoolId
          );
          if (admin && body.adminName && body.adminUsername) {
            if (
              db.users.find(
                (u) => u.username === body.adminUsername && u.id !== admin.id
              )
            )
              return err("이미 사용 중인 아이디입니다.");
            admin.name = body.adminName;
            admin.username = body.adminUsername;
            if (body.adminPassword) admin.password = body.adminPassword;
          }
          writeDb(db);
          return ok({ ok: true });
        }
        if (method === "DELETE") {
          const schoolUsers = db.users.filter((u) => u.schoolId === schoolId);
          const schoolUserIds = new Set(schoolUsers.map((u) => u.id));
          db.users = db.users.filter((u) => u.schoolId !== schoolId);
          db.elections = db.elections.filter((e) => e.schoolId !== schoolId);
          db.votes = db.votes.filter((v) => v.schoolId !== schoolId);
          db.schools = db.schools.filter((s) => s.id !== schoolId);
          writeDb(db);
          return ok({ ok: true });
        }
      }

      // ── School admin (create under super admin) ─
      if (path === "/api/school-admins" && method === "POST") {
        const user = requireUser(db);
        requireRole(user, "SUPER_ADMIN");
        const schoolId = String(body.schoolId || "").trim();
        const name = String(body.name || "").trim();
        const username = String(body.username || "").trim();
        const password = String(body.password || "").trim();
        if (!schoolId || !name || !username || !password)
          return err("모든 항목을 입력해주세요.");
        getSchool(db, schoolId);
        if (db.users.find((u) => u.username === username))
          return err("이미 사용 중인 아이디입니다.");
        db.users.push({
          id: newId(),
          role: "SCHOOL_ADMIN",
          name,
          username,
          password,
          schoolId,
          createdAt: nowIso(),
        });
        writeDb(db);
        return ok({ ok: true }, 201);
      }

      // ── Admin dashboard ────────────────────────
      if (path === "/api/admin/dashboard" && method === "GET") {
        const user = requireUser(db);
        requireRole(user, "SCHOOL_ADMIN");
        const school = getSchool(db, user.schoolId);
        const students = db.users
          .filter((u) => u.role === "STUDENT" && u.schoolId === user.schoolId)
          .map((student) => ({
            ...formatUser(student),
            className: String(student.classNum || ""),
            studentNumber: String(student.number || ""),
            voteCount: db.votes.filter((vote) => vote.studentId === student.id).length,
          }));
        const elections = sortByCreatedAtDesc(
          db.elections
          .filter((e) => e.schoolId === user.schoolId)
          .map((election) => {
            const { totalVotes, results } = buildElectionResults(db, election);
            return {
              ...election,
              totalVotes,
              results,
            };
          })
        );
        const studentCount = students.length;
        const voteCount = db.votes.filter((vote) => vote.schoolId === user.schoolId).length;
        return ok({
          school,
          students,
          elections,
          stats: {
            electionCount: elections.length,
            studentCount,
            voteCount,
          },
          user: formatUser(user),
        });
      }

      // ── Elections CRUD ─────────────────────────
      if (path === "/api/admin/elections" && method === "POST") {
        const user = requireUser(db);
        requireRole(user, "SCHOOL_ADMIN");
        const title = String(body.title || "").trim();
        const description = String(body.description || "").trim();
        if (!title || !description)
          return err("투표 기본 정보를 모두 입력해주세요.");
        const candidates = (body.candidates || []).map((c) => ({
          id: newId(),
          name: String(c.name || "").trim(),
          description: String(c.description || "").trim(),
          photo: String(c.photo || ""),
          createdAt: nowIso(),
        }));
        if (candidates.length < 2)
          return err("후보자는 최소 2명 이상이어야 합니다.");
        const election = {
          id: newId(),
          schoolId: user.schoolId,
          title,
          description,
          startAt: body.startAt || null,
          endAt: body.endAt || null,
          manualControl: !body.startAt,
          resultsVisible: false,
          candidates,
          createdAt: nowIso(),
        };
        db.elections.push(election);
        writeDb(db);
        return ok({ id: election.id }, 201);
      }

      const electionMatch = path.match(/^\/api\/admin\/elections\/([^/]+)$/);
      if (electionMatch) {
        const user = requireUser(db);
        requireRole(user, "SCHOOL_ADMIN");
        const electionId = electionMatch[1];
        const election = db.elections.find(
          (e) => e.id === electionId && e.schoolId === user.schoolId
        );
        if (!election) return err("투표를 찾을 수 없습니다.", 404);

        if (method === "PATCH") {
          const title = String(body.title || "").trim();
          const description = String(body.description || "").trim();
          if (!title || !description)
            return err("투표 기본 정보를 모두 입력해주세요.");
          const candidates = (body.candidates || []).map((c) => {
            const existing = election.candidates.find((ec) => ec.id === c.id);
            return {
              id: existing ? existing.id : newId(),
              name: String(c.name || "").trim(),
              description: String(c.description || "").trim(),
              photo: String(c.photo || existing?.photo || ""),
              createdAt: existing ? existing.createdAt : nowIso(),
            };
          });
          if (candidates.length < 2)
            return err("후보자는 최소 2명 이상이어야 합니다.");
          Object.assign(election, {
            title,
            description,
            startAt: body.startAt || null,
            endAt: body.endAt || null,
            manualControl: !body.startAt,
            candidates,
          });
          writeDb(db);
          return ok({ ok: true });
        }
        if (method === "DELETE") {
          db.votes = db.votes.filter((v) => v.electionId !== electionId);
          db.elections = db.elections.filter((e) => e.id !== electionId);
          writeDb(db);
          return ok({ ok: true });
        }
      }

      const resultsVisMatch = path.match(
        /^\/api\/admin\/elections\/([^/]+)\/results-visibility$/
      );
      if (resultsVisMatch && method === "PATCH") {
        const user = requireUser(db);
        requireRole(user, "SCHOOL_ADMIN");
        const electionId = resultsVisMatch[1];
        const election = db.elections.find(
          (e) => e.id === electionId && e.schoolId === user.schoolId
        );
        if (!election) return err("투표를 찾을 수 없습니다.", 404);
        election.resultsVisible = Boolean(body.resultsVisible);
        writeDb(db);
        return ok({ ok: true });
      }

      const closeMatch = path.match(
        /^\/api\/admin\/elections\/([^/]+)\/close$/
      );
      if (closeMatch && method === "PATCH") {
        const user = requireUser(db);
        requireRole(user, "SCHOOL_ADMIN");
        const electionId = closeMatch[1];
        const election = db.elections.find(
          (e) => e.id === electionId && e.schoolId === user.schoolId
        );
        if (!election) return err("투표를 찾을 수 없습니다.", 404);
        const closedAt = nowIso();
        election.endAt = closedAt;
        writeDb(db);
        return ok({ ok: true, closedAt });
      }

      // ── Students ───────────────────────────────
      if (path === "/api/admin/students" && method === "GET") {
        const user = requireUser(db);
        requireRole(user, "SCHOOL_ADMIN");
        const students = db.users.filter(
          (u) => u.role === "STUDENT" && u.schoolId === user.schoolId
        );
        return ok({ students: students.map(formatUser) });
      }

      if (path === "/api/admin/students" && method === "POST") {
        const user = requireUser(db);
        requireRole(user, "SCHOOL_ADMIN");
        const name = String(body.name || "").trim();
        const username = String(body.username || "").trim();
        const password = String(body.password || "").trim();
        if (!name || !username || !password)
          return err("모든 항목을 입력해주세요.");
        if (db.users.find((u) => u.username === username))
          return err("이미 사용 중인 아이디입니다.");
        const student = {
          id: newId(),
          role: "STUDENT",
          name,
          username,
          password,
          schoolId: user.schoolId,
          grade: String(body.grade || "").trim(),
          classNum: String(body.classNum || "").trim(),
          number: String(body.number || "").trim(),
          createdAt: nowIso(),
        };
        db.users.push(student);
        writeDb(db);
        return ok(formatUser(student), 201);
      }

      if (path === "/api/admin/students/bulk" && method === "POST") {
        const user = requireUser(db);
        requireRole(user, "SCHOOL_ADMIN");
        const updates = body.updates || [];
        for (const update of updates) {
          const student = db.users.find(
            (u) =>
              u.id === update.id &&
              u.role === "STUDENT" &&
              u.schoolId === user.schoolId
          );
          if (student) Object.assign(student, update);
        }
        writeDb(db);
        return ok({ ok: true });
      }

      if (path === "/api/admin/students/import" && method === "POST") {
        const user = requireUser(db);
        requireRole(user, "SCHOOL_ADMIN");
        const rows = body.rows || [];
        const created = [];
        for (const row of rows) {
          const username = String(row.username || "").trim();
          if (!username || db.users.find((u) => u.username === username))
            continue;
          const student = {
            id: newId(),
            role: "STUDENT",
            name: String(row.name || "").trim(),
            username,
            password: String(row.password || username).trim(),
            schoolId: user.schoolId,
            grade: String(row.grade || "").trim(),
            classNum: String(row.classNum || "").trim(),
            number: String(row.number || "").trim(),
            createdAt: nowIso(),
          };
          db.users.push(student);
          created.push({
            name: student.name,
            username: student.username,
            password: student.password,
          });
        }
        writeDb(db);
        return ok({ created: created.length, users: created }, 201);
      }

      if (
        path === "/api/admin/students/export" ||
        path === "/api/admin/students/template"
      ) {
        // Return a simple CSV blob
        const isExport = path.includes("export");
        const user = requireUser(db);
        const header = "학년,반,번호,이름,아이디\n";
        let csv = header;
        if (isExport) {
          const students = db.users.filter(
            (u) => u.role === "STUDENT" && u.schoolId === user.schoolId
          );
          for (const s of students) {
            csv += `${s.grade},${s.classNum},${s.number},${s.name},${s.username}\n`;
          }
        }
        return new Response(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="${isExport ? "students" : "template"}.csv"`,
          },
        });
      }

      // ── Student dashboard ──────────────────────
      if (path === "/api/student/dashboard" && method === "GET") {
        const user = requireUser(db);
        requireRole(user, "STUDENT");
        const school = getSchool(db, user.schoolId);
        const now = new Date().toISOString();
        const myVoteIds = new Set(
          db.votes.filter((v) => v.studentId === user.id).map((v) => v.electionId)
        );
        const elections = sortByCreatedAtDesc(
          db.elections
          .filter((e) => e.schoolId === user.schoolId)
          .map((e) => {
            const hasVoted = myVoteIds.has(e.id);
            const existingVoteRecord = db.votes.find((vote) => vote.electionId === e.id && vote.studentId === user.id) || null;
            const isOpen =
              e.manualControl
                ? !e.endAt
                : e.startAt && e.endAt && e.startAt <= now && now <= e.endAt;
            const { totalVotes, results } = buildElectionResults(db, e);
            return {
              ...e,
              candidates: results,
              totalVotes,
              existingVote: existingVoteRecord
                ? {
                    candidateId: existingVoteRecord.candidateId,
                    candidateName:
                      e.candidates.find((candidate) => candidate.id === existingVoteRecord.candidateId)?.name || "",
                  }
                : null,
            };
          })
        );
        return ok({
          school,
          elections,
          stats: {
            electionCount: elections.filter((election) => getElectionStatusForStudent(election, now).code === "active").length,
            completedVotes: db.votes.filter((vote) => vote.studentId === user.id).length,
          },
          user: formatUser(user),
        });
      }

      // ── Vote ───────────────────────────────────
      const voteMatch = path.match(
        /^\/api\/student\/elections\/([^/]+)\/vote$/
      );
      if (voteMatch && method === "POST") {
        const user = requireUser(db);
        requireRole(user, "STUDENT");
        const electionId = voteMatch[1];
        const candidateId = String(body.candidateId || "").trim();
        const election = db.elections.find(
          (e) => e.id === electionId && e.schoolId === user.schoolId
        );
        if (!election) return err("투표를 찾을 수 없습니다.", 404);
        if (db.votes.find((v) => v.electionId === electionId && v.studentId === user.id))
          return err("이미 이 투표에 참여했습니다.", 400);
        if (!election.candidates.find((c) => c.id === candidateId))
          return err("후보자를 찾을 수 없습니다.", 404);
        const now = new Date().toISOString();
        const isOpen =
          election.manualControl
            ? !election.endAt
            : election.startAt && election.endAt && election.startAt <= now && now <= election.endAt;
        if (!isOpen) return err("지금은 이 투표에 참여할 수 없습니다.", 400);
        db.votes.push({
          id: newId(),
          electionId,
          studentId: user.id,
          candidateId,
          schoolId: user.schoolId,
          createdAt: nowIso(),
        });
        writeDb(db);
        return ok({ ok: true }, 201);
      }

      return err("요청한 API를 찾을 수 없습니다.", 404);
    } catch (e) {
      if (e && e.status) return err(e.message, e.status);
      console.error("[vote-demo-api]", e);
      return err("서버 오류가 발생했습니다.", 500);
    }
  }

  function getElectionStatusForStudent(election, now) {
    if (election.manualControl) {
      if (!election.endAt) return { code: "active", label: "진행 중" };
      return { code: "closed", label: "종료됨" };
    }
    const start = new Date(election.startAt).getTime();
    const end = new Date(election.endAt).getTime();
    const current = new Date(now).getTime();
    if (current < start) return { code: "upcoming", label: "시작 전" };
    if (current > end) return { code: "closed", label: "종료됨" };
    return { code: "active", label: "진행 중" };
  }

  // ──────────────────────────────────────────────
  // Intercept fetch
  // ──────────────────────────────────────────────
  const _originalFetch = window.fetch;
  window.fetch = function (input, options = {}) {
    const url = typeof input === "string" ? input : input.url;
    if (url.startsWith("/api/")) {
      return handleRequest(url, options);
    }
    return _originalFetch.call(this, input, options);
  };

  const db = initDb();
  syncDemoSession(db);
  console.log("[vote-demo-api] 데모 모드 활성화");
  console.log(`  현재 데모 역할: ${getDemoRole() === "student" ? "학생" : "선생님"}`);
})();
