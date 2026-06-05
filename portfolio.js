/* ═══════════════════════════════════════════════
   PORTFOLIO & SIMULATION CONTROLLER
   ═══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  // Mobile Nav Toggle (standard for interior pages)
  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('nav-bar');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      nav.classList.toggle('nav-bar--open');
      toggle.classList.toggle('is-active');
      const navLinks = nav.querySelector('.nav-links');
      if (navLinks) navLinks.classList.toggle('is-active');
    });
  }

  // ── Category Filters ───────────────────────────────────────────────────────
  const filterButtons = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.portfolio-card');

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Set active button style
      filterButtons.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      const filterVal = btn.getAttribute('data-filter');

      projectCards.forEach(card => {
        const categories = card.getAttribute('data-category').split(' ');
        
        if (filterVal === 'all' || categories.includes(filterVal)) {
          card.style.display = 'grid';
          // Force reflow for fade in transition
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, 50);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'translateY(15px)';
          setTimeout(() => {
            card.style.display = 'none';
          }, 300);
        }
      });
    });
  });

  // ── Simulations Engine ─────────────────────────────────────────────────────
  // Define steps for each project simulation (layperson friendly)
  const simData = {
    yoobuy: [
      { text: "AI Agent scanning multiple retail sites for active listing...", icon: "🔍" },
      { text: "AI Negotiator agent negotiating discount via merchant APIs...", icon: "🤝" },
      { text: "Deal secured! Saved 12% ($114). Item added to shopping cart.", icon: "✓" }
    ],
    automation: [
      { text: "Detecting new supplier invoice uploaded to document inbox...", icon: "📂" },
      { text: "Local Vision-LLM parsing line items and checking compliance...", icon: "⚙️" },
      { text: "Invoice verified. ERP database updated. Slack notification sent.", icon: "✓" }
    ],
    rag: [
      { text: "Retrieving source pages from private enterprise database...", icon: "🧬" },
      { text: "Cross-referencing precedents using PGVector local server...", icon: "🛡️" },
      { text: "Citation-accurate answer written. Data remained 100% private.", icon: "✓" }
    ],
    enablement: [
      { text: "Identifying manual bottlenecks across operations & sales...", icon: "📋" },
      { text: "Enrolling employees in tailored prompt engineering tracks...", icon: "🎓" },
      { text: "Upskilling metrics achieved! Team output multiplier at 1.8x.", icon: "✓" }
    ]
  };

  const playOverlays = document.querySelectorAll('.portfolio-card__play-overlay');

  playOverlays.forEach(overlay => {
    overlay.addEventListener('click', () => {
      const card = overlay.closest('.portfolio-card');
      const simOverlay = card.querySelector('.portfolio-card__sim-overlay');
      const simType = card.getAttribute('data-sim');
      const simBoxContent = simOverlay.querySelector('.sim-content');

      // Clear any existing active timeout before starting
      if (card.dataset.timeoutId) {
        clearTimeout(parseInt(card.dataset.timeoutId, 10));
        delete card.dataset.timeoutId;
      }

      // Hide the play overlay
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';

      // Open the simulation terminal overlay
      simOverlay.classList.add('is-active');

      // Load steps
      runSimulation(simType, simBoxContent, card);
    });
  });

  // Function to run a simulation sequence
  function runSimulation(type, container, card) {
    const steps = simData[type];
    if (!steps) return;

    // Clear previous timeout if any
    if (card.dataset.timeoutId) {
      clearTimeout(parseInt(card.dataset.timeoutId, 10));
      delete card.dataset.timeoutId;
    }

    // Clear previous simulation content
    container.innerHTML = '';

    // Create HTML nodes for steps
    const stepNodes = steps.map((step) => {
      const stepDiv = document.createElement('div');
      stepDiv.className = 'sim-step';
      stepDiv.innerHTML = `
        <div class="sim-icon">${step.icon}</div>
        <span>${step.text}</span>
      `;
      container.appendChild(stepDiv);
      return stepDiv;
    });

    // Animate steps sequentially
    let currentStep = 0;

    function next() {
      if (currentStep > 0) {
        // Mark previous step as completed
        stepNodes[currentStep - 1].classList.remove('is-active');
        stepNodes[currentStep - 1].classList.add('is-completed');
        // Update icon to checkmark for visual clarity
        const iconDiv = stepNodes[currentStep - 1].querySelector('.sim-icon');
        if (iconDiv) iconDiv.innerHTML = '✓';
      }

      if (currentStep < steps.length) {
        // Activate current step
        stepNodes[currentStep].classList.add('is-active');
        currentStep++;
        
        // Save current timeout ID to prevent race conditions on close
        const timeoutId = setTimeout(next, 1800);
        card.dataset.timeoutId = String(timeoutId);
      } else {
        // Finished simulation
        delete card.dataset.timeoutId;

        const successBanner = document.createElement('div');
        successBanner.className = 'sim-success-banner';
        successBanner.innerHTML = '⚡ System Run Completed';
        container.appendChild(successBanner);

        // Add a replay button
        const replayBtn = document.createElement('button');
        replayBtn.className = 'filter-btn';
        replayBtn.style.marginTop = '1rem';
        replayBtn.style.alignSelf = 'center';
        replayBtn.style.padding = '0.4rem 1.2rem';
        replayBtn.style.fontSize = '0.75rem';
        replayBtn.innerText = 'Run Again';
        replayBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          runSimulation(type, container, card);
        });
        container.appendChild(replayBtn);
      }
    }

    // Start execution
    next();
  }

  // Handle Simulation Close button
  const simCloseButtons = document.querySelectorAll('.sim-box__close');
  simCloseButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Avoid triggering overlays again
      
      const overlay = btn.closest('.portfolio-card__sim-overlay');
      const card = btn.closest('.portfolio-card');
      const playOverlay = card.querySelector('.portfolio-card__play-overlay');
      
      // Clear any active timeout
      if (card.dataset.timeoutId) {
        clearTimeout(parseInt(card.dataset.timeoutId, 10));
        delete card.dataset.timeoutId;
      }

      // Hide simulator container
      overlay.classList.remove('is-active');
      
      // Show play hover overlay again
      if (playOverlay) {
        playOverlay.style.opacity = '';
        playOverlay.style.pointerEvents = '';
      }

      // Clear layout content inside simulator
      const simBoxContent = overlay.querySelector('.sim-content');
      if (simBoxContent) simBoxContent.innerHTML = '';
    });
  });
});
