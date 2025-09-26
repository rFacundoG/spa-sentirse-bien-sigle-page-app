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
      productos: "pages/productos.html",
      perfil: "pages/perfil.html",
      reservas: "pages/reservas.html",
      admin: "pages/admin.html",
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

    // Inicializar auth manager (mostrará el skeleton automáticamente)
    this.initAuth();

    // Cargar página basada en la URL actual, no siempre home
    this.loadCurrentPage();
  }

  // función para cargar la página actual basada en la URL
  loadCurrentPage() {
    const hash = window.location.hash.substring(1);
    const validPages = Object.keys(this.pages);

    // Si la página en el hash es válida, cargarla, sino cargar home
    if (hash && validPages.includes(hash)) {
      this.navigateTo(hash);
    } else {
      this.navigateTo("home");
    }
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
      // Si la página no existe, redirigir a home
      this.navigateTo("home");
      return;
    }

    try {
      // Actualizar URL solo si es diferente a la actual
      const currentHash = window.location.hash.substring(1);
      if (currentHash !== page) {
        window.history.pushState({ page }, "", `#${page}`);
      }

      // Remover clases anteriores de página
      document.body.classList.remove(
        "page-home",
        "page-servicios",
        "page-contacto",
        "page-productos",
        "page-perfil",
        "page-reservas",
        "page-admin"
      );

      // Agregar clase de página actual
      document.body.classList.add(`page-${page}`);

      // Cargar contenido de la página
      const response = await fetch(this.pages[page]);

      // Verificar si la página existe
      if (!response.ok) {
        throw new Error(`Página no encontrada: ${this.pages[page]}`);
      }

      const html = await response.text();
      document.getElementById("main-content").innerHTML = html;

      // Inicializar módulos específicos de la página
      this.initPageModules(page);

      // Actualizar UI de autenticación después de cargar la página
      if (window.authManager && window.authManager.updateAuthUI) {
        window.authManager.updateAuthUI();
      }

      // Scroll to top cuando se cambia de página
      window.scrollTo(0, 0);
    } catch (error) {
      console.error(`Error loading page ${page}:`, error);
      // Si hay error, redirigir a home
      this.showErrorPage();
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
    // Cuando se usa el botón atrás/adelante, cargar la página desde la URL
    this.loadCurrentPage();
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
      case "perfil":
        if (typeof PerfilModule !== "undefined") {
          // Verificar autenticación antes de inicializar perfil
          if (window.authManager && window.authManager.currentUser) {
            const perfilModule = new PerfilModule();
            perfilModule.init();
          } else {
            // Si no está autenticado, redirigir a home
            setTimeout(() => {
              this.navigateTo("home");
            }, 100);
          }
        }
        break;
      case "admin":
        if (typeof AdminModule !== "undefined") {
          const adminModule = new AdminModule();
          adminModule.init();
        }
        break;
    }
  }

  // Función para mostrar página de error
  showErrorPage() {
    const mainContent = document.getElementById("main-content");
    if (mainContent) {
      mainContent.innerHTML = `
      <div class="container mt-5 pt-5">
        <div class="row justify-content-center">
          <div class="col-md-6 text-center">
            <h1>¡Ups! Algo salió mal</h1>
            <p>La página que buscas no está disponible en este momento.</p>
            <a href="#" class="btn btn-primary" data-spa-link="home">Volver al Inicio</a>
          </div>
        </div>
      </div>
    `;
    }
  }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  window.spaApp = new SpaApp();
});
