class PerfilModule {
  constructor() {
    this.currentUser = null;
    this.db = firebase.firestore();
    this.auth = firebase.auth();
  }

  async init() {
    this.currentUser = this.auth.currentUser;
    if (!this.currentUser) {
      window.location.hash = "home";
      return;
    }

    this.setupEventListeners();
    await this.loadUserData();
    this.updateProfileUI();
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
    document.getElementById("profile-form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveProfileData();
    });

    // Formulario de cambio de contraseña
    document
      .getElementById("change-password-form")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        this.changePassword();
      });

    // Modal de eliminar cuenta
    document.getElementById("confirmDelete").addEventListener("change", (e) => {
      document.getElementById("confirmDeleteAccount").disabled =
        !e.target.checked;
    });

    document
      .getElementById("confirmDeleteAccount")
      .addEventListener("click", () => {
        this.deleteAccount();
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
        document.getElementById("nombre").value = userData.nombre || "";
        document.getElementById("apellido").value = userData.apellido || "";
        document.getElementById("telefono").value = userData.telefono || "";
        document.getElementById("dni").value = userData.dni || "";
      }

      // Datos básicos de Authentication
      document.getElementById("email").value = this.currentUser.email;
    } catch (error) {
      console.error("Error loading user data:", error);
      this.showToast("Error al cargar los datos del perfil", "danger");
    }
  }

  updateProfileUI() {
    // Actualizar avatar y información en el sidebar
    document.getElementById("profile-avatar").src =
      this.currentUser.photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        this.currentUser.displayName || this.currentUser.email
      )}&background=random`;

    document.getElementById("profile-name").textContent =
      this.currentUser.displayName || this.currentUser.email.split("@")[0];

    document.getElementById("profile-email").textContent =
      this.currentUser.email;
  }

  switchTab(tabName) {
    // Ocultar todos los paneles
    document.getElementById("datos-personales-panel").classList.add("d-none");
    document.getElementById("seguridad-panel").classList.add("d-none");

    // Mostrar el panel seleccionado
    document.getElementById(`${tabName}-panel`).classList.remove("d-none");

    // Actualizar navegación activa
    document.querySelectorAll("[data-profile-tab]").forEach((tab) => {
      tab.classList.remove("active");
    });
    document
      .querySelector(`[data-profile-tab="${tabName}"]`)
      .classList.add("active");
  }

  async saveProfileData() {
    try {
      const userData = {
        nombre: document.getElementById("nombre").value,
        apellido: document.getElementById("apellido").value,
        telefono: document.getElementById("telefono").value,
        dni: document.getElementById("dni").value,
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
        await this.currentUser.updateProfile({
          displayName: displayName,
        });
      }

      this.showToast("Datos guardados correctamente", "success");
    } catch (error) {
      console.error("Error saving profile data:", error);
      this.showToast("Error al guardar los datos", "danger");
    }
  }

  async changePassword() {
    const currentPassword = document.getElementById("current-password").value;
    const newPassword = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

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

    try {
      // Reautenticar al usuario antes de cambiar la contraseña
      const credential = firebase.auth.EmailAuthProvider.credential(
        this.currentUser.email,
        currentPassword
      );

      await this.currentUser.reauthenticateWithCredential(credential);

      // Cambiar contraseña
      await this.currentUser.updatePassword(newPassword);

      // Limpiar formulario
      document.getElementById("change-password-form").reset();

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
    }
  }

  async deleteAccount() {
    const password = document.getElementById("deletePassword").value;

    if (!password) {
      this.showToast("Por favor ingresa tu contraseña", "warning");
      return;
    }

    try {
      // Reautenticar al usuario
      const credential = firebase.auth.EmailAuthProvider.credential(
        this.currentUser.email,
        password
      );

      await this.currentUser.reauthenticateWithCredential(credential);

      // Primero eliminar datos de Firestore
      await this.db.collection("users").doc(this.currentUser.uid).delete();

      // Luego eliminar la cuenta de Authentication
      await this.currentUser.delete();

      // Cerrar modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("deleteAccountModal")
      );
      modal.hide();

      this.showToast("Cuenta eliminada correctamente", "info");

      // Redirigir al home
      window.location.hash = "home";
    } catch (error) {
      console.error("Error deleting account:", error);

      let errorMessage = "Error al eliminar la cuenta";
      if (error.code === "auth/wrong-password") {
        errorMessage = "Contraseña incorrecta";
      }

      this.showToast(errorMessage, "danger");
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
