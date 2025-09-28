class AdminModule {
  constructor() {
    this.currentUser = null;
    this.db = firebase.firestore();
    this.auth = firebase.auth();
    this.currentFilter = "all";
  }

  async init() {
    this.currentUser = this.auth.currentUser;

    // Verificar si es administrador
    const isAdmin = await this.checkAdminRol();
    if (!isAdmin) {
      this.showToast("No tienes permisos de administrador", "warning");
      window.location.hash = "home";
      return;
    }

    this.setupEventListeners();
    await this.loadAdminStats();
    await this.loadProfessionals();
    await this.loadUsers();
  }

  async checkAdminRol() {
    try {
      const userDoc = await this.db
        .collection("users")
        .doc(this.currentUser.uid)
        .get();
      return userDoc.exists && userDoc.data().rol === "admin";
    } catch (error) {
      console.error("Error checking admin rol:", error);
      return false;
    }
  }

  setupEventListeners() {
    // Filtros de usuarios
    document.querySelectorAll(".filter-users").forEach((filter) => {
      filter.addEventListener("click", (e) => {
        e.preventDefault();
        this.currentFilter = e.target.getAttribute("data-filter");
        this.loadUsers();
      });
    });

    // Guardar profesional
    document
      .getElementById("save-professional")
      .addEventListener("click", () => {
        this.saveProfessional();
      });

    // Actualizar usuario
    document.getElementById("update-user").addEventListener("click", () => {
      this.updateUser();
    });

    // Los event listeners para editar/eliminar se agregan dinámicamente
  }

  async loadAdminStats() {
    try {
      // Obtener estadísticas - CORREGIDO
      const usersSnapshot = await this.db.collection("users").get();
      const professionalsSnapshot = await this.db
        .collection("professionals")
        .get();

      document.getElementById(
        "admin-stats"
      ).textContent = `${usersSnapshot.size} usuarios | ${professionalsSnapshot.size} profesionales`;
    } catch (error) {
      console.error("Error loading admin stats:", error);
    }
  }

  async loadProfessionals() {
    try {
      const professionalsSnapshot = await this.db
        .collection("professionals")
        .get();
      const tbody = document.getElementById("professionals-table-body");

      if (professionalsSnapshot.empty) {
        tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center py-4 text-muted">
                            No hay profesionales registrados
                        </td>
                    </tr>
                `;
        return;
      }

      let html = "";
      professionalsSnapshot.forEach((doc) => {
        const professional = doc.data();
        html += `
                    <tr>
                        <td>${professional.nombre} ${professional.apellido}</td>
                        <td>${professional.especialidad}</td>
                        <td>${professional.email}</td>
                        <td>${professional.telefono || "N/A"}</td>
                        <td>
                            <span class="badge bg-success">Activo</span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary me-1 edit-professional" 
                                    data-id="${doc.id}">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-professional" 
                                    data-id="${doc.id}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
      });

      tbody.innerHTML = html;

      // Agregar event listeners a los botones
      this.addProfessionalEventListeners();
    } catch (error) {
      console.error("Error loading professionals:", error);
      this.showToast("Error al cargar profesionales", "danger");
    }
  }

  async loadUsers() {
    try {
      let usersQuery = this.db.collection("users");

      // Aplicar filtro si es necesario - CORREGIDO
      if (this.currentFilter !== "all") {
        // Si necesitas filtrar por algún campo específico, ajusta aquí
        // Por ejemplo, si quieres filtrar por tipo de usuario:
        usersQuery = usersQuery.where("rol", "==", this.currentFilter);
      }

      const usersSnapshot = await usersQuery.get();
      const tbody = document.getElementById("users-table-body");

      if (usersSnapshot.empty) {
        tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-4 text-muted">
            No hay usuarios registrados
          </td>
        </tr>
      `;
        return;
      }

      let html = "";
      usersSnapshot.forEach((doc) => {
        const user = doc.data();
        const date = user.fechaCreacion
          ? user.fechaCreacion.toDate().toLocaleDateString()
          : "N/A";

        // Verificar si el usuario tiene rol, si no, asignar uno por defecto
        const userRole = user.rol || "user";

        html += `
        <tr>
          <td>${user.nombre || "N/A"} ${user.apellido || ""}</td>
          <td>${user.email}</td>
          <td>
            <span class="badge ${
              userRole === "admin" ? "bg-danger" : "bg-primary"
            }">
              ${userRole === "admin" ? "Administrador" : "Usuario"}
            </span>
          </td>
          <td>${date}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1 edit-user" 
                    data-id="${doc.id}">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger delete-user" 
                    data-id="${doc.id}">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
      });

      tbody.innerHTML = html;
      this.addUserEventListeners();
    } catch (error) {
      console.error("Error loading users:", error);
      this.showToast("Error al cargar usuarios", "danger");
    }
  }

  addProfessionalEventListeners() {
    document.querySelectorAll(".edit-professional").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const professionalId = e.target
          .closest("button")
          .getAttribute("data-id");
        this.editProfessional(professionalId);
      });
    });

    document.querySelectorAll(".delete-professional").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const professionalId = e.target
          .closest("button")
          .getAttribute("data-id");
        this.deleteProfessional(professionalId);
      });
    });
  }

  addUserEventListeners() {
    document.querySelectorAll(".edit-user").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const userId = e.target.closest("button").getAttribute("data-id");
        this.editUser(userId);
      });
    });

    document.querySelectorAll(".delete-user").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const userId = e.target.closest("button").getAttribute("data-id");
        this.deleteUser(userId);
      });
    });
  }

  async saveProfessional() {
    try {
      const professionalData = {
        nombre: document.getElementById("pro-nombre").value,
        apellido: document.getElementById("pro-apellido").value,
        especialidad: document.getElementById("pro-especialidad").value,
        email: document.getElementById("pro-email").value,
        telefono: document.getElementById("pro-telefono").value,
        rol: "professional",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      // 1. Crear usuario usando la REST API para no afectar la sesión actual
      const API_KEY = "AIzaSyCWwxt3l9j8gnU_-mByHDb9_PWEKx5OZGk"; // Tu API key
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: professionalData.email,
            password: "Password123", // Contraseña temporal
            returnSecureToken: true,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error.message);
      }

      const userId = result.localId;

      // 2. Guardar profesional en Firestore
      await this.db
        .collection("professionals")
        .doc(userId)
        .set(professionalData);

      // 3. Crear documento en la colección users
      await this.db.collection("users").doc(userId).set({
        nombre: professionalData.nombre,
        apellido: professionalData.apellido,
        email: professionalData.email,
        telefono: professionalData.telefono,
        rol: "professional",
        fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
      });

      // Cerrar modal y limpiar formulario
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("addProfessionalModal")
      );
      modal.hide();
      document.getElementById("add-professional-form").reset();

      this.showToast(
        "Profesional agregado correctamente. Contraseña temporal: Password123",
        "success"
      );
      await this.loadProfessionals();
    } catch (error) {
      console.error("Error saving professional:", error);
      this.showToast(
        "Error al agregar profesional: " + error.message,
        "danger"
      );
    }
  }

  async editUser(userId) {
    try {
      const userDoc = await this.db.collection("users").doc(userId).get();
      const userData = userDoc.data();

      document.getElementById("edit-user-id").value = userId;
      document.getElementById("edit-user-nombre").value = userData.nombre || "";
      document.getElementById("edit-user-email").value = userData.email;
      document.getElementById("edit-user-rol").value = userData.rol || "user";

      const modal = new bootstrap.Modal(
        document.getElementById("editUserModal")
      );
      modal.show();
    } catch (error) {
      console.error("Error loading user for edit:", error);
      this.showToast("Error al cargar usuario", "danger");
    }
  }

  async updateUser() {
    try {
      const userId = document.getElementById("edit-user-id").value;
      const userData = {
        nombre: document.getElementById("edit-user-nombre").value,
        email: document.getElementById("edit-user-email").value,
        rol: document.getElementById("edit-user-rol").value,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
      };

      await this.db.collection("users").doc(userId).update(userData);

      // Cerrar modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("editUserModal")
      );
      modal.hide();

      this.showToast("Usuario actualizado correctamente", "success");
      await this.loadUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      this.showToast("Error al actualizar usuario", "danger");
    }
  }

  async deleteProfessional(professionalId) {
    if (!confirm("¿Estás seguro de que quieres eliminar este profesional?")) {
      return;
    }

    try {
      await this.db.collection("professionals").doc(professionalId).delete();
      this.showToast("Profesional eliminado correctamente", "success");
      await this.loadProfessionals();
    } catch (error) {
      console.error("Error deleting professional:", error);
      this.showToast("Error al eliminar profesional", "danger");
    }
  }

  async deleteUser(userId) {
    if (!confirm("¿Estás seguro de que quieres eliminar este usuario?")) {
      return;
    }

    try {
      // Eliminar de Firestore
      await this.db.collection("users").doc(userId).delete();

      // Eliminar de Authentication (requiere permisos de admin)
      await this.auth.deleteUser(userId);

      this.showToast("Usuario eliminado correctamente", "success");
      await this.loadUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      this.showToast("Error al eliminar usuario: " + error.message, "danger");
    }
  }

  showToast(message, type = "info") {
    if (window.toastManager && typeof window.toastManager.show === "function") {
      window.toastManager.show(message, type);
    } else {
      // Fallback
      alert(`${type.toUpperCase()}: ${message}`);
    }
  }
}
