class ServiciosModule {
  constructor() {
    this.db = firebase.firestore();
  }

  async init() {
    await this.loadServices();
  }

  async loadServices() {
    try {
      const servicesContainer = document.getElementById("services-container");
      const template = document.getElementById("service-card-template");

      // Obtener servicios de Firestore
      const snapshot = await this.db.collection("services").get();

      // Limpiar contenedor
      servicesContainer.innerHTML = "";

      if (snapshot.empty) {
        servicesContainer.innerHTML = `
                    <div class="col-12 text-center">
                        <p>No hay servicios disponibles en este momento.</p>
                    </div>
                `;
        return;
      }

      // Generar cards para cada servicio
      snapshot.forEach((doc) => {
        const service = doc.data();
        const card = template.content.cloneNode(true);

        // Llenar el template con los datos del servicio
        card.getElementById("service-image").src =
          service.image || "assets/default-service.jpg";
        card.getElementById("service-image").alt = service.name;
        card.getElementById("service-name").textContent = service.name;
        card.getElementById("service-description").textContent =
          service.description;
        card.getElementById(
          "service-duration"
        ).textContent = `Duración: ${service.duration} minutos`;
        card.getElementById("service-price").textContent = `$${service.price}`;

        servicesContainer.appendChild(card);
      });
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
