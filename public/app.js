(function () {
  const API = window.API_BASE;
  const ENDPOINTS = window.ENDPOINTS;
  const GROUP_META = window.GROUP_META;

  const state = {
    selectedId: null,
    resolved: {},
    quick: {}
  };

  // ------------------ Connection status ------------------

  async function checkHealth() {
    const pill = document.getElementById('status');
    const label = document.getElementById('status-label');
    try {
      const r = await fetch(`${API}/health`, { cache: 'no-store' });
      if (r.ok) {
        pill.dataset.state = 'ok';
        label.textContent = 'API en línea';
      } else {
        pill.dataset.state = 'error';
        label.textContent = `Error ${r.status}`;
      }
    } catch (e) {
      pill.dataset.state = 'error';
      label.textContent = 'API no responde';
    }
  }

  // ------------------ Sidebar ------------------

  function groupedEndpoints() {
    const groups = {};
    for (const ep of ENDPOINTS) {
      if (!groups[ep.group]) groups[ep.group] = [];
      groups[ep.group].push(ep);
    }
    return groups;
  }

  function renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = '';
    const groups = groupedEndpoints();
    const order = ['Health', 'Athletes', 'Sessions', 'Injuries', 'External'];

    for (const groupName of order) {
      if (!groups[groupName]) continue;
      const meta = GROUP_META[groupName] || { label: groupName };
      const h = document.createElement('h2');
      h.textContent = meta.label;
      sidebar.appendChild(h);

      for (const ep of groups[groupName]) {
        const btn = document.createElement('button');
        btn.className = 'endpoint-card';
        btn.dataset.id = ep.id;
        if (ep.id === state.selectedId) btn.classList.add('active');

        const badge = document.createElement('span');
        badge.className = `method-badge method-${ep.method}`;
        badge.textContent = ep.method;

        const path = document.createElement('span');
        path.className = 'endpoint-path';
        path.textContent = ep.path;

        btn.appendChild(badge);
        btn.appendChild(path);
        btn.addEventListener('click', () => selectEndpoint(ep.id));
        sidebar.appendChild(btn);
      }
    }
  }

  // ------------------ Detail panel ------------------

  function selectEndpoint(id) {
    state.selectedId = id;
    renderSidebar();
    renderDetail();
  }

  function findEndpoint(id) {
    return ENDPOINTS.find(e => e.id === id);
  }

  async function ensureResolvers(ep) {
    // Pre-resolve IDs used by path params for nicer UX. Best-effort.
    if (!ep.pathParams) return;
    for (const p of ep.pathParams) {
      const r = p.resolver;
      if (!r || state.resolved[r]) continue;
      try {
        if (r === 'firstAthleteId') {
          const list = await fetchJson(`${API}/athletes`);
          if (list?.athlete?.length) state.resolved.firstAthleteId = list.athlete[0]._id;
        } else if (r === 'firstSessionId') {
          const list = await fetchJson(`${API}/sessions?page=1&limit=1`);
          if (list?.data?.length) state.resolved.firstSessionId = list.data[0]._id;
        } else if (r === 'firstInjuryId') {
          const list = await fetchJson(`${API}/injuries`);
          if (list?.injury?.length) state.resolved.firstInjuryId = list.injury[0]._id;
        }
      } catch (_) { /* silent */ }
    }
  }

  function renderDetail() {
    const ep = findEndpoint(state.selectedId);
    const detail = document.getElementById('detail');
    if (!ep) {
      detail.innerHTML = '<div class="empty-state"><div class="icon">◆</div><p>Selecciona un endpoint de la izquierda para ver el detalle y probarlo.</p></div>';
      return;
    }

    detail.innerHTML = '';

    // Header: method + path
    const header = document.createElement('div');
    header.className = 'detail-header';
    const badge = document.createElement('span');
    badge.className = `method-badge method-${ep.method}`;
    badge.textContent = ep.method;
    const heading = document.createElement('h3');
    heading.textContent = ep.path;
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = ep.group;
    header.appendChild(badge);
    header.appendChild(heading);
    header.appendChild(tag);
    detail.appendChild(header);

    // Summary + description
    if (ep.summary) {
      const s = document.createElement('p');
      s.className = 'detail-summary';
      s.textContent = ep.summary;
      detail.appendChild(s);
    }
    if (ep.description) {
      const d = document.createElement('p');
      d.className = 'detail-description';
      d.textContent = ep.description;
      detail.appendChild(d);
    }

    // Path params
    let pathInputs = {};
    if (ep.pathParams && ep.pathParams.length) {
      const sec = document.createElement('div');
      sec.className = 'detail-section';
      const label = document.createElement('span');
      label.className = 'detail-section-label';
      label.textContent = 'Path params';
      sec.appendChild(label);

      for (const p of ep.pathParams) {
        const row = document.createElement('div');
        row.className = 'path-input-row';
        const lab = document.createElement('label');
        lab.textContent = `:${p.name}`;
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = p.placeholder || p.name;
        const resolved = state.resolved[p.resolver];
        if (resolved) input.value = resolved;
        row.appendChild(lab);
        row.appendChild(input);
        sec.appendChild(row);
        pathInputs[p.name] = input;
      }
      detail.appendChild(sec);
    }

    // Query params (if any)
    let queryInputs = {};
    if (ep.queryParams && ep.queryParams.length) {
      const sec = document.createElement('div');
      sec.className = 'detail-section';
      const label = document.createElement('span');
      label.className = 'detail-section-label';
      label.textContent = 'Query params';
      sec.appendChild(label);
      for (const q of ep.queryParams) {
        const row = document.createElement('div');
        row.className = 'path-input-row';
        const lab = document.createElement('label');
        lab.textContent = q.name;
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = q.name;
        if (q.value !== undefined) input.value = q.value;
        row.appendChild(lab);
        row.appendChild(input);
        sec.appendChild(row);
        queryInputs[q.name] = input;
      }
      detail.appendChild(sec);
    }

    // Body editor
    let bodyTextarea = null;
    if (ep.examplePayload) {
      const sec = document.createElement('div');
      sec.className = 'detail-section';
      const label = document.createElement('span');
      label.className = 'detail-section-label';
      label.textContent = 'Request body (JSON, editable)';
      sec.appendChild(label);

      const payload = applyPayloadTransform(ep, JSON.parse(JSON.stringify(ep.examplePayload)));
      bodyTextarea = document.createElement('textarea');
      bodyTextarea.className = 'payload-editor';
      bodyTextarea.value = JSON.stringify(payload, null, 2);
      sec.appendChild(bodyTextarea);
      detail.appendChild(sec);
    }

    // Action row + response
    const actions = document.createElement('div');
    actions.className = 'actions-row';
    const runBtn = document.createElement('button');
    runBtn.className = 'btn btn-primary';
    runBtn.textContent = `Probar ${ep.method} ${ep.path}`;
    const responseArea = document.createElement('div');
    responseArea.className = 'response-area';
    actions.appendChild(runBtn);
    detail.appendChild(actions);
    detail.appendChild(responseArea);

    runBtn.addEventListener('click', async () => {
      runBtn.disabled = true;
      const origText = runBtn.textContent;
      runBtn.textContent = 'Ejecutando…';
      try {
        await executeEndpoint(ep, { pathInputs, queryInputs, bodyTextarea, responseArea });
      } finally {
        runBtn.disabled = false;
        runBtn.textContent = origText;
      }
    });
  }

  function applyPayloadTransform(ep, payload) {
    if (ep.payloadTransform === 'injectAthleteId' && state.resolved.firstAthleteId) {
      payload.athleteId = state.resolved.firstAthleteId;
    }
    return payload;
  }

  // ------------------ Endpoint execution ------------------

  function buildUrl(ep, pathInputs, queryInputs) {
    let path = ep.path;
    if (ep.pathParams) {
      for (const p of ep.pathParams) {
        const input = pathInputs[p.name];
        const val = (input && input.value.trim()) || state.resolved[p.resolver] || '';
        if (!val) throw new Error(`Falta valor para :${p.name}. ¿Has sembrado la base de datos con "npm run seed"?`);
        path = path.replace(`:${p.name}`, encodeURIComponent(val));
      }
    }
    const qs = [];
    if (queryInputs) {
      for (const [name, input] of Object.entries(queryInputs)) {
        const v = input.value.trim();
        if (v) qs.push(`${encodeURIComponent(name)}=${encodeURIComponent(v)}`);
      }
    }
    return `${API}${path}${qs.length ? '?' + qs.join('&') : ''}`;
  }

  async function executeEndpoint(ep, ctx) {
    const { pathInputs, queryInputs, bodyTextarea, responseArea } = ctx;
    let url, opts;
    try {
      url = buildUrl(ep, pathInputs, queryInputs);
      opts = { method: ep.method, headers: { Accept: 'application/json' } };
      if (bodyTextarea && (ep.method === 'POST' || ep.method === 'PUT')) {
        const parsed = JSON.parse(bodyTextarea.value);
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(parsed);
      }
    } catch (e) {
      renderResponse(responseArea, null, e.message, 0);
      return;
    }

    const t0 = performance.now();
    try {
      const r = await fetch(url, opts);
      const ms = Math.round(performance.now() - t0);
      const text = await r.text();
      let parsed = text;
      try { parsed = JSON.parse(text); } catch (_) { /* keep as text */ }

      // Persist created IDs for chained calls
      if (ep.id === 'athletes-create' && parsed?._id) state.resolved.lastCreatedAthleteId = parsed._id;
      if (ep.id === 'sessions-create' && parsed?._id) state.resolved.lastCreatedSessionId = parsed._id;
      if (ep.id === 'athletes-sessions-create' && parsed?._id) state.resolved.lastCreatedSessionId = parsed._id;
      if (ep.id === 'injuries-create' && parsed?._id) state.resolved.lastCreatedInjuryId = parsed._id;
      if (ep.id === 'athletes-injuries-create' && parsed?._id) state.resolved.lastCreatedInjuryId = parsed._id;

      renderResponse(responseArea, r.status, parsed, ms);
    } catch (e) {
      renderResponse(responseArea, null, `Network error: ${e.message}`, 0);
    }
  }

  function statusClass(status) {
    if (status == null) return 'err';
    if (status >= 200 && status < 300) return 'ok';
    if (status >= 400 && status < 500) return 'warn';
    return 'err';
  }

  function renderResponse(area, status, body, ms) {
    area.innerHTML = '';
    const meta = document.createElement('div');
    const pill = document.createElement('span');
    pill.className = `response-status ${statusClass(status)}`;
    pill.textContent = status != null ? `${status}` : 'ERROR';
    meta.appendChild(pill);
    if (ms > 0) {
      const t = document.createElement('span');
      t.className = 'response-time';
      t.textContent = `${ms} ms`;
      meta.appendChild(t);
    }
    area.appendChild(meta);

    const pre = document.createElement('div');
    pre.className = 'response-body';
    const text = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
    pre.innerHTML = highlightInteresting(text);
    area.appendChild(pre);
  }

  function highlightInteresting(text) {
    if (typeof text !== 'string') return text;
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return escaped.replace(/("(?:weatherAlertLevel|riskLevel|externalDataStatus|status|ok)":\s*"?[^",}\n]+"?)/g,
      '<span class="highlight">$1</span>');
  }

  // ------------------ Quick tests ------------------

  const QUICK_STEPS = [
    {
      id: 1,
      title: 'Ping',
      sub: 'GET /health',
      run: async () => {
        const r = await fetch(`${API}/health`);
        const body = await r.json();
        if (!r.ok || !body.ok) throw new Error('Health no devolvió ok:true');
        return { status: r.status, body };
      }
    },
    {
      id: 2,
      title: 'Listar atletas',
      sub: 'GET /athletes (5 primeros)',
      run: async () => {
        const r = await fetch(`${API}/athletes`);
        const body = await r.json();
        if (!r.ok) throw new Error(`Status ${r.status}`);
        const list = body.athlete || [];
        if (list.length) state.resolved.firstAthleteId = list[0]._id;
        return { status: r.status, body: { total: list.length, primeros5: list.slice(0, 5) } };
      }
    },
    {
      id: 3,
      title: 'Crear atleta demo',
      sub: 'POST /athletes',
      run: async () => {
        const payload = {
          fullName: `Demo Aurora ${new Date().toISOString().slice(0, 19)}`,
          birthDate: '1998-09-04',
          sex: 'female',
          heightCm: 168,
          weightKg: 58.4,
          primarySport: 'running',
          team: 'Aurora UI Demo'
        };
        const r = await fetch(`${API}/athletes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const body = await r.json();
        if (!r.ok) throw new Error(`Status ${r.status} · ${body.message || ''}`);
        state.resolved.lastCreatedAthleteId = body._id;
        state.resolved.firstAthleteId = state.resolved.firstAthleteId || body._id;
        return { status: r.status, body };
      }
    },
    {
      id: 4,
      title: 'Crear sesión enriquecida',
      sub: 'POST /sessions (clima + riesgo)',
      run: async () => {
        const athleteId = state.resolved.lastCreatedAthleteId || state.resolved.firstAthleteId;
        if (!athleteId) throw new Error('Necesitas ejecutar primero el paso 3 (o tener atletas en la BD).');
        const payload = {
          athleteId,
          sport: 'running',
          sessionDate: new Date().toISOString(),
          durationMinutes: 75,
          load: 82,
          surface: 'asphalt',
          location: { name: 'Parque del Retiro', lat: 40.4153, lon: -3.6844, countryCode: 'ES' }
        };
        const r = await fetch(`${API}/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const body = await r.json();
        if (!r.ok) throw new Error(`Status ${r.status} · ${body.message || ''}`);
        state.resolved.lastCreatedSessionId = body._id;
        return {
          status: r.status,
          body: {
            _id: body._id,
            athleteId: body.athleteId,
            riskLevel: body.riskLevel,
            weatherAlertLevel: body.weatherAlertLevel,
            externalDataStatus: body.externalDataStatus,
            sessionDate: body.sessionDate,
            location: body.location
          }
        };
      }
    },
    {
      id: 5,
      title: 'Estado APIs externas',
      sub: 'GET /external/status',
      run: async () => {
        const r = await fetch(`${API}/external/status`);
        const body = await r.json();
        if (!r.ok) throw new Error(`Status ${r.status}`);
        return { status: r.status, body };
      }
    }
  ];

  function renderQuick() {
    const grid = document.getElementById('quick-grid');
    grid.innerHTML = '';
    for (const step of QUICK_STEPS) {
      const card = document.createElement('button');
      card.className = 'quick-card';
      if (state.quick[step.id] === 'done') card.classList.add('done');
      if (state.quick[step.id] === 'error') card.classList.add('error');

      const num = document.createElement('div');
      num.className = 'num';
      num.textContent = state.quick[step.id] === 'done' ? '✓' :
                        state.quick[step.id] === 'error' ? '!' : step.id;

      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = step.title;

      const sub = document.createElement('div');
      sub.className = 'sub';
      sub.textContent = step.sub;

      card.appendChild(num);
      card.appendChild(title);
      card.appendChild(sub);
      card.addEventListener('click', () => runQuickStep(step));
      grid.appendChild(card);
    }
  }

  async function runQuickStep(step) {
    const out = document.getElementById('quick-result');
    out.classList.add('visible');
    out.textContent = `▶ Ejecutando: ${step.title}…`;
    try {
      const result = await step.run();
      state.quick[step.id] = 'done';
      const banner = `✓ ${step.title} · ${step.sub} · HTTP ${result.status}\n\n`;
      out.innerHTML = banner + highlightInteresting(JSON.stringify(result.body, null, 2));
    } catch (e) {
      state.quick[step.id] = 'error';
      out.textContent = `✗ ${step.title} falló: ${e.message}`;
    }
    renderQuick();
  }

  // ------------------ Helpers ------------------

  async function fetchJson(url) {
    const r = await fetch(url);
    if (!r.ok) return null;
    return r.json();
  }

  // ------------------ Init ------------------

  async function init() {
    renderSidebar();
    renderQuick();
    await checkHealth();
    // Pre-resolve common IDs so endpoint detail forms come pre-filled
    try {
      const athletes = await fetchJson(`${API}/athletes`);
      if (athletes?.athlete?.length) state.resolved.firstAthleteId = athletes.athlete[0]._id;
      const sessions = await fetchJson(`${API}/sessions?page=1&limit=1`);
      if (sessions?.data?.length) state.resolved.firstSessionId = sessions.data[0]._id;
      const injuries = await fetchJson(`${API}/injuries`);
      if (injuries?.injury?.length) state.resolved.firstInjuryId = injuries.injury[0]._id;
    } catch (_) { /* silent */ }
    // Auto-select first endpoint
    selectEndpoint('health');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
