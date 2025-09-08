class ServiciosModule {
  constructor() {
    this.db = firebase.firestore();
    this.currentFilter = "Todos"; // ← Guardar el filtro actual
  }

  async init() {
    this.addFilterListeners(); // ← Agregamos los listeners a los botones
    await this.loadServices(); // ← Carga todos al principio
  }

  addFilterListeners() {
    const buttons = document.querySelectorAll(".filter-btn");
    const self = this; // ← Guardar referencia al contexto actual

    buttons.forEach((btn) => {
      btn.addEventListener("click", function () {
        // Remover la clase active de todos los botones
        buttons.forEach((button) => button.classList.remove("active"));

        // Agregar la clase active al botón clickeado
        this.classList.add("active");

        const category = this.getAttribute("data-category");
        self.currentFilter = category;
        self.loadServices(category);
      });
    });
  }

  // Función para formatear números con separador de miles
  formatPrice(price) {
    const num = Number(price);
    if (isNaN(num)) return price;

    const formatter = new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: true,
    });

    return formatter.format(num);
  }

  async loadServices(filterCategory = "Todos") {
    try {
      const servicesContainer = document.getElementById("services-container");
      const template = document.getElementById("service-card-template");

      // Mostrar loader personalizado
      servicesContainer.innerHTML = `
        <div class="col-12 text-center">
          <div class="custom-loader"></div>
          <p class="loader-text">Cargando servicios...</p>
        </div>
      `;

      const snapshot = await this.db.collection("services").get();

      servicesContainer.innerHTML = "";

      if (snapshot.empty) {
        servicesContainer.innerHTML = `
          <div class="col-12 text-center">
            <p>No hay servicios disponibles en este momento.</p>
          </div>
        `;
        return;
      }

      let hasResults = false;
      let cardIndex = 0;

      // Primero recolectamos todos los servicios que cumplen el filtro
      const filteredServices = [];
      snapshot.forEach((doc) => {
        const service = doc.data();
        service.id = doc.id;

        // Mostrar solo los activos
        if (!service.active) return;

        // Filtrar por categoría si se seleccionó una distinta de "Todos"
        if (
          filterCategory !== "Todos" &&
          service.category?.toLowerCase() !== filterCategory.toLowerCase()
        ) {
          return;
        }

        filteredServices.push(service);
      });

      // Ahora creamos las cards con delays escalonados
      filteredServices.forEach((service, index) => {
        const card = template.content.cloneNode(true);

        // Corregir la ruta de la imagen si contiene '../'
        let imageUrl = service.imageUrl || "assets/img/default-service.webp";
        if (imageUrl.startsWith("../")) {
          imageUrl = imageUrl.substring(3);
        }

        // Imagen
        card.getElementById("service-image").src = imageUrl;
        card.getElementById("service-image").alt = service.title;

        // Título y descripción
        card.getElementById("service-title").textContent =
          service.title || "Sin título";
        card.getElementById("service-description").textContent =
          service.description || "";

        // Duración
        card.getElementById(
          "service-duration"
        ).textContent = `Duración: ${service.duration} minutos`;

        // Precio formateado con separador de miles
        const formattedPrice = this.formatPrice(service.price);
        card.getElementById("service-price").textContent = `$${formattedPrice}`;

        // Añadir evento al botón de reservar
        const reservarBtn = card.querySelector(".btn-reservar");
        reservarBtn.addEventListener("click", () => {
          console.log("Reservar servicio:", service.title);
        });

        // Aplicar delay escalonado para la animación
        const cardElement = card.querySelector(".service-card");
        cardElement.style.animationDelay = `${index * 0.1}s`;

        servicesContainer.appendChild(card);
        hasResults = true;
      });

      if (!hasResults) {
        servicesContainer.innerHTML = `
          <div class="col-12 text-center">
            <p>No hay servicios disponibles para esta categoría.</p>
          </div>
        `;
      }
    } catch (error) {
      console.error("Error loading services:", error);
      document.getElementById("services-container").innerHTML = `
        <div class="col-12 text-center">
          <p class="text-danger">Error al cargar los servicios. Por favor, intenta nuevamente.</p>
        </div>
      `;
    }
  }
}
