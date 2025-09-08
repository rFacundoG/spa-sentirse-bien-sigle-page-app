// src/js/modules/auth.js
class AuthManager {
  constructor() {
    if (AuthManager.instance) {
      return AuthManager.instance;
    }
    AuthManager.instance = this;

    this.currentUser = null;
    this.auth = firebase.auth();
    this.isInitialized = false;
    this.init();
  }

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Escuchar cambios en el estado de autenticación
    this.auth.onAuthStateChanged((user) => {
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
      } else {
        // Usuario ha cerrado sesión
        this.currentUser = null;
        localStorage.removeItem("spaUser");
      }
      this.updateAuthUI();
    });

    // Configurar event listeners una sola vez
    this.setupAuthListeners();
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

  async handleLogin(form) {
    const email = form.querySelector("#loginEmail").value;
    const password = form.querySelector("#loginPassword").value;

    // Validación básica
    if (!email || !password) {
      this.showToast("Por favor, completa todos los campos.", "warning");
      return;
    }

    // Mostrar loader
    const loader = form.querySelector("#loader");
    const loginButton = form.querySelector("#loginButton");
    if (loader) loader.style.display = "block";
    if (loginButton) loginButton.disabled = true;

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
      if (loader) loader.style.display = "none";
      if (loginButton) loginButton.disabled = false;
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
      await this.auth.signOut();
    } catch (error) {
      this.showToast("Error al cerrar sesión: " + error.message, "danger");
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

  updateAuthUI() {
    const navbar = document.querySelector(".navbar-nav");
    if (!navbar) return;

    // Encontrar o crear el elemento de usuario
    let userItem = navbar.querySelector(".nav-user-item");

    if (this.currentUser) {
      // Usuario autenticado - Mostrar solo icono y menú desplegable
      if (!userItem) {
        userItem = document.createElement("li");
        userItem.className = "nav-item dropdown nav-user-item";
        userItem.innerHTML = `
                    <a class="nav-link dropdown-toggle d-flex align-items-center p-0" href="#" role="button" 
                       data-bs-toggle="dropdown" aria-expanded="false" style="margin-left: 15px;">
                        <img src="${this.currentUser.avatar}" class="user-avatar" alt="Avatar" 
                             style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">
                    </a>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li class="dropdown-item-text">
                            <div class="d-flex align-items-center">
                                <img src="${this.currentUser.avatar}" class="user-avatar me-2" 
                                     style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                                <div>
                                    <strong>${this.currentUser.name}</strong>
                                    <div class="small text-muted">${this.currentUser.email}</div>
                                </div>
                            </div>
                        </li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#"><i class="bi bi-person me-2"></i>Mi perfil</a></li>
                        <li><a class="dropdown-item" href="#"><i class="bi bi-calendar me-2"></i>Mis reservas</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li>
                            <a class="dropdown-item text-danger" href="#" id="logout-btn">
                                <i class="bi bi-box-arrow-right me-2"></i>Cerrar sesión
                            </a>
                        </li>
                    </ul>
                `;

        // Insertar en el navbar
        const authItems = navbar.querySelectorAll(".nav-auth-item");
        if (authItems.length > 0) {
          navbar.insertBefore(userItem, authItems[0].nextSibling);
        } else {
          // Buscar donde insertar (después del último elemento del navbar)
          const lastNavItem = navbar.querySelector(".nav-item:last-child");
          if (lastNavItem) {
            navbar.insertBefore(userItem, lastNavItem.nextSibling);
          } else {
            navbar.appendChild(userItem);
          }
        }
      } else {
        // Actualizar información del usuario si ya existe
        const avatar = userItem.querySelector(".user-avatar");
        const nameElement = userItem.querySelector("strong");
        const emailElement = userItem.querySelector(".text-muted");

        if (avatar) avatar.src = this.currentUser.avatar;
        if (nameElement) nameElement.textContent = this.currentUser.name;
        if (emailElement) emailElement.textContent = this.currentUser.email;
      }

      // Ocultar botones de login/register
      document.querySelectorAll(".nav-auth-item").forEach((item) => {
        item.style.display = "none";
      });
    } else {
      // Usuario no autenticado
      if (userItem) {
        userItem.remove();
      }

      // Mostrar botones de login/register
      document.querySelectorAll(".nav-auth-item").forEach((item) => {
        item.style.display = "list-item";
      });
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
    toast.setAttribute("role", "alert");
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
