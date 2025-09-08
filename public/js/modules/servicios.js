class ServiciosModule {
  constructor() {
    this.db = firebase.firestore();
  }

  async init() {
    this.addFilterListeners(); // ← Agregamos los listeners a los botones
    await this.loadServices(); // ← Carga todos al principio
  }

  addFilterListeners() {
    const buttons = document.querySelectorAll(".filter-btn");

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const category = btn.getAttribute("data-category");
        this.loadServices(category);
      });
    });
  }

  async loadServices(filterCategory = "Todos") {
    try {
      const servicesContainer = document.getElementById("services-container");
      const template = document.getElementById("service-card-template");

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

      snapshot.forEach((doc) => {
        const service = doc.data();

        // Mostrar solo los activos
        if (!service.active) return;

        // Filtrar por categoría si se seleccionó una distinta de "Todos"
        if (
          filterCategory !== "Todos" &&
          service.category?.toLowerCase() !== filterCategory.toLowerCase()
        ) {
          return;
        }

        const card = template.content.cloneNode(true);

        // Corregir la ruta de la imagen si contiene '../'
        let imageUrl = service.imageUrl || "assets/img/default-service.webp";
        if (imageUrl.startsWith("../")) {
          imageUrl = imageUrl.substring(3); // Elimina los tres caracteres '../'
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

        // Precio
        card.getElementById("service-price").textContent = `$${service.price}`;

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
