class SpaApp {
  constructor() {
    if (SpaApp.instance) {
      return SpaApp.instance;
    }
    SpaApp.instance = this;

    this.pages = {
      home: "pages/home.html",
      servicios: "pages/servicios.html",
      contacto: "pages/contacto.html",
    };

    this.isInitialized = false;
    this.init();
  }

  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Cargar componentes
    await this.loadComponent("navbar", "components/nav.html");
    await this.loadComponent("footer", "components/footer.html");
    await this.loadComponent("auth-modals", "components/auth-modals.html");

    // Configurar navegación
    this.setupNavigation();

    // Cargar página inicial
    this.navigateTo("home");

    // Inicializar auth manager después de cargar los componentes
    this.initAuth();
  }

  async loadComponent(containerId, path) {
    try {
      const response = await fetch(path);
      const html = await response.text();
      document.getElementById(containerId).innerHTML = html;

      // Inicializar componentes específicos después de cargarlos
      if (containerId === "navbar") {
        this.initNavbar();
      }
    } catch (error) {
      console.error(`Error loading component ${path}:`, error);
    }
  }

  async navigateTo(page) {
    if (!this.pages[page]) {
      console.error(`Página ${page} no encontrada`);
      return;
    }

    try {
      // Actualizar URL
      window.history.pushState({}, "", `#${page}`);

      // Remover clases anteriores de página
      document.body.classList.remove(
        "page-home",
        "page-servicios",
        "page-contacto",
        "page-productos"
      );
      // Agregar clase de página actual
      document.body.classList.add(`page-${page}`);

      // Cargar contenido de la página
      const response = await fetch(this.pages[page]);
      const html = await response.text();
      document.getElementById("main-content").innerHTML = html;

      // Inicializar módulos específicos de la página
      this.initPageModules(page);

      // Actualizar UI de autenticación después de cargar la página
      if (window.authManager) {
        window.authManager.updateAuthUI();
      }
    } catch (error) {
      console.error(`Error loading page ${page}:`, error);
    }
  }

  setupNavigation() {
    // Remover event listeners existentes para evitar duplicados
    document.removeEventListener("click", this.boundHandleNavigation);
    window.removeEventListener("popstate", this.boundHandlePopState);

    // Crear versiones bindeadas de los manejadores
    this.boundHandleNavigation = this.handleNavigation.bind(this);
    this.boundHandlePopState = this.handlePopState.bind(this);

    // Manejar clics en enlaces de navegación
    document.addEventListener("click", this.boundHandleNavigation);

    // Manejar el botón de retroceso/avance del navegador
    window.addEventListener("popstate", this.boundHandlePopState);
  }

  handleNavigation(e) {
    if (e.target.matches("[data-spa-link]")) {
      e.preventDefault();
      const page = e.target.getAttribute("data-spa-link");
      this.navigateTo(page);
    }
  }

  handlePopState() {
    const page = window.location.hash.substring(1) || "home";
    this.navigateTo(page);
  }

  initNavbar() {
    // Añadir clases para los items de autenticación
    const authItems = document.querySelectorAll(".navbar-nav li:has(.btn)");
    authItems.forEach((item) => {
      item.classList.add("nav-auth-item");
    });

    // Navbar scroll behavior
    const navbar = document.querySelector(".navbar");
    if (navbar) {
      window.addEventListener("scroll", () => {
        if (window.scrollY > 50) {
          navbar.classList.add("scrolled");
        } else {
          navbar.classList.remove("scrolled");
        }
      });
    }
  }

  initAuth() {
    // Inicializar AuthManager después de que Firebase esté listo
    if (typeof AuthManager !== "undefined") {
      const checkFirebase = setInterval(() => {
        if (typeof firebase !== "undefined" && firebase.apps.length > 0) {
          clearInterval(checkFirebase);
          window.authManager = new AuthManager();
        }
      }, 100);
    }
  }

  initPageModules(page) {
    // Cargar e inicializar módulos específicos de cada página
    switch (page) {
      case "servicios":
        if (typeof ServiciosModule !== "undefined") {
          const serviciosModule = new ServiciosModule();
          serviciosModule.init();
        }
        break;
      case "contacto":
        if (typeof ContactoModule !== "undefined") {
          const contactoModule = new ContactoModule();
          contactoModule.init();
        }
        break;
    }
  }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  window.spaApp = new SpaApp();
});
