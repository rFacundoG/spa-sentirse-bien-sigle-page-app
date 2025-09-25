// src/js/modules/auth.js
class AuthManager {
  constructor() {
    if (AuthManager.instance) {
      return AuthManager.instance;
    }
    AuthManager.instance = this;

    this.currentUser = null;
    this.auth = firebase.auth();
    this.db = firebase.firestore(); // Añadir referencia a Firestore
    this.isInitialized = false;
    this.authStateChecked = false; // Nueva bandera
    this.init();
    this.initFloatingLabels();
  }

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Mostrar skeleton inmediatamente al iniciar
    this.showAuthSkeleton();

    // Escuchar cambios en el estado de autenticación
    this.auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Usuario ha iniciado sesión
        this.currentUser = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email.split("@")[0],
          avatar:
            user.photoURL ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              user.email.split("@")[0]
            )}&background=random`,
        };
        localStorage.setItem("spaUser", JSON.stringify(this.currentUser));

        // Ocultar skeleton y mostrar usuario
        await this.showUserDropdown();
      } else {
        // Usuario ha cerrado sesión
        this.currentUser = null;
        localStorage.removeItem("spaUser");

        // Ocultar skeleton y mostrar botones
        this.showAuthButtons();
      }

      this.authStateChecked = true;
    });

    this.setupAuthListeners();
  }

  // Mostrar skeleton loader
  showAuthSkeleton() {
    const skeleton = document.getElementById("authSkeleton");
    const buttons = document.getElementById("authButtons");
    const user = document.getElementById("authUser");

    if (skeleton) skeleton.style.display = "flex";
    if (buttons) buttons.style.display = "none";
    if (user) user.style.display = "none";
  }

  // Mostrar botones de login/register
  showAuthButtons() {
    const skeleton = document.getElementById("authSkeleton");
    const buttons = document.getElementById("authButtons");
    const user = document.getElementById("authUser");

    // Transición suave: ocultar skeleton, mostrar botones
    if (skeleton) skeleton.style.display = "none";
    if (user) user.style.display = "none";
    if (buttons) {
      setTimeout(() => {
        buttons.style.display = "flex";
      }, 50);
    }
  }

  // Mostrar dropdown del usuario
  async showUserDropdown() {
    const skeleton = document.getElementById("authSkeleton");
    const buttons = document.getElementById("authButtons");
    const userContainer = document.getElementById("authUser");

    if (!userContainer) return;

    // Verificar si es admin
    let isAdmin = false;
    try {
      const userDoc = await firebase
        .firestore()
        .collection("users")
        .doc(this.currentUser.uid)
        .get();
      isAdmin = userDoc.exists && userDoc.data().rol === "admin";
    } catch (error) {
      console.error("Error checking admin rol:", error);
    }

    // Crear el HTML del dropdown del usuario
    userContainer.innerHTML = `
      <div class="nav-item dropdown">
        <a class="nav-link dropdown-toggle d-flex align-items-center p-0" href="#" role="button" 
           data-bs-toggle="dropdown" aria-expanded="false" style="margin-left: 15px;">
            <img src="${
              this.currentUser.avatar
            }" class="user-avatar" alt="Avatar">
        </a>
        <ul class="dropdown-menu dropdown-menu-end">
            <li class="dropdown-item-text">
                <div class="d-flex align-items-center">
                    <img src="${
                      this.currentUser.avatar
                    }" class="user-avatar me-2">
                    <div>
                        <strong>${this.currentUser.name}</strong>
                        <div class="small text-muted">${
                          this.currentUser.email
                        }</div>
                    </div>
                </div>
            </li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item" href="#" data-spa-link="perfil"><i class="bi bi-person me-2"></i>Mi perfil</a></li>
            ${
              isAdmin
                ? `<li><a class="dropdown-item" href="#" data-spa-link="admin"><i class="bi bi-gear me-2"></i>Administración</a></li>`
                : ""
            }
            <li><a class="dropdown-item" href="#" data-spa-link="reservas"><i class="bi bi-calendar me-2"></i>Mis reservas</a></li>
            <li><hr class="dropdown-divider"></li>
            <li>
                <a class="dropdown-item text-danger" href="#" id="logout-btn">
                    <i class="bi bi-box-arrow-right me-2"></i>Cerrar sesión
                </a>
            </li>
        </ul>
      </div>
    `;

    // Transición suave: ocultar skeleton, mostrar usuario
    if (skeleton) skeleton.style.display = "none";
    if (buttons) buttons.style.display = "none";

    setTimeout(() => {
      userContainer.style.display = "block";
    }, 50);
  }

  setupAuthListeners() {
    // Remover event listeners existentes para evitar duplicados
    document.removeEventListener("submit", this.boundHandleSubmit);
    document.removeEventListener("click", this.boundHandleClick);

    // Crear versiones bindeadas de los manejadores
    this.boundHandleSubmit = this.handleSubmit.bind(this);
    this.boundHandleClick = this.handleClick.bind(this);

    // Agregar event listeners
    document.addEventListener("submit", this.boundHandleSubmit);
    document.addEventListener("click", this.boundHandleClick);
  }

  handleSubmit(e) {
    if (e.target.matches("#formLogin")) {
      e.preventDefault();
      this.handleLogin(e.target);
      return;
    }

    if (e.target.matches("#formRegister")) {
      e.preventDefault();
      this.handleRegister(e.target);
      return;
    }
  }

  handleClick(e) {
    // Toggle password visibility
    if (
      e.target.matches(".toggle-password") ||
      e.target.closest(".toggle-password")
    ) {
      this.togglePasswordVisibility(e);
      return;
    }

    // Logout
    if (e.target.id === "logout-btn" || e.target.closest("#logout-btn")) {
      e.preventDefault();
      this.handleLogout();
      return;
    }
  }

  // Función para inicializar floating labels
  initFloatingLabels() {
    // Inicializar labels basado en valores existentes
    document.querySelectorAll(".custom-input").forEach((input) => {
      this.updateFloatingLabel(input);
    });

    // Event listeners para inputs
    document.addEventListener("input", (e) => {
      if (e.target.classList.contains("custom-input")) {
        this.updateFloatingLabel(e.target);
      }
    });

    document.addEventListener(
      "blur",
      (e) => {
        if (e.target.classList.contains("custom-input")) {
          this.updateFloatingLabel(e.target);
        }
      },
      true
    );
  }

  // Función para actualizar el estado del label
  updateFloatingLabel(input) {
    if (input.value) {
      input.classList.add("has-value");
    } else {
      input.classList.remove("has-value");
    }
  }

  async handleLogin(form) {
    const email = form.querySelector("#loginEmail").value;
    const password = form.querySelector("#loginPassword").value;

    // Validación básica
    if (!email || !password) {
      this.showToast("Por favor, completa todos los campos.", "warning");
      return;
    }

    // Mostrar loader
    const loginButton = form.querySelector("#loginButton");
    const loader = form.querySelector("#loginLoader");

    loginButton.disabled = true;
    loginButton.classList.add("btn-loading");
    if (loader) loader.style.display = "block";

    try {
      // Iniciar sesión con Firebase Auth
      await this.auth.signInWithEmailAndPassword(email, password);

      // Cerrar el modal
      const loginModal = bootstrap.Modal.getInstance(
        document.getElementById("loginModal")
      );
      if (loginModal) loginModal.hide();

      // Resetear formulario
      form.reset();
    } catch (error) {
      let errorMessage = "Error al iniciar sesión. ";
      switch (error.code) {
        case "auth/user-not-found":
          errorMessage += "No existe una cuenta con este email.";
          break;
        case "auth/wrong-password":
          errorMessage += "Contraseña incorrecta.";
          break;
        case "auth/invalid-email":
          errorMessage += "Email inválido.";
          break;
        default:
          errorMessage += error.message;
      }
      this.showToast(errorMessage, "danger");
    } finally {
      // Ocultar loader y habilitar botón
      loginButton.disabled = false;
      loginButton.classList.remove("btn-loading");
      if (loader) loader.style.display = "none";
    }
  }

  async handleRegister(form) {
    const name = form.querySelector("#registerName").value;
    const email = form.querySelector("#registerEmail").value;
    const password = form.querySelector("#registerPassword").value;

    // Validación básica
    if (!name || !email || !password) {
      this.showToast("Por favor, completa todos los campos.", "warning");
      return;
    }

    if (password.length < 6) {
      this.showToast(
        "La contraseña debe tener al menos 6 caracteres.",
        "warning"
      );
      return;
    }

    try {
      // Crear usuario con Firebase Auth
      const userCredential = await this.auth.createUserWithEmailAndPassword(
        email,
        password
      );

      // Actualizar perfil del usuario con el nombre
      await userCredential.user.updateProfile({
        displayName: name,
      });

      // Crear documento de usuario en Firestore
      const user = userCredential.user;
      await this.db.collection("users").doc(user.uid).set({
        nombre: "",
        email: user.email,
        fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
        apellido: "",
        dni: "",
        telefono: "",
        rol: "usuario",
      });

      // Cerrar el modal
      const registerModal = bootstrap.Modal.getInstance(
        document.getElementById("registerModal")
      );
      if (registerModal) registerModal.hide();

      // Resetear formulario
      form.reset();
    } catch (error) {
      let errorMessage = "Error al crear la cuenta. ";
      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage += "Este email ya está en uso.";
          break;
        case "auth/weak-password":
          errorMessage += "La contraseña es demasiado débil.";
          break;
        case "auth/invalid-email":
          errorMessage += "Email inválido.";
          break;
        default:
          errorMessage += error.message;
      }
      this.showToast(errorMessage, "danger");
    }
  }

  async handleLogout() {
    try {
      // Mostrar skeleton durante el logout
      this.showAuthSkeleton();
      await this.auth.signOut();
      // showAuthButtons() se llamará automáticamente por onAuthStateChanged
    } catch (error) {
      this.showToast("Error al cerrar sesión: " + error.message, "danger");
      // Si hay error, volver a mostrar el estado actual
      if (this.currentUser) {
        await this.showUserDropdown();
      } else {
        this.showAuthButtons();
      }
    }
  }

  togglePasswordVisibility(e) {
    const button = e.target.matches(".toggle-password")
      ? e.target
      : e.target.closest(".toggle-password");

    if (!button) return;

    const input = button.closest(".form-group").querySelector("input");
    const icon = button.querySelector("i");

    if (input.type === "password") {
      input.type = "text";
      icon.classList.remove("bi-eye-slash");
      icon.classList.add("bi-eye");
    } else {
      input.type = "password";
      icon.classList.remove("bi-eye");
      icon.classList.add("bi-eye-slash");
    }
  }

  showToast(message, type = "info") {
    // Crear toast container si no existe
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "toast-container";
      toastContainer.className =
        "toast-container position-fixed top-0 end-0 p-3";
      toastContainer.style.zIndex = "1060";
      document.body.appendChild(toastContainer);
    }

    // Crear toast
    const toastId = "toast-" + Date.now();
    const toast = document.createElement("div");
    toast.id = toastId;
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute("rol", "alert");
    toast.setAttribute("aria-live", "assertive");
    toast.setAttribute("aria-atomic", "true");
    toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

    toastContainer.appendChild(toast);

    // Mostrar toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    // Eliminar toast después de ocultarse
    toast.addEventListener("hidden.bs.toast", () => {
      toast.remove();
    });
  }
}

// Inicializar AuthManager cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  // Esperar a que Firebase se inicialice
  const checkFirebase = setInterval(() => {
    if (typeof firebase !== "undefined" && firebase.apps.length > 0) {
      clearInterval(checkFirebase);
      window.authManager = new AuthManager();
    }
  }, 100);
});
