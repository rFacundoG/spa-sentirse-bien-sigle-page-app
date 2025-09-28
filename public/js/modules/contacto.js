// contacto-module.js
class ContactoModule {
  constructor() {
    this.db = null;
    this.initFirebase();
    this.handleFormSubmit = this.handleFormSubmit.bind(this); 
  }

  initFirebase() {
    if (typeof firebase !== "undefined" && firebase.apps.length > 0) {
      this.db = firebase.firestore();
    }
  }

  init() {
    console.log("Módulo de contacto inicializado");
    this.setupFormHandler();
  }

  setupFormHandler() {
    const contactForm = document.getElementById("contacto-form");

    if (contactForm) {
      // **SOLUCIÓN PRINCIPAL: Remover cualquier listener anterior y agregar nuevo**
      contactForm.removeEventListener("submit", this.handleFormSubmit);
      contactForm.addEventListener("submit", this.handleFormSubmit);

      // También prevenir el comportamiento por defecto directamente en el form
      contactForm.onsubmit = (e) => {
        e.preventDefault();
        return false;
      };
    } else {
      console.error('Formulario con id "contacto-form" no encontrado');
    }
  }

  async handleFormSubmit(e) {
    e.preventDefault();
    e.stopImmediatePropagation(); // **IMPORTANTE: Detener toda propagación**

    if (!this.db) {
      this.showToast("Error: Firebase no está disponible.", "error");
      return false;
    }

    const form = e.target;
    const formData = new FormData(form);

    const contacto = {
      nombre: formData.get("name") || "",
      email: formData.get("email") || "",
      telefono: formData.get("phone") || "",
      servicio: formData.get("service") || "",
      tipoConsulta: formData.get("consult-type") || "",
      mensaje: formData.get("message") || "",
      newsletter: formData.get("newsletter") ? true : false,
      atendido: false,
      fecha: firebase.firestore.FieldValue.serverTimestamp(),
    };

    // Validación
    if (
      !contacto.nombre.trim() ||
      !contacto.email.trim() ||
      !contacto.mensaje.trim()
    ) {
      this.showToast(
        "Completa los campos obligatorios: Nombre, Email y Mensaje.",
        "warning"
      );
      return false;
    }

    // Loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = 'Enviando... <i class="fas fa-spinner fa-spin"></i>';
    submitBtn.disabled = true;

    try {
      await this.db.collection("contactos").add(contacto);
      this.showToast("¡Mensaje enviado! Te contactaremos pronto.", "success");
      form.reset();
    } catch (error) {
      this.showToast("Error al enviar. Intenta nuevamente.", "error");
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }

    return false;
  }

  showToast(message, type = "info") {
    if (window.toastManager && typeof window.toastManager.show === "function") {
      window.toastManager.show(message, type);
    } else {
      // Fallback simple sin alert que cause problemas
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }

  destroy() {
    const contactForm = document.getElementById("contacto-form");
    if (contactForm) {
      contactForm.removeEventListener("submit", this.handleFormSubmit);
    }
  }
}
