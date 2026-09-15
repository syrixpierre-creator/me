/**
 * SYRIX FLIX — Composant d'Édition de Profil Utilisateur (Display Name & Bio)
 * Permet aux utilisateurs de modifier leur nom d'affichage et leur biographie
 * avec validation en direct, compteur de caractères, prévisualisation temps-réel,
 * et synchronisation bidirectionnelle avec l'état du profil (backend + session).
 */
(function () {
  const MAX_BIO_LENGTH = 200;
  const MIN_NAME_LENGTH = 3;
  const MAX_NAME_LENGTH = 32;

  // Modèle de bio prédéfinie pour sélection rapide
  const BIO_PRESETS = [
    "Cinéphile passionné de 4K Ultra HD & thrillers.",
    "Fan inconditionnel d'anime en VOSTFR et de shonen.",
    "Adepte de K-Dramas et de séries à suspense.",
    "Marathons de films de science-fiction & pop-corn."
  ];

  class ProfileEditorComponent {
    constructor(container, options = {}) {
      this.container = typeof container === "string" ? document.querySelector(container) : container;
      if (!this.container) {
        console.error("[ProfileEditor] Conteneur introuvable :", container);
        return;
      }

      this.options = Object.assign(
        {
          onUpdate: null,
          showLivePreview: true,
          showPresets: true,
          initialUser: null
        },
        options
      );

      // État interne du composant
      this.state = {
        displayName: "",
        bio: "",
        originalDisplayName: "",
        originalBio: "",
        profileImage: "",
        isSubmitting: false,
        hasUnsavedChanges: false,
        error: null,
        successMessage: null
      };

      this.init();
    }

    /**
     * Initialise le composant et lie son état à l'état du profil existant
     */
    async init() {
      // 1. Récupération de l'état existant depuis le cache de session
      const cached = window.SyrixAuth ? window.SyrixAuth.getCachedUser() : null;
      const initial = this.options.initialUser || cached || {};

      this.updateStateFromUser(initial);
      this.render();

      // 2. Synchronisation fraîche avec l'API backend /profile
      if (window.SyrixAuth && window.SyrixAuth.api) {
        try {
          const res = await window.SyrixAuth.api("/profile");
          if (res.success && res.data) {
            this.updateStateFromUser(res.data);
            this.render();
          }
        } catch (err) {
          console.warn("[ProfileEditor] Erreur synchronisation initiale :", err);
        }
      }

      // 3. Écoute des mises à jour externes du profil
      document.addEventListener("sf:profile-updated", (e) => {
        if (e.detail && !this.state.isSubmitting) {
          this.updateStateFromUser(e.detail);
          this.syncFormFields();
          this.updatePreview();
        }
      });
    }

    updateStateFromUser(user) {
      const name = user.username || user.displayName || "";
      const bio = user.bio || "";
      const profileImage = user.profileImage || "";

      this.state.displayName = name;
      this.state.bio = bio;
      this.state.originalDisplayName = name;
      this.state.originalBio = bio;
      this.state.profileImage = profileImage;
      this.state.hasUnsavedChanges = false;
    }

    render() {
      const { displayName, bio, hasUnsavedChanges } = this.state;
      const charsLeft = MAX_BIO_LENGTH - (bio ? bio.length : 0);

      this.container.innerHTML = `
        <div class="sf-profile-editor-card">
          <!-- En-tête de section -->
          <div class="sf-editor-header">
            <div class="sf-editor-title-wrap">
              <span class="sf-editor-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </span>
              <div>
                <h3 class="sf-editor-title">Identité &amp; Biographie</h3>
                <p class="sf-editor-sub">Personnalisez votre nom d'affichage et votre profil public</p>
              </div>
            </div>
            <div class="sf-editor-sync-badge ${hasUnsavedChanges ? 'sf-sync--unsaved' : 'sf-sync--synced'}" id="sfEditorSyncBadge">
              <span class="sf-sync-dot"></span>
              <span id="sfSyncStatusText">${hasUnsavedChanges ? 'Modifications non enregistrées' : 'Synchronisé avec le compte'}</span>
            </div>
          </div>

          <!-- Formulaire d'édition -->
          <form id="sfProfileEditorForm" class="sf-editor-form" novalidate>
            <!-- Champ 1 : Nom d'affichage / Display Name -->
            <div class="sf-form-group">
              <div class="sf-field-header">
                <label for="sfInputDisplayName">Nom d'affichage (Display Name)</label>
                <span class="sf-field-hint">Visible par tous les membres</span>
              </div>
              <div class="sf-input-wrap">
                <span class="sf-input-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </span>
                <input 
                  type="text" 
                  id="sfInputDisplayName" 
                  class="sf-text-input" 
                  placeholder="Votre nom d'affichage"
                  value="${this.escapeHtml(displayName)}"
                  minlength="${MIN_NAME_LENGTH}"
                  maxlength="${MAX_NAME_LENGTH}"
                  autocomplete="nickname"
                  required
                />
              </div>
              <div class="sf-field-feedback" id="sfDisplayNameFeedback"></div>
            </div>

            <!-- Champ 2 : Biographie / Bio -->
            <div class="sf-form-group">
              <div class="sf-field-header">
                <label for="sfTextareaBio">Biographie (Bio)</label>
                <span class="sf-char-counter ${charsLeft < 20 ? 'sf-char--warning' : ''}" id="sfBioCounter">
                  ${charsLeft} caractères restants
                </span>
              </div>
              <div class="sf-textarea-wrap">
                <textarea 
                  id="sfTextareaBio" 
                  class="sf-textarea" 
                  rows="3" 
                  maxlength="${MAX_BIO_LENGTH}"
                  placeholder="Décrivez vos goûts cinématographiques, vos sagas préférées..."
                >${this.escapeHtml(bio)}</textarea>
              </div>
              
              <!-- Suggestions rapides de bio -->
              ${this.options.showPresets ? `
                <div class="sf-presets-bar">
                  <span class="sf-presets-label">Idées de bio :</span>
                  <div class="sf-presets-pills">
                    ${BIO_PRESETS.map((preset) => `
                      <button type="button" class="sf-preset-btn" data-preset="${this.escapeHtml(preset)}">
                        ${this.escapeHtml(preset)}
                      </button>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- Live Preview Card -->
            ${this.options.showLivePreview ? `
              <div class="sf-live-preview-box">
                <div class="sf-preview-header">
                  <span class="sf-preview-tag">Aperçu en direct</span>
                </div>
                <div class="sf-preview-card">
                  <div class="sf-preview-avatar" id="sfPreviewAvatar">
                    ${this.renderAvatarIcon()}
                  </div>
                  <div class="sf-preview-content">
                    <div class="sf-preview-name" id="sfPreviewName">${this.escapeHtml(displayName || "Nom d'affichage")}</div>
                    <div class="sf-preview-bio" id="sfPreviewBio">${this.escapeHtml(bio || "Aucune biographie rédigée.")}</div>
                  </div>
                </div>
              </div>
            ` : ''}

            <!-- Alertes Erreur / Succès -->
            <div class="sf-editor-alert sf-alert--error" id="sfEditorAlertError" style="display:none;"></div>
            <div class="sf-editor-alert sf-alert--success" id="sfEditorAlertSuccess" style="display:none;"></div>

            <!-- Actions du formulaire -->
            <div class="sf-editor-actions">
              <button type="submit" class="sf-btn sf-btn--primary sf-btn--save" id="sfBtnSaveProfile">
                <span class="sf-btn-spinner" id="sfSaveSpinner" style="display:none;"></span>
                <span id="sfSaveBtnText">Enregistrer les modifications</span>
              </button>
              <button type="button" class="sf-btn sf-btn--outline" id="sfBtnResetProfile" ${!hasUnsavedChanges ? 'disabled' : ''}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      `;

      this.bindEvents();
    }

    renderAvatarIcon() {
      if (this.state.profileImage && this.state.profileImage.trim()) {
        return `<img src="${this.escapeHtml(this.state.profileImage)}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;" />`;
      }
      return `
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      `;
    }

    bindEvents() {
      const form = this.container.querySelector("#sfProfileEditorForm");
      const nameInput = this.container.querySelector("#sfInputDisplayName");
      const bioTextarea = this.container.querySelector("#sfTextareaBio");
      const resetBtn = this.container.querySelector("#sfBtnResetProfile");

      // Écoute des frappes sur le Display Name
      nameInput.addEventListener("input", (e) => {
        this.state.displayName = e.target.value;
        this.checkUnsavedChanges();
        this.validateDisplayName();
        this.updatePreview();
      });

      // Écoute des frappes sur la Bio
      bioTextarea.addEventListener("input", (e) => {
        this.state.bio = e.target.value;
        this.checkUnsavedChanges();
        this.updateBioCounter();
        this.updatePreview();
      });

      // Clics sur les suggestions de bio
      this.container.querySelectorAll(".sf-preset-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const text = btn.getAttribute("data-preset");
          bioTextarea.value = text;
          this.state.bio = text;
          this.checkUnsavedChanges();
          this.updateBioCounter();
          this.updatePreview();
        });
      });

      // Bouton Réinitialiser
      resetBtn.addEventListener("click", () => {
        this.resetChanges();
      });

      // Soumission du formulaire
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await this.saveProfile();
      });
    }

    checkUnsavedChanges() {
      const nameChanged = this.state.displayName.trim() !== this.state.originalDisplayName.trim();
      const bioChanged = this.state.bio.trim() !== this.state.originalBio.trim();
      this.state.hasUnsavedChanges = nameChanged || bioChanged;

      // Mise à jour du badge de statut
      const badge = this.container.querySelector("#sfEditorSyncBadge");
      const text = this.container.querySelector("#sfSyncStatusText");
      const resetBtn = this.container.querySelector("#sfBtnResetProfile");

      if (badge && text) {
        if (this.state.hasUnsavedChanges) {
          badge.className = "sf-editor-sync-badge sf-sync--unsaved";
          text.textContent = "Modifications non enregistrées";
        } else {
          badge.className = "sf-editor-sync-badge sf-sync--synced";
          text.textContent = "Synchronisé avec le compte";
        }
      }

      if (resetBtn) {
        resetBtn.disabled = !this.state.hasUnsavedChanges;
      }
    }

    validateDisplayName() {
      const feedback = this.container.querySelector("#sfDisplayNameFeedback");
      const val = this.state.displayName.trim();

      if (!feedback) return true;

      if (val.length === 0) {
        feedback.textContent = "Le nom d'affichage ne peut pas être vide.";
        feedback.className = "sf-field-feedback sf-feedback--error";
        return false;
      }

      if (val.length < MIN_NAME_LENGTH) {
        feedback.textContent = `Au moins ${MIN_NAME_LENGTH} caractères requis (${val.length}/${MIN_NAME_LENGTH}).`;
        feedback.className = "sf-field-feedback sf-feedback--error";
        return false;
      }

      if (val.length > MAX_NAME_LENGTH) {
        feedback.textContent = `Maximum ${MAX_NAME_LENGTH} caractères dépassé.`;
        feedback.className = "sf-field-feedback sf-feedback--error";
        return false;
      }

      feedback.textContent = "Nom d'affichage valide";
      feedback.className = "sf-field-feedback sf-feedback--success";
      return true;
    }

    updateBioCounter() {
      const counter = this.container.querySelector("#sfBioCounter");
      if (!counter) return;

      const remaining = MAX_BIO_LENGTH - (this.state.bio ? this.state.bio.length : 0);
      counter.textContent = `${remaining} caractères restants`;
      counter.className = `sf-char-counter ${remaining < 20 ? 'sf-char--warning' : ''}`;
    }

    updatePreview() {
      const nameEl = this.container.querySelector("#sfPreviewName");
      const bioEl = this.container.querySelector("#sfPreviewBio");

      if (nameEl) {
        nameEl.textContent = this.state.displayName.trim() || "Nom d'affichage";
      }
      if (bioEl) {
        bioEl.textContent = this.state.bio.trim() || "Aucune biographie rédigée.";
      }
    }

    resetChanges() {
      this.state.displayName = this.state.originalDisplayName;
      this.state.bio = this.state.originalBio;
      this.state.hasUnsavedChanges = false;

      this.syncFormFields();
      this.updateBioCounter();
      this.updatePreview();
      this.checkUnsavedChanges();

      const feedback = this.container.querySelector("#sfDisplayNameFeedback");
      if (feedback) feedback.textContent = "";

      this.hideAlerts();
    }

    syncFormFields() {
      const nameInput = this.container.querySelector("#sfInputDisplayName");
      const bioTextarea = this.container.querySelector("#sfTextareaBio");

      if (nameInput) nameInput.value = this.state.displayName;
      if (bioTextarea) bioTextarea.value = this.state.bio;
    }

    hideAlerts() {
      const err = this.container.querySelector("#sfEditorAlertError");
      const succ = this.container.querySelector("#sfEditorAlertSuccess");
      if (err) err.style.display = "none";
      if (succ) succ.style.display = "none";
    }

    showError(msg) {
      const err = this.container.querySelector("#sfEditorAlertError");
      const succ = this.container.querySelector("#sfEditorAlertSuccess");
      if (succ) succ.style.display = "none";
      if (err) {
        err.textContent = msg;
        err.style.display = "block";
      }
    }

    showSuccess(msg) {
      const err = this.container.querySelector("#sfEditorAlertError");
      const succ = this.container.querySelector("#sfEditorAlertSuccess");
      if (err) err.style.display = "none";
      if (succ) {
        succ.textContent = msg;
        succ.style.display = "block";
        setTimeout(() => {
          if (succ) succ.style.display = "none";
        }, 4000);
      }
    }

    /**
     * Sauvegarde vers l'API backend et lie l'état du profil
     */
    async saveProfile() {
      if (!this.validateDisplayName()) {
        this.showError("Veuillez corriger votre nom d'affichage avant d'enregistrer.");
        return;
      }

      const saveBtn = this.container.querySelector("#sfBtnSaveProfile");
      const spinner = this.container.querySelector("#sfSaveSpinner");
      const btnText = this.container.querySelector("#sfSaveBtnText");

      this.state.isSubmitting = true;
      if (saveBtn) saveBtn.disabled = true;
      if (spinner) spinner.style.display = "inline-block";
      if (btnText) btnText.textContent = "Sauvegarde en cours…";
      this.hideAlerts();

      const payload = {
        username: this.state.displayName.trim(),
        bio: this.state.bio.trim()
      };

      try {
        if (!window.SyrixAuth || !window.SyrixAuth.api) {
          throw new Error("Module d'authentification SYRIX non disponible.");
        }

        const res = await window.SyrixAuth.api("/profile", {
          method: "PATCH",
          body: JSON.stringify(payload)
        });

        if (!res.success) {
          const errorMsg = res.error?.message || "Erreur lors de la mise à jour du profil.";
          this.showError(errorMsg);
          return;
        }

        const updatedUser = res.data;

        // 1. Mise à jour de l'état interne
        this.state.originalDisplayName = updatedUser.username || payload.username;
        this.state.originalBio = updatedUser.bio !== undefined ? updatedUser.bio : payload.bio;
        this.state.displayName = this.state.originalDisplayName;
        this.state.bio = this.state.originalBio;
        this.state.hasUnsavedChanges = false;
        this.checkUnsavedChanges();

        // 2. Synchronisation de la session locale
        const currentToken = window.SyrixAuth.getToken();
        window.SyrixAuth.setSession(currentToken, updatedUser);

        // 3. Liaison avec le drawer latéral
        if (window.SyrixDrawer && typeof window.SyrixDrawer.updateUserDisplay === "function") {
          window.SyrixDrawer.updateUserDisplay(updatedUser);
        }

        // 4. Émission d'un événement global pour synchroniser l'ensemble de l'application
        document.dispatchEvent(new CustomEvent("sf:profile-updated", { detail: updatedUser }));

        // 5. Callback personnalisé
        if (typeof this.options.onUpdate === "function") {
          this.options.onUpdate(updatedUser);
        }

        this.showSuccess("Profil et biographie enregistrés avec succès !");
      } catch (err) {
        console.error("[ProfileEditor] Erreur sauvegarde :", err);
        this.showError(err.message || "Erreur réseau lors de la mise à jour.");
      } finally {
        this.state.isSubmitting = false;
        if (saveBtn) saveBtn.disabled = false;
        if (spinner) spinner.style.display = "none";
        if (btnText) btnText.textContent = "Enregistrer les modifications";
      }
    }

    escapeHtml(str) {
      if (!str) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
  }

  // Factory fonction pour instanciation rapide
  function createProfileEditor(container, options) {
    return new ProfileEditorComponent(container, options);
  }

  window.SyrixProfileEditor = {
    Component: ProfileEditorComponent,
    create: createProfileEditor
  };
  window.ProfileEditorComponent = ProfileEditorComponent;
})();
