'use strict';

(() => {
  // ── Demo Definitions ─────────────────────────────────────────────────────
  const DEMOS = {
    rag: {
      scenario: {
        tag: 'Demo: AI Knowledge Search',
        q: '<i data-lucide="message-circle" class="scenario-icon"></i>&nbsp; "What is our refund policy for customers?"'
      },
      nodes: [
        { icon: 'message-circle', label: 'Question Sent', badge: 'You asked...' },
        { icon: 'search', label: 'AI Searches Docs', badge: 'Scanning 1,200+ files...' },
        { icon: 'file-search', label: 'Sources Found', badge: '3 documents matched' },
        { icon: 'zap', label: 'Answer Ready', badge: 'In 1.2 seconds' }
      ],
      outputFn: typeRagOutput,
      benefit: {
        icon: 'clock',
        stat: '~6 hours saved per employee, per week',
        desc: 'Your team stops digging through folders and email threads. They ask a question and get the right answer instantly — from your own documents.'
      }
    },
    crm: {
      scenario: {
        tag: 'Demo: Automated Email Routing',
        q: '<i data-lucide="mail-open" class="scenario-icon"></i>&nbsp; An angry customer email arrives at 2 AM'
      },
      nodes: [
        { icon: 'mail', label: 'Email Received', badge: 'From customer' },
        { icon: 'bot', label: 'AI Reads It', badge: 'Tone & intent detected' },
        { icon: 'crosshair', label: 'Issue Identified', badge: 'Urgent billing dispute' },
        { icon: 'pen-line', label: 'Reply Drafted', badge: 'Ready for review' }
      ],
      outputFn: typeCrmOutput,
      benefit: {
        icon: 'shield-check',
        stat: 'Zero missed customer complaints — even at 3 AM',
        desc: 'Every inbound email is read, categorised, and escalated in seconds. Your team wakes up to solved problems, not angry backlogs.'
      }
    },
    automation: {
      scenario: {
        tag: 'Demo: AI Workflow Automation',
        q: '<i data-lucide="shopping-bag" class="scenario-icon"></i>&nbsp; A new customer places an order at midnight — no one is at the office'
      },
      nodes: [
        { icon: 'bell', label: 'Trigger Detected', badge: 'Order placed' },
        { icon: 'git-branch', label: 'AI Plans Actions', badge: 'Checking 5 systems' },
        { icon: 'zap', label: 'Automating Now', badge: '4 tasks fired' },
        { icon: 'check-circle-2', label: 'All Done', badge: 'In under 3 seconds' }
      ],
      outputFn: typeAutoOutput,
      benefit: {
        icon: 'trending-up',
        stat: '~4 staff-hours saved per transaction processed',
        desc: 'What used to need 5 people across 3 departments now happens automatically, in under 3 seconds — day or night, without anyone lifting a finger.'
      }
    }
  };

  // ── DOM References ────────────────────────────────────────────────────────
  const scenarioEl = document.getElementById('demo-scenario');
  const flowEl = document.getElementById('flow-wrap');
  const outputEl = document.getElementById('demo-output');
  const benefitEl = document.getElementById('benefit-card');
  const btnRun = document.getElementById('btn-run');
  const btnReset = document.getElementById('btn-reset');
  const tabs = document.querySelectorAll('.demo-tab');

  let currentDemo = 'rag';
  let isRunning = false;
  let timers = [];

  // ── Utilities ─────────────────────────────────────────────────────────────
  const sleep = ms => new Promise(r => { const t = setTimeout(r, ms); timers.push(t); });

  async function typeInto(el, text, speed = 22) {
    el.textContent = '';
    for (const ch of text) {
      if (!isRunning) break;
      el.textContent += ch;
      await sleep(speed + Math.random() * 18);
    }
  }

  function stopAll() {
    timers.forEach(t => { clearTimeout(t); clearInterval(t); });
    timers = [];
    isRunning = false;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function renderDemo(key) {
    stopAll();
    currentDemo = key;
    outputEl.classList.add('hidden');
    outputEl.innerHTML = '';
    benefitEl.classList.add('hidden');
    benefitEl.innerHTML = '';

    const demo = DEMOS[key];

    // Scenario
    scenarioEl.innerHTML = `
      <div class="scenario-tag">${demo.scenario.tag}</div>
      <div class="scenario-q">${demo.scenario.q}</div>`;
    lucide.createIcons();

    // Flow nodes + connectors
    let html = '';
    demo.nodes.forEach((n, i) => {
      html += `<div class="flow-node" id="node-${i}">
        <div class="node-icon"><i data-lucide="${n.icon}"></i></div>
        <div class="node-label">${n.label}</div>
        <div class="node-badge">${n.badge}</div>
      </div>`;
      if (i < demo.nodes.length - 1) {
        html += `<div class="flow-connector">
          <div class="connector-track">
            <div class="connector-fill" id="arrow-${i}"></div>
          </div>
        </div>`;
      }
    });
    flowEl.innerHTML = html;
    lucide.createIcons();

    btnRun.textContent = '▶\u00a0 Run Demo';
    btnRun.disabled = false;
  }

  // ── Animate Flow ──────────────────────────────────────────────────────────
  async function animateFlow() {
    const demo = DEMOS[currentDemo];
    for (let i = 0; i < demo.nodes.length; i++) {
      if (!isRunning) return;
      const node = document.getElementById(`node-${i}`);
      node.classList.add('active');
      await sleep(900);
      if (!isRunning) return;
      node.classList.remove('active');
      node.classList.add('done');
      node.querySelector('.node-badge').textContent = '✓ Done';

      if (i < demo.nodes.length - 1) {
        const arrow = document.getElementById(`arrow-${i}`);
        arrow.classList.add('done');
        await sleep(350);
      }
    }
  }

  // ── Output Builders ───────────────────────────────────────────────────────
  async function typeRagOutput() {
    outputEl.innerHTML = `
      <div class="output-label">📂 Sources Used</div>
      <div class="source-row">
        <span class="src-chip">📄 Refund Policy — 99% match</span>
        <span class="src-chip">📄 Terms of Service 2024</span>
        <span class="src-chip">📄 Customer FAQ</span>
      </div>
      <div style="height:20px"></div>
      <div class="chat-row right">
        <div class="bubble bubble-user">What is our refund policy for customers?</div>
      </div>
      <div class="chat-row">
        <div class="bubble bubble-ai" id="ai-answer"></div>
      </div>`;
    outputEl.classList.remove('hidden');
    const answer = 'Customers are entitled to a full refund within 30 days of purchase — no questions asked.\n\nAfter 30 days, they receive a credit toward their next invoice. Enterprise clients are handled directly by the account team.\n\nAll requests are resolved within 3 business days.';
    await typeInto(document.getElementById('ai-answer'), answer, 18);
  }

  async function typeCrmOutput() {
    outputEl.innerHTML = `
      <div class="output-label">📧 Incoming Email</div>
      <div class="email-card">
        <strong>From:</strong> sarah.jenkins@client.com<br>
        <strong>Subject:</strong> URGENT — Billing Error on Invoice #INV-9921<br><br>
        Hi, we were overcharged $4,500 for API usage we already disputed. Please fix this before our finance team closes the quarter.<br><br>
        — Sarah Jenkins, VP Operations
      </div>
      <div class="output-label">🎯 AI Analysis & Ticket Created</div>
      <div class="ticket-grid">
        <div class="ticket-field"><div class="t-label">Priority</div><div class="t-value red">🔴 High — Urgent</div></div>
        <div class="ticket-field"><div class="t-label">Category</div><div class="t-value">Billing Dispute</div></div>
        <div class="ticket-field"><div class="t-label">Contact</div><div class="t-value">Sarah Jenkins</div></div>
        <div class="ticket-field"><div class="t-label">Status</div><div class="t-value green">✅ Ticket Created</div></div>
      </div>
      <div class="output-label" style="margin-top:16px">✍️ AI-Drafted Reply (ready for human review)</div>
      <div class="draft-box" id="draft-text"></div>`;
    outputEl.classList.remove('hidden');
    const draft = '"Hi Sarah, I sincerely apologise for the inconvenience. I\'ve located Invoice #INV-9921 and escalated the $4,500 overcharge to our billing team for immediate correction. You\'ll receive an updated invoice within 24 hours."';
    await typeInto(document.getElementById('draft-text'), draft, 16);
  }

  async function typeAutoOutput() {
    const actions = [
      { icon: 'mail', color: '#60a5fa', label: 'Welcome email sent to customer', time: '0.3s' },
      { icon: 'package', color: '#f59e0b', label: 'Inventory updated — stock reduced by 1', time: '0.6s' },
      { icon: 'truck', color: '#a78bfa', label: 'Warehouse notified — shipping queued', time: '0.9s' },
      { icon: 'user-plus', color: '#22c55e', label: 'CRM record created & sales rep assigned', time: '1.4s' },
      { icon: 'file-text', color: '#f87171', label: 'Invoice generated & sent to finance team', time: '2.1s' },
    ];

    outputEl.innerHTML = `
      <div class="output-label">⚡ Actions Completed Automatically</div>
      <div class="auto-timeline" id="auto-timeline"></div>
      <div class="auto-footer hidden" id="auto-footer">
        <i data-lucide="shield-check" class="auto-footer-icon"></i>
        <span>All of this happened in <strong>2.1 seconds</strong> — with zero human involvement.</span>
      </div>`;
    outputEl.classList.remove('hidden');
    lucide.createIcons();

    const tl = document.getElementById('auto-timeline');
    for (const a of actions) {
      if (!isRunning) break;
      await sleep(480);
      const row = document.createElement('div');
      row.className = 'auto-row';
      row.innerHTML = `
        <div class="auto-icon" style="--c:${a.color}"><i data-lucide="${a.icon}"></i></div>
        <div class="auto-text">${a.label}</div>
        <div class="auto-time">${a.time}</div>`;
      tl.appendChild(row);
      lucide.createIcons();
    }

    await sleep(400);
    const footer = document.getElementById('auto-footer');
    if (footer) footer.classList.remove('hidden');
  }

  // ── Run ───────────────────────────────────────────────────────────────────
  async function runDemo() {
    if (isRunning) return;
    isRunning = true;
    btnRun.disabled = true;
    btnRun.textContent = 'Running…';
    outputEl.classList.add('hidden');
    outputEl.innerHTML = '';

    await animateFlow();
    if (!isRunning) return;

    await sleep(300);
    await DEMOS[currentDemo].outputFn();
    if (!isRunning) return;

    // Benefit card
    await sleep(400);
    const b = DEMOS[currentDemo].benefit;
    benefitEl.innerHTML = `
      <div class="benefit-icon"><i data-lucide="${b.icon}"></i></div>
      <div class="benefit-body">
        <div class="benefit-stat">${b.stat}</div>
        <div class="benefit-desc">${b.desc}</div>
      </div>`;
    benefitEl.classList.remove('hidden');
    lucide.createIcons();

    isRunning = false;
    btnRun.disabled = false;
    btnRun.textContent = '▶\u00a0 Run Again';
  }

  // ── Events ────────────────────────────────────────────────────────────────
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      if (isRunning) return;
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderDemo(tab.dataset.demo);
    });
  });

  btnRun.addEventListener('click', runDemo);
  btnReset.addEventListener('click', () => renderDemo(currentDemo));

  // Init
  renderDemo('rag');
})();
