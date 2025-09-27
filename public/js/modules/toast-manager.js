class ToastManager {
  constructor() {
    if (ToastManager.instance) {
      return ToastManager.instance;
    }
    ToastManager.instance = this;

    this.defaultConfig = {
      position: "top-right", // 'top-right', 'top-left', 'bottom-right', 'bottom-left'
      duration: 5000,
      animation: true,
      closeButton: true,
      progressBar: true,
    };

    this.toastContainer = null;
    this.init();
  }

  init() {
    this.createToastContainer();
  }

  createToastContainer() {
    // Crear contenedor si no existe
    this.toastContainer = document.getElementById("toast-container");

    if (!this.toastContainer) {
      this.toastContainer = document.createElement("div");
      this.toastContainer.id = "toast-container";
      this.toastContainer.className = "toast-container position-fixed p-3";
      this.setContainerPosition(this.defaultConfig.position);
      document.body.appendChild(this.toastContainer);
    }
  }

  setContainerPosition(position) {
    if (!this.toastContainer) return;

    const positions = {
      "top-right": "top-0 end-0",
      "top-left": "top-0 start-0",
      "bottom-right": "bottom-0 end-0",
      "bottom-left": "bottom-0 start-0",
    };

    // Remover clases de posición anteriores
    this.toastContainer.classList.remove(
      "top-0",
      "end-0",
      "start-0",
      "bottom-0"
    );

    // Agregar nuevas clases de posición
    const positionClasses = positions[position] || positions["top-right"];
    positionClasses.split(" ").forEach((className) => {
      this.toastContainer.classList.add(className);
    });
  }

  show(message, type = "info", customConfig = {}) {
    const config = { ...this.defaultConfig, ...customConfig };

    // Actualizar posición si es diferente
    if (
      customConfig.position &&
      customConfig.position !== this.defaultConfig.position
    ) {
      this.setContainerPosition(customConfig.position);
    }

    // Crear toast ID único
    const toastId =
      "toast-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);

    // Determinar icono según el tipo
    const icon = this.getIconForType(type);

    // Crear elemento toast
    const toast = document.createElement("div");
    toast.id = toastId;
    toast.className = `toast shadow-lg ${config.animation ? "fade" : ""}`;
    toast.setAttribute("role", "alert");
    toast.setAttribute("aria-live", "assertive");
    toast.setAttribute("aria-atomic", "true");

    // Estilos personalizados por tipo
    const toastStyles = {
      success: "bg-success text-white",
      danger: "bg-danger text-white",
      warning: "bg-warning text-white",
      info: "bg-info text-white",
      primary: "bg-primary text-white",
      secondary: "bg-secondary text-white",
      dark: "bg-dark text-white",
      light: "bg-light text-dark",
    };

    toast.classList.add(
      ...(toastStyles[type]?.split(" ") || toastStyles.info.split(" "))
    );

    // Estructura del toast con icono y progreso
    toast.innerHTML = `
      <div class="toast-header ${
        type === "light" ? "bg-light text-dark" : "text-dark"
      } border-0">
        ${icon ? `<i class="${icon} me-2"></i>` : ""}
        <strong class="me-auto">${this.getTitleForType(type)}</strong>
        ${
          config.closeButton
            ? '<button type="button" class="btn-close btn-close-dark" data-bs-dismiss="toast" aria-label="Close"></button>'
            : ""
        }
      </div>
      <div class="toast-body d-flex align-items-center">
        <span class="flex-grow-1">${message}</span>
      </div>
      ${
        config.progressBar
          ? `<div class="toast-progress bg-${type}"></div>`
          : ""
      }
    `;

    // Estilos para la barra de progreso
    if (config.progressBar) {
      const style = document.createElement("style");
      style.textContent = `
        .toast-progress {
          height: 3px;
          width: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
          animation: progress ${config.duration}ms linear forwards;
        }
        
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `;
      document.head.appendChild(style);
    }

    this.toastContainer.appendChild(toast);

    // Inicializar toast de Bootstrap
    const bsToast = new bootstrap.Toast(toast, {
      autohide: config.duration > 0,
      delay: config.duration,
    });

    bsToast.show();

    // Eliminar toast del DOM después de ocultarse
    toast.addEventListener("hidden.bs.toast", () => {
      toast.remove();
    });

    return toastId;
  }

  getIconForType(type) {
    const icons = {
      success: "bi bi-check-circle-fill",
      danger: "bi bi-exclamation-triangle-fill",
      warning: "bi bi-exclamation-circle-fill",
      info: "bi bi-info-circle-fill",
      primary: "bi bi-bell-fill",
      secondary: "bi bi-chat-fill",
      dark: "bi bi-moon-fill",
      light: "bi bi-sun-fill",
    };
    return icons[type] || "bi bi-info-circle-fill";
  }

  getTitleForType(type) {
    const titles = {
      success: "Éxito",
      danger: "Error",
      warning: "Advertencia",
      info: "Información",
      primary: "Notificación",
      secondary: "Mensaje",
      dark: "Sistema",
      light: "Aviso",
    };
    return titles[type] || "Mensaje";
  }

  // Métodos rápidos para tipos comunes
  success(message, config = {}) {
    return this.show(message, "success", config);
  }

  error(message, config = {}) {
    return this.show(message, "danger", config);
  }

  warning(message, config = {}) {
    return this.show(message, "warning", config);
  }

  info(message, config = {}) {
    return this.show(message, "info", config);
  }

  // Método para cerrar toasts específicos
  hide(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
      const bsToast = bootstrap.Toast.getInstance(toast);
      if (bsToast) {
        bsToast.hide();
      }
    }
  }

  // Método para cerrar todos los toasts
  hideAll() {
    const toasts = this.toastContainer.querySelectorAll(".toast");
    toasts.forEach((toast) => {
      const bsToast = bootstrap.Toast.getInstance(toast);
      if (bsToast) {
        bsToast.hide();
      }
    });
  }

  // Método para configurar opciones globales
  setGlobalConfig(newConfig) {
    this.defaultConfig = { ...this.defaultConfig, ...newConfig };
    this.setContainerPosition(this.defaultConfig.position);
  }
}

// Inicializar automáticamente cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  window.toastManager = new ToastManager();
});
