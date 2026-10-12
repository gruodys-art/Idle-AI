function icon(name: string): string {
  return `<span class="icon" aria-hidden="true">${name}</span>`
}

function radarSvg(): string {
  return `
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="42" fill="none" stroke="#cadcf1" stroke-dasharray="2 2" stroke-width="1"></circle>
      <circle cx="50" cy="50" r="28" fill="none" stroke="#cadcf1" stroke-width="1"></circle>
      <circle cx="50" cy="50" r="14" fill="none" stroke="#cadcf1" stroke-width="1"></circle>
      <line x1="50" y1="6" x2="50" y2="94" stroke="#cadcf1" stroke-width="0.8"></line>
      <line x1="6" y1="50" x2="94" y2="50" stroke="#cadcf1" stroke-width="0.8"></line>
      <circle cx="34" cy="28" r="2.5" fill="#9c3f0d"></circle>
      <circle cx="68" cy="62" r="2" fill="#1e6c3d"></circle>
      <g class="sweep">
        <path d="M50 50 L50 8 A42 42 0 0 1 82 24 Z" fill="#9c3f0d" opacity="0.18"></path>
        <line x1="50" y1="50" x2="82" y2="24" stroke="#9c3f0d" stroke-width="1.5" stroke-linecap="round"></line>
      </g>
    </svg>`
}

export function mountShell(root: HTMLElement): void {
  root.innerHTML = `
    <main class="shell" data-tab="deck">
      <header class="topbar">
        <div class="topbar-row">
          <div class="brand-lockup">
            <p class="brand">SpaceIdle</p>
            <span class="phase-pill">Phase 1: Asteroid</span>
            <div class="desktop-tabs" role="tablist" aria-label="Station decks">
              <button type="button" class="tab active" data-action="set-tab" data-tab="deck">${icon('token')} Deck</button>
              <button type="button" class="tab" data-action="set-tab" data-tab="survey">${icon('radar')} Survey</button>
              <button type="button" class="tab" data-action="set-tab" data-tab="fleet">${icon('precision_manufacturing')} Fleet</button>
              <button type="button" class="tab" data-action="set-tab" data-tab="terraform">${icon('public')} Terraform</button>
              <button type="button" class="tab" data-action="set-tab" data-tab="faction">${icon('shield')} Faction</button>
            </div>
          </div>
          <div class="topbar-actions">
            <button type="button" class="icon-btn" data-action="toggle-overflow" aria-label="Station menu">${icon('more_vert')}</button>
            <img class="insignia" src="/insignia.svg" alt="" width="32" height="32" />
            <div class="overflow-menu" data-bind="overflow-menu" hidden>
              <div class="overflow-label">Sim speed</div>
              <div class="speed-row" role="group" aria-label="Game speed">
                <button type="button" class="speed-btn active" data-action="set-speed" data-speed="1">1×</button>
                <button type="button" class="speed-btn" data-action="set-speed" data-speed="10">10×</button>
                <button type="button" class="speed-btn" data-action="set-speed" data-speed="100">100×</button>
                <button type="button" class="speed-btn" data-action="set-speed" data-speed="1000">1000×</button>
              </div>
              <button type="button" class="speed-btn reset-btn" data-action="open-reset">Reset assignment</button>
            </div>
          </div>
        </div>
        <div class="telemetry-strip">
          <span class="clock"><span class="live-dot"></span><span data-bind="mission-clock">T+00:00:00</span></span>
          <span>
            <span class="strip-mass" data-bind="header-mass">0 kg</span>
            <span class="strip-rate" data-bind="header-rate">+0 kg/s</span>
          </span>
        </div>
      </header>

      <div class="workspace">
        <section class="card" data-slot="phase-gate" data-show="deck">
          <div class="kicker">
            <span class="label-sm"><span class="live-dot"></span> Phase 1 field operations · orbital target 250 t</span>
            <span class="mono" style="color:var(--primary);font-weight:700" data-bind="gate-pct">0%</span>
          </div>
          <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-fill" data-bind="gate-fill"></div>
          </div>
          <div class="gate-note">
            <span data-bind="gate-mass">0 / 250 t stored</span>
            <span data-bind="gate-req">${icon('lock')} Req. Survey Lv 3</span>
          </div>
          <p class="gate-hint">${icon('info')} Satellite capture rights unlock at 250 t payload and Survey Lv 3.</p>
        </section>

        <section class="card" data-slot="asteroid" data-show="deck survey" aria-label="Current asteroid">
          <div class="asteroid-head">
            <div>
              <div class="title-row">
                <h2 class="card-title" data-bind="asteroid-name">—</h2>
                <span class="pill neutral" data-bind="asteroid-tier">—</span>
              </div>
              <div class="title-row" style="margin-top:0.35rem">
                <span class="pill idle" data-bind="status">Idle</span>
              </div>
            </div>
            <span class="pill warn" data-bind="ore-hazard">Hazard —</span>
          </div>
          <div class="mass-gauge">
            <div class="mass-line">
              <span><span class="mass-remain" data-bind="remaining">0 kg</span> <span class="muted">/ <span data-bind="total">0 kg</span></span></span>
              <span class="mass-pct" data-bind="pct">0%</span>
            </div>
            <div class="progress" style="margin-top:0.4rem" role="progressbar">
              <div class="progress-fill" data-bind="progress-fill"></div>
            </div>
            <div class="meta-row">
              <span data-bind="depletion-eta">—</span>
              <span data-bind="mine-rate-note">—</span>
            </div>
          </div>
          <div class="label-sm" style="margin-top:0.7rem">Assay composition matrix</div>
          <div class="assay-grid" data-bind="assay-grid"></div>
          <div class="rock-actions">
            <button type="button" class="btn ghost" data-action="toggle-assay">${icon('biotech')} Assay sheet</button>
            <button type="button" class="btn danger" data-action="discard-asteroid" data-bind="discard-active">${icon('close')} Discard rock</button>
          </div>
        </section>

        <section class="card" data-slot="hopper" data-show="deck" aria-label="Resources">
          <div class="hopper-head">
            <div>
              <div class="label-sm">Total station hopper</div>
              <div class="hopper-total">
                <span data-bind="total-mass">0 kg</span>
                <span class="stock-rate" data-bind="rate">+0 kg/s</span>
              </div>
            </div>
          </div>
          <div class="stockpile" data-bind="stockpile"></div>
        </section>

        <section class="card" data-slot="survey" data-show="deck survey" aria-label="Found asteroids">
          <div class="tab-only-survey">
            <div class="kicker">
              <span class="label-sm"><span class="live-dot ok"></span> Deep space radar · scan cycle</span>
              <span class="pill mining" data-bind="radar-level">Lv 1 radar</span>
            </div>
            <div class="radar-block">
              <div class="radar">${radarSvg()}</div>
              <div>
                <div class="kicker" style="margin:0">
                  <span style="font-weight:600">Cis-belt orbital sweep</span>
                  <span class="mono" data-bind="search-cycle">—</span>
                </div>
                <div class="radar-eta" data-bind="search-countdown">—</div>
                <p class="empty" style="margin:0.2rem 0 0" data-bind="search-status-copy">Next asteroid orbital calculation incoming</p>
              </div>
            </div>
          </div>
          <div class="kicker">
            <div>
              <h2 class="card-title">Survey queue</h2>
              <div class="mono" style="font-size:10px;color:var(--on-surface-variant)" data-bind="search-level-copy">Search Lv 1</div>
            </div>
            <span class="pill neutral" data-bind="queue-slots">0 / 5</span>
          </div>
          <div class="meta-row" style="margin-top:0">
            <span>Cycle radar pulse</span>
            <span class="mass-pct" data-bind="search-eta">—</span>
          </div>
          <div class="progress thin">
            <div class="progress-fill" data-bind="search-fill"></div>
          </div>
          <div class="tab-only-survey" style="margin-top:0.7rem">
            <div class="kicker">
              <span class="label-sm">Spectrometry target filter</span>
              <span class="mono" style="font-size:10px;color:var(--secondary)" data-bind="search-target-hint">Any resource</span>
            </div>
            <div class="target-chips" data-bind="search-target"></div>
            <div class="upgrade-grid">
              <button type="button" class="btn primary" data-action="upgrade-search">
                <span class="btn-title">Upgrade survey array ${icon('upgrade')}</span>
                <span class="btn-sub" data-bind="search-upgrade-cost">—</span>
              </button>
              <button type="button" class="btn secondary" data-action="upgrade-queue">
                <span class="btn-title">Expand queue rack</span>
                <span class="btn-sub" data-bind="queue-upgrade-cost">—</span>
              </button>
            </div>
          </div>
          <div class="queue-list" data-bind="queue-list"></div>
        </section>

        <section class="card" data-slot="fleet" data-show="deck fleet" aria-label="Mining fleet">
          <div class="tab-only-fleet">
            <div class="kicker">
              <span class="label-sm"><span class="live-dot ok"></span> Sub-deck 03 · autonomous wings</span>
            </div>
            <h2 class="card-title">Drone fleet operations</h2>
            <div class="fleet-hero">
              <div class="label-sm">Active drone fleet summary</div>
              <div class="fleet-count"><span data-bind="fleet-count">1</span><span data-bind="fleet-count-label">unit deployed</span></div>
              <div class="pill mining" style="margin-top:0.35rem">${icon('speed')} Aggregate <span data-bind="fleet-yield">0 kg/s</span></div>
              <div class="stat-grid">
                <div class="stat-cell">
                  <div class="label-sm">Fleet MTTF</div>
                  <div class="mono" data-bind="fleet-mttf">—</div>
                </div>
                <div class="stat-cell">
                  <div class="label-sm">Safety / fab</div>
                  <div class="mono" data-bind="fleet-levels">1 / 1</div>
                </div>
              </div>
              <div class="warranty">${icon('verified')} <span><strong>Empire warranty active:</strong> if the last drone is lost, an emergency tech-1 unit is fabricated at zero cost.</span></div>
            </div>
          </div>
          <div class="kicker" style="margin-top:0.35rem">
            <div>
              <h2 class="card-title">Autonomous fleet</h2>
              <div class="mono" style="font-size:10px;color:var(--on-surface-variant)" data-bind="fleet-summary">1 drone</div>
            </div>
            <div class="mono" style="font-size:10px;text-align:right" data-bind="drone-groups-brief"></div>
          </div>
          <div class="tab-only-fleet">
            <div class="label-sm">Deployed swarm architecture</div>
            <div class="drone-groups" data-bind="drone-groups"></div>
          </div>
          <button type="button" class="btn primary" data-action="build-drone">
            <span class="btn-title">${icon('precision_manufacturing')} Fabricate mining drone</span>
            <span class="btn-sub" data-bind="build-drone-cost">—</span>
          </button>
          <div class="fab-slot" data-bind="build-progress-wrap" hidden>
            <div class="mono" style="font-size:10px;font-weight:600" data-bind="build-eta">—</div>
            <div class="progress thin" style="margin-top:0.4rem">
              <div class="progress-fill" data-bind="build-fill"></div>
            </div>
          </div>
          <div class="auto-build">
            <div class="auto-row">
              <span style="font-size:13px;font-weight:600">${icon('sync')} Fleet auto-replenish</span>
              <button type="button" class="toggle" data-action="toggle-auto-build" data-bind="auto-build-toggle">AUTO: OFF</button>
              <input type="checkbox" data-action="toggle-auto-build" data-bind="auto-build" hidden />
            </div>
            <div class="auto-row">
              <span class="empty" style="margin:0">Fleet ceiling target</span>
              <div class="stepper">
                <button type="button" class="stepper-btn" data-action="nudge-drone-target" data-delta="-1">−</button>
                <input type="number" class="auto-build-input" data-action="set-drone-target" data-bind="drone-target" min="1" max="500" step="1" value="1" />
                <button type="button" class="stepper-btn" data-action="nudge-drone-target" data-delta="1">+</button>
              </div>
            </div>
            <div class="mono" style="font-size:10px;color:var(--on-surface-variant)" data-bind="auto-build-status">1 / 1</div>
          </div>
          <div class="tab-only-fleet" style="margin-top:0.7rem">
            <div class="label-sm">Engineering modules &amp; avionics</div>
            <div class="upgrade-grid">
              <button type="button" class="btn primary" data-action="upgrade-drone-tech">
                <span class="btn-title">Upgrade drone tech ${icon('upgrade')}</span>
                <span class="btn-sub" data-bind="drone-tech-cost">—</span>
              </button>
              <p class="notice">${icon('info')} Existing deployed fleet is not retrofitted.</p>
              <button type="button" class="btn primary" data-action="upgrade-drone-fab">
                <span class="btn-title">Upgrade fabrication speed ${icon('bolt')}</span>
                <span class="btn-sub" data-bind="drone-fab-cost">—</span>
              </button>
              <button type="button" class="btn primary" data-action="upgrade-drone-safety">
                <span class="btn-title">Drone safety &amp; shielding ${icon('shield')}</span>
                <span class="btn-sub" data-bind="drone-safety-cost">—</span>
              </button>
            </div>
          </div>
        </section>

        <section class="card" data-slot="log" data-show="deck fleet" aria-label="Event log">
          <div class="kicker">
            <span class="label-sm">${icon('receipt_long')} Mission telemetry log</span>
            <span class="mono" style="font-size:10px;color:var(--secondary);font-weight:500">Live stream</span>
          </div>
          <div class="log-list" data-bind="event-log"></div>
        </section>

        <section class="card locked-card" data-slot="terraform" data-show="terraform">
          <span class="pill warn">${icon('lock')} Phase locked</span>
          <h2 class="card-title">Satellite terraforming</h2>
          <p>Geo-engineering stays sealed until you earn satellite capture rights (250 t stored and Survey Lv 3), then complete orbital mining. Staged atmosphere, climate, and hydrology work will live here.</p>
        </section>

        <section class="card locked-card" data-slot="faction" data-show="faction">
          <span class="pill warn">${icon('badge')} Unaligned prospector</span>
          <h2 class="card-title">Faction commission</h2>
          <p>Empire University field license is active. Allegiance — Empire subsidies with a production tax, or Rebel autonomy with military / terraform duty — opens after orbital rights.</p>
        </section>
      </div>

      <nav class="tabbar" aria-label="Primary">
        <button type="button" class="tab active" data-action="set-tab" data-tab="deck">${icon('token')}<span>Deck</span></button>
        <button type="button" class="tab" data-action="set-tab" data-tab="survey">${icon('radar')}<span>Survey</span></button>
        <button type="button" class="tab" data-action="set-tab" data-tab="fleet">${icon('precision_manufacturing')}<span>Fleet</span></button>
        <button type="button" class="tab" data-action="set-tab" data-tab="terraform">${icon('public')}<span>Terraform</span></button>
        <button type="button" class="tab" data-action="set-tab" data-tab="faction">${icon('shield')}<span>Faction</span></button>
      </nav>
    </main>

    <div class="confirm-backdrop" data-bind="reset-confirm" hidden>
      <div class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="reset-title">
        <h2 id="reset-title">Reset field assignment?</h2>
        <p>This clears the local save and returns you to a starter drone on a new rock. This cannot be undone.</p>
        <div class="confirm-actions">
          <button type="button" class="btn ghost" data-action="cancel-reset">Cancel</button>
          <button type="button" class="btn danger" data-action="reset-game">Reset</button>
        </div>
      </div>
    </div>
  `
}
