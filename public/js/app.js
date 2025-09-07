class SpaApp {
  constructor() {
    this.pages = {
      home: "pages/home.html",
      servicios: "pages/servicios.html",
      contacto: "pages/contacto.html",
    };

    this.init();
  }

  async init() {
    // Cargar componentes
    await this.loadComponent("navbar", "components/nav.html");
    await this.loadComponent("footer", "components/footer.html");
    await this.loadComponent("auth-modals", "components/auth-modals.html");

    // Configurar navegación
    this.setupNavigation();

    // Cargar página inicial
    this.navigateTo("home");
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

      // Cargar contenido de la página
      const response = await fetch(this.pages[page]);
      const html = await response.text();
      document.getElementById("main-content").innerHTML = html;

      // Inicializar módulos específicos de la página
      this.initPageModules(page);
    } catch (error) {
      console.error(`Error loading page ${page}:`, error);
    }
  }

  setupNavigation() {
    // Manejar clics en enlaces de navegación
    document.addEventListener("click", (e) => {
      if (e.target.matches("[data-spa-link]")) {
        e.preventDefault();
        const page = e.target.getAttribute("data-spa-link");
        this.navigateTo(page);
      }
    });

    // Manejar el botón de retroceso/avance del navegador
    window.addEventListener("popstate", () => {
      const page = window.location.hash.substring(1) || "home";
      this.navigateTo(page);
    });
  }

  initNavbar() {
    // Resaltar el enlace activo en la navegación
    const navLinks = document.querySelectorAll("[data-spa-link]");
    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        navLinks.forEach((l) => l.classList.remove("active"));
        link.classList.add("active");
      });
    });
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
  new SpaApp();
});
