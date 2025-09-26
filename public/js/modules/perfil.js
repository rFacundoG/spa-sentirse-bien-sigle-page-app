class PerfilModule {
  constructor() {
    this.currentUser = null;
    this.db = firebase.firestore();
    this.auth = firebase.auth();
    this.authUnsubscribe = null; // Para manejar el listener de auth
    this.userRole = "usuario"; // Valor por defecto
  }

  async init() {
    // Esperar a que authManager esté listo y verificar autenticación
    await this.waitForAuthReady();

    if (!this.currentUser) {
      console.log("Usuario no autenticado, redirigiendo a home");
      window.spaApp.navigateTo("home");
      return;
    }

    this.setupEventListeners();
    await this.loadUserData();
    this.updateProfileUI();

    // Escuchar cambios de autenticación
    this.setupAuthListener();
  }

  // Esperar a que authManager esté listo
  waitForAuthReady() {
    return new Promise((resolve) => {
      const checkAuth = () => {
        if (window.authManager && window.authManager.authStateChecked) {
          // Obtener el usuario real de Firebase Auth
          const firebaseUser = this.auth.currentUser;
          if (firebaseUser) {
            this.currentUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
            };
          } else {
            this.currentUser = window.authManager.currentUser;
          }
          resolve();
        } else {
          setTimeout(checkAuth, 100);
        }
      };
      checkAuth();
    });
  }

  // Escuchar cambios de autenticación
  setupAuthListener() {
    this.authUnsubscribe = this.auth.onAuthStateChanged((user) => {
      if (!user) {
        // Usuario cerró sesión, redirigir a home
        console.log("Sesión cerrada, redirigiendo a home");
        if (this.authUnsubscribe) {
          this.authUnsubscribe(); // Limpiar listener
        }
        window.spaApp.navigateTo("home");
      }
    });
  }

  setupEventListeners() {
    // Navegación entre pestañas
    document.querySelectorAll("[data-profile-tab]").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        e.preventDefault();
        this.switchTab(e.target.getAttribute("data-profile-tab"));
      });
    });

    // Formulario de datos personales
    const profileForm = document.getElementById("profile-form");
    if (profileForm) {
      profileForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.saveProfileData();
      });
    }

    // Formulario de cambio de contraseña
    const passwordForm = document.getElementById("change-password-form");
    if (passwordForm) {
      passwordForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.changePassword();
      });
    }

    // Modal de eliminar cuenta
    const confirmDelete = document.getElementById("confirmDelete");
    if (confirmDelete) {
      confirmDelete.addEventListener("change", (e) => {
        const deleteBtn = document.getElementById("confirmDeleteAccount");
        if (deleteBtn) {
          deleteBtn.disabled = !e.target.checked;
        }
      });
    }

    const confirmDeleteAccount = document.getElementById(
      "confirmDeleteAccount"
    );
    if (confirmDeleteAccount) {
      confirmDeleteAccount.addEventListener("click", () => {
        this.deleteAccount();
      });
    }

    // Limpiar listener cuando se salga de la página
    window.addEventListener("beforeunload", () => {
      this.cleanup();
    });
  }

  async loadUserData() {
    try {
      // Obtener datos adicionales de Firestore
      const userDoc = await this.db
        .collection("users")
        .doc(this.currentUser.uid)
        .get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        // Llenar formulario con datos existentes
        this.setFormValue("nombre", userData.nombre);
        this.setFormValue("apellido", userData.apellido);
        this.setFormValue("telefono", userData.telefono);
        this.setFormValue("dni", userData.dni);

        // Guardar el rol para usarlo en la UI
        this.userRole = userData.rol || "usuario";
      }

      // Datos básicos de Authentication
      this.setFormValue("email", this.currentUser.email);
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
        this.currentUser.photoURL ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          this.currentUser.displayName || this.currentUser.email
        )}&background=random`;
    }

    if (profileName) {
      profileName.textContent =
        this.currentUser.displayName || this.currentUser.email.split("@")[0];
    }

    if (profileEmail) {
      profileEmail.textContent = this.currentUser.email;
    }

    // Actualizar badge del rol
    if (profileBadge) {
      profileBadge.textContent = this.getRoleDisplayName(this.userRole);
      profileBadge.className = this.getRoleBadgeClass(this.userRole);
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

  async saveProfileData() {
    // Activar loader
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
      if (displayName && displayName !== this.currentUser.displayName) {
        const firebaseUser = this.auth.currentUser;
        if (firebaseUser) {
          await firebaseUser.updateProfile({
            displayName: displayName,
          });

          // Actualizar el currentUser en authManager
          if (window.authManager) {
            window.authManager.currentUser = {
              ...window.authManager.currentUser,
              displayName: displayName,
              name: displayName,
            };
            window.authManager.updateAuthUI();
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

  async changePassword() {
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

  async deleteAccount() {
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
  cleanup() {
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
    }
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
