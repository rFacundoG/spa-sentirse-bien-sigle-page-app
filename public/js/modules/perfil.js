class PerfilModule {
  constructor() {
    this.db = firebase.firestore();
    this.auth = firebase.auth();
    this.currentUser = window.authManager?.currentUser; // Obtener usuario desde la fuente de verdad
    this.userDoc = null; // Para cachear los datos de Firestore

    // Cachear elementos del DOM para mejor rendimiento y legibilidad
    this.elements = {};

    // Bind de los manejadores de eventos para poder añadirlos y quitarlos correctamente
    this.boundHandleTabClick = this.handleTabClick.bind(this);
    this.boundSaveProfileData = this.saveProfileData.bind(this);
    this.boundChangePassword = this.changePassword.bind(this);
    this.boundHandleDeleteConfirm = this.handleDeleteConfirm.bind(this);
    this.boundDeleteAccount = this.deleteAccount.bind(this);
    this.boundHandleAuthChange = this.handleAuthChange.bind(this);
  }

  async init() {
    // El router (app.js) ya verifica la autenticación antes de instanciar el módulo.
    if (!this.currentUser) {
      console.log("Usuario no autenticado, redirigiendo a home");
      window.spaApp.navigateTo("home");
      return;
    }

    this.cacheDOMElements();
    this.setupEventListeners();
    await this.loadUserData();
  }

  // Centraliza la obtención de elementos del DOM
  cacheDOMElements() {
    this.elements.profileForm = document.getElementById("profile-form");
    this.elements.passwordForm = document.getElementById("change-password-form");
    this.elements.confirmDelete = document.getElementById("confirmDelete");
    this.elements.confirmDeleteAccountBtn = document.getElementById("confirmDeleteAccount");
    this.elements.tabs = document.querySelectorAll("[data-profile-tab]");
  }

  handleAuthChange(user) {
    if (!user) {
      // Usuario cerró sesión, redirigir a home
      console.log("Sesión cerrada, redirigiendo a home");
      window.spaApp.navigateTo("home");
    }
  }

  setupEventListeners() {
    // Navegación entre pestañas
    this.elements.tabs.forEach((tab) => tab.addEventListener("click", this.boundHandleTabClick));

    // Formulario de datos personales
    this.elements.profileForm?.addEventListener("submit", this.boundSaveProfileData);

    // Formulario de cambio de contraseña
    this.elements.passwordForm?.addEventListener("submit", this.boundChangePassword);

    // Modal de eliminar cuenta
    this.elements.confirmDelete?.addEventListener("change", this.boundHandleDeleteConfirm);
    this.elements.confirmDeleteAccountBtn?.addEventListener("click", this.boundDeleteAccount);

    // Escuchar cambios de autenticación para reaccionar si el usuario cierra sesión
    this.authUnsubscribe = this.auth.onAuthStateChanged(this.boundHandleAuthChange);
  }

  handleTabClick(e) {
    e.preventDefault();
    this.switchTab(e.target.getAttribute("data-profile-tab"));
  }

  handleDeleteConfirm(e) {
    if (this.elements.confirmDeleteAccountBtn) {
      this.elements.confirmDeleteAccountBtn.disabled = !e.target.checked;
    }
  }

  async loadUserData() {
    try {
      // Obtener datos adicionales de Firestore
      const userDoc = await this.db
        .collection("users")
        .doc(this.currentUser.uid)
        .get();

      this.userDoc = userDoc.data() || {};

      // Datos básicos de Authentication
      this.setFormValue("email", this.currentUser.email);

      // Llenar formulario con datos existentes de Firestore
      this.setFormValue("nombre", this.userDoc.nombre);
      this.setFormValue("apellido", this.userDoc.apellido);
      this.setFormValue("telefono", this.userDoc.telefono);
      this.setFormValue("dni", this.userDoc.dni);

      // Actualizar la UI del perfil
      this.updateProfileUI();
    } catch (error) {
      console.error("Error loading user data:", error);
      this.showToast("Error al cargar los datos del perfil", "danger");
    }
  }

  // Helper para establecer valores de formulario de forma segura
  setFormValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.value = value || "";
    }
  }

  updateProfileUI() {
    // Actualizar avatar y información en el sidebar
    const profileAvatar = document.getElementById("profile-avatar");
    const profileName = document.getElementById("profile-name");
    const profileEmail = document.getElementById("profile-email");
    const profileBadge = document.getElementById("profile-badge");

    if (profileAvatar) {
      profileAvatar.src =
        this.currentUser.avatar || // Usar el avatar de authManager que ya tiene fallback
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          this.currentUser.name || this.currentUser.email
        )}&background=random`;
    }

    if (profileName) {
      profileName.textContent =
        this.currentUser.name || this.currentUser.email.split("@")[0];
    }

    if (profileEmail) {
      profileEmail.textContent = this.currentUser.email;
    }

    const userRole = this.userDoc.rol || "usuario";
    // Actualizar badge del rol
    if (profileBadge) {
      profileBadge.textContent = this.getRoleDisplayName(userRole);
      profileBadge.className = this.getRoleBadgeClass(userRole);
    }
  }

  // Helper para mostrar nombre bonito del rol
  getRoleDisplayName(role) {
    const roleNames = {
      usuario: "Usuario",
      profesional: "Profesional",
      admin: "Administrador",
      ventas: "Responsable de Ventas",
    };
    return roleNames[role] || "Usuario";
  }

  // Helper para las clases CSS del badge según el rol
  getRoleBadgeClass(role) {
    const baseClass = "badge px-3 py-2 fw-bold";
    const roleClasses = {
      usuario: "bg-secondary",
      profesional: "bg-info",
      admin: "bg-danger",
      ventas: "bg-warning text-dark",
    };
    return `${baseClass} ${roleClasses[role] || "bg-secondary"}`;
  }

  switchTab(tabName) {
    // Ocultar todos los paneles
    const panels = ["datos-personales-panel", "seguridad-panel"];
    panels.forEach((panel) => {
      const element = document.getElementById(panel);
      if (element) {
        element.classList.add("d-none");
      }
    });

    // Mostrar el panel seleccionado
    const activePanel = document.getElementById(`${tabName}-panel`);
    if (activePanel) {
      activePanel.classList.remove("d-none");
    }

    // Actualizar navegación activa
    document.querySelectorAll("[data-profile-tab]").forEach((tab) => {
      tab.classList.remove("active");
    });

    const activeTab = document.querySelector(`[data-profile-tab="${tabName}"]`);
    if (activeTab) {
      activeTab.classList.add("active");
    }
  }

  async saveProfileData(e) {
    // Activar loader
    if (e) e.preventDefault();

    this.setButtonLoading("save-profile-btn", true);

    try {
      const userData = {
        nombre: document.getElementById("nombre")?.value || "",
        apellido: document.getElementById("apellido")?.value || "",
        telefono: document.getElementById("telefono")?.value || "",
        dni: document.getElementById("dni")?.value || "",
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
      };

      // Guardar en Firestore
      await this.db
        .collection("users")
        .doc(this.currentUser.uid)
        .set(userData, { merge: true });

      // Actualizar displayName en Authentication si cambió
      const displayName = `${userData.nombre} ${userData.apellido}`.trim();
      if (displayName && displayName !== this.currentUser.name) {
        const firebaseUser = this.auth.currentUser;
        if (firebaseUser) {
          await firebaseUser.updateProfile({
            displayName: displayName,
          });

          // Actualizar el currentUser en authManager y forzar actualización de la UI del nav
          if (window.authManager) {
            window.authManager.currentUser.name = displayName;
            window.authManager.currentUser.displayName = displayName; // Por consistencia si se usa en otro lado
            // Forzar actualización del dropdown del usuario
            await window.authManager.showUserDropdown();
          }
        }
      }

      this.showToast("Datos guardados correctamente", "success");
    } catch (error) {
      console.error("Error saving profile data:", error);
      this.showToast("Error al guardar los datos", "danger");
    } finally {
      // Desactivar loader siempre
      this.setButtonLoading("save-profile-btn", false);
    }
  }

  async changePassword(e) {
    if (e) e.preventDefault();

    const currentPassword = document.getElementById("current-password")?.value;
    const newPassword = document.getElementById("new-password")?.value;
    const confirmPassword = document.getElementById("confirm-password")?.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      this.showToast("Por favor, completa todos los campos", "warning");
      return;
    }

    if (newPassword !== confirmPassword) {
      this.showToast("Las contraseñas no coinciden", "warning");
      return;
    }

    if (newPassword.length < 6) {
      this.showToast(
        "La contraseña debe tener al menos 6 caracteres",
        "warning"
      );
      return;
    }

    // Activar loader
    this.setButtonLoading("change-password-btn", true);

    try {
      // Usar el usuario actual de Firebase Auth
      const firebaseUser = this.auth.currentUser;
      if (!firebaseUser) {
        this.showToast(
          "No se pudo obtener la información del usuario",
          "danger"
        );
        return;
      }

      // Reautenticar al usuario antes de cambiar la contraseña
      const credential = firebase.auth.EmailAuthProvider.credential(
        firebaseUser.email,
        currentPassword
      );

      await firebaseUser.reauthenticateWithCredential(credential);

      // Cambiar contraseña
      await firebaseUser.updatePassword(newPassword);

      // Limpiar formulario
      const form = document.getElementById("change-password-form");
      if (form) form.reset();

      this.showToast("Contraseña cambiada correctamente", "success");
    } catch (error) {
      console.error("Error changing password:", error);

      let errorMessage = "Error al cambiar la contraseña";
      if (error.code === "auth/wrong-password") {
        errorMessage = "La contraseña actual es incorrecta";
      } else if (error.code === "auth/requires-recent-login") {
        errorMessage =
          "Por favor, vuelve a iniciar sesión para cambiar tu contraseña";
      }

      this.showToast(errorMessage, "danger");
    } finally {
      // Desactivar loader siempre
      this.setButtonLoading("change-password-btn", false);
    }
  }

  async deleteAccount(e) {
    if (e) e.preventDefault();

    const password = document.getElementById("deletePassword")?.value;

    if (!password) {
      this.showToast("Por favor ingresa tu contraseña", "warning");
      return;
    }

    // Activar loader
    this.setButtonLoading("confirmDeleteAccount", true);

    try {
      // Usar el usuario actual de Firebase Auth
      const firebaseUser = this.auth.currentUser;
      if (!firebaseUser) {
        this.showToast(
          "No se pudo obtener la información del usuario",
          "danger"
        );
        return;
      }

      // Reautenticar al usuario
      const credential = firebase.auth.EmailAuthProvider.credential(
        firebaseUser.email,
        password
      );

      await firebaseUser.reauthenticateWithCredential(credential);

      // Primero eliminar datos de Firestore
      await this.db.collection("users").doc(firebaseUser.uid).delete();

      // Luego eliminar la cuenta de Authentication
      await firebaseUser.delete();

      // Cerrar modal
      const modalElement = document.getElementById("deleteAccountModal");
      if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();
      }

      this.showToast("Cuenta eliminada correctamente", "info");

      // La redirección se manejará automáticamente por el auth listener
    } catch (error) {
      console.error("Error deleting account:", error);

      let errorMessage = "Error al eliminar la cuenta";
      if (error.code === "auth/wrong-password") {
        errorMessage = "Contraseña incorrecta";
      }

      this.showToast(errorMessage, "danger");
    } finally {
      // Desactivar loader siempre
      this.setButtonLoading("confirmDeleteAccount", false);
    }
  }

  // Helper para manejar estados de loading en botones
  setButtonLoading(buttonId, isLoading) {
    const button = document.getElementById(buttonId);
    if (!button) return;

    const btnText = button.querySelector(".btn-text");
    const btnLoader = button.querySelector(".btn-loader");

    if (isLoading) {
      button.disabled = true;
      button.classList.add("btn-loading");
      if (btnText) btnText.style.opacity = "0";
      if (btnLoader) btnLoader.classList.remove("d-none");
    } else {
      button.disabled = false;
      button.classList.remove("btn-loading");
      if (btnText) btnText.style.opacity = "1";
      if (btnLoader) btnLoader.classList.add("d-none");
    }
  }

  // Limpiar recursos
  destroy() {
    console.log("Destruyendo PerfilModule y sus listeners");
    // Eliminar listener de autenticación
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
    }

    // Eliminar otros event listeners
    this.elements.tabs.forEach((tab) => tab.removeEventListener("click", this.boundHandleTabClick));
    this.elements.profileForm?.removeEventListener("submit", this.boundSaveProfileData);
    this.elements.passwordForm?.removeEventListener("submit", this.boundChangePassword);
    this.elements.confirmDelete?.removeEventListener("change", this.boundHandleDeleteConfirm);
    this.elements.confirmDeleteAccountBtn?.removeEventListener("click", this.boundDeleteAccount);

  }

  showToast(message, type = "info") {
    // Usar el mismo método de toast que en auth.js
    if (
      window.authManager &&
      typeof window.authManager.showToast === "function"
    ) {
      window.authManager.showToast(message, type);
    } else {
      // Implementación básica de toast como fallback
      alert(`${type.toUpperCase()}: ${message}`);
    }
  }
}
