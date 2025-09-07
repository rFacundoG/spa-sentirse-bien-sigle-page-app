// src/js/modules/auth.js
class AuthManager {
  constructor() {
    this.currentUser = null;
    this.init();
  }

  init() {
    // Verificar si hay un usuario en localStorage al inicializar
    const savedUser = localStorage.getItem("spaUser");
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser);
      this.updateAuthUI();
    }

    // Configurar event listeners para los formularios
    this.setupAuthListeners();
  }

  setupAuthListeners() {
    // Usar event delegation para los formularios que se cargan dinámicamente
    document.addEventListener("submit", (e) => {
      if (e.target.matches("#formLogin")) {
        e.preventDefault();
        this.handleLogin(e.target);
      }

      if (e.target.matches("#formRegister")) {
        e.preventDefault();
        this.handleRegister(e.target);
      }
    });

    // Event listeners para los botones de toggle password
    document.addEventListener("click", (e) => {
      if (
        e.target.matches(".toggle-password") ||
        e.target.closest(".toggle-password")
      ) {
        this.togglePasswordVisibility(e);
      }
    });

    // Event listener para el logout
    document.addEventListener("click", (e) => {
      if (e.target.id === "logout-btn" || e.target.closest("#logout-btn")) {
        this.handleLogout();
      }
    });
  }

  async handleLogin(form) {
    const email = form.querySelector("#loginEmail").value;
    const password = form.querySelector("#loginPassword").value;

    // Mostrar loader
    const loader = form.querySelector("#loader");
    const loginButton = form.querySelector("#loginButton");
    if (loader) loader.style.display = "block";
    if (loginButton) loginButton.disabled = true;

    try {
      // Simular una llamada a API (en una app real, aquí usarías Firebase Auth)
      await this.mockLoginApiCall(email, password);

      // Guardar usuario en localStorage
      this.currentUser = {
        email: email,
        name: email.split("@")[0],
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          email.split("@")[0]
        )}&background=random`,
      };
      localStorage.setItem("spaUser", JSON.stringify(this.currentUser));

      // Actualizar UI
      this.updateAuthUI();

      // Cerrar el modal
      const loginModal = bootstrap.Modal.getInstance(
        document.getElementById("loginModal")
      );
      if (loginModal) loginModal.hide();

      // Mostrar mensaje de éxito
      this.showToast(
        "¡Bienvenido! Has iniciado sesión correctamente.",
        "success"
      );
    } catch (error) {
      this.showToast(error.message, "danger");
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

    try {
      // Simular registro (en una app real, aquí usarías Firebase Auth)
      await this.mockRegisterApiCall(name, email, password);

      // Guardar usuario en localStorage
      this.currentUser = {
        email: email,
        name: name,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          name
        )}&background=random`,
      };
      localStorage.setItem("spaUser", JSON.stringify(this.currentUser));

      // Actualizar UI
      this.updateAuthUI();

      // Cerrar el modal
      const registerModal = bootstrap.Modal.getInstance(
        document.getElementById("registerModal")
      );
      if (registerModal) registerModal.hide();

      // Mostrar mensaje de éxito
      this.showToast("¡Cuenta creada correctamente! Bienvenido/a.", "success");
    } catch (error) {
      this.showToast(error.message, "danger");
    }
  }

  handleLogout() {
    this.currentUser = null;
    localStorage.removeItem("spaUser");
    this.updateAuthUI();
    this.showToast("Has cerrado sesión correctamente.", "info");
  }

  mockLoginApiCall(email, password) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (email && password) {
          if (password.length < 6) {
            reject(
              new Error("La contraseña debe tener al menos 6 caracteres.")
            );
          } else {
            resolve({ success: true });
          }
        } else {
          reject(new Error("Por favor, completa todos los campos."));
        }
      }, 1500);
    });
  }

  mockRegisterApiCall(name, email, password) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (name && email && password) {
          if (password.length < 6) {
            reject(
              new Error("La contraseña debe tener al menos 6 caracteres.")
            );
          } else {
            resolve({ success: true });
          }
        } else {
          reject(new Error("Por favor, completa todos los campos."));
        }
      }, 1500);
    });
  }

  togglePasswordVisibility(e) {
    const button = e.target.closest(".toggle-password");
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
      // Usuario autenticado
      if (!userItem) {
        userItem = document.createElement("li");
        userItem.className = "nav-item dropdown nav-user-item";
        userItem.innerHTML = `
                    <a class="nav-link dropdown-toggle d-flex align-items-center" href="#" role="button" 
                       data-bs-toggle="dropdown" aria-expanded="false">
                        <img src="${this.currentUser.avatar}" class="user-avatar me-2" alt="Avatar">
                        <span>${this.currentUser.name}</span>
                    </a>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><a class="dropdown-item" href="#">Mi perfil</a></li>
                        <li><a class="dropdown-item" href="#">Mis reservas</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#" id="logout-btn">Cerrar sesión</a></li>
                    </ul>
                `;

        // Insertar antes de los botones de auth
        const authItems = navbar.querySelectorAll(".nav-auth-item");
        if (authItems.length > 0) {
          navbar.insertBefore(userItem, authItems[0]);
        } else {
          navbar.appendChild(userItem);
        }
      } else {
        // Actualizar información del usuario
        const avatar = userItem.querySelector(".user-avatar");
        const nameSpan = userItem.querySelector("span");
        const dropdownToggle = userItem.querySelector(".dropdown-toggle");

        if (avatar) avatar.src = this.currentUser.avatar;
        if (nameSpan) nameSpan.textContent = this.currentUser.name;
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
  window.authManager = new AuthManager();
});
