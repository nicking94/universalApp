const TermsAndConditionsPage = () => {
  return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen">
      <main className="overflow-y-auto max-h-[93vh]">
        <div className="bg-white italic dark:bg-gray-800 rounded-lg shadow-lg p-6 prose dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold mb-6 text-center text-blue_b underline">
            Términos y Condiciones
          </h1>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-blue_b">
              1. Introducción
            </h2>
            <p>
              Bienvenido/a a nuestra plataforma de gestión para negocios. Al
              utilizar este software, usted acepta cumplir con estos Términos y
              Condiciones, que regulan el uso del servicio, funcionalidades,
              datos y soporte brindado. Si no está de acuerdo con alguna parte,
              le solicitamos no continuar utilizando el sistema.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-blue_b">
              2. Uso del Servicio
            </h2>
            <p>
              El software está destinado exclusivamente a fines comerciales
              legítimos, como la gestión de ventas, inventario, caja, clientes y
              otros recursos del negocio. Está prohibido el uso indebido,
              fraudulento o que vulnere derechos de terceros o leyes locales.
              Nos reservamos el derecho de suspender cuentas ante usos
              indebidos.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-blue_b">
              3. Registro y Seguridad
            </h2>
            <p>
              Para acceder a todas las funciones del sistema, el usuario deberá
              crear una cuenta con información verdadera y actualizada. Usted es
              responsable de proteger su contraseña y credenciales. No nos
              responsabilizamos por accesos no autorizados derivados de
              negligencia en el manejo de su cuenta.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-blue_b">
              4. Propiedad Intelectual
            </h2>
            <p>
              El software, su código fuente, diseño, funciones y documentación
              son propiedad exclusiva del desarrollador. Está prohibida su
              copia, distribución, modificación o uso para crear productos
              derivados sin autorización previa por escrito.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-blue_b">
              5. Soporte y Actualizaciones
            </h2>
            <p>
              Brindamos soporte técnico a través de los canales indicados en el
              sitio web o dentro del sistema. Nos reservamos el derecho de
              actualizar o modificar funcionalidades del sistema sin previo
              aviso, con el fin de mejorar la experiencia del usuario o mantener
              la seguridad del servicio.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-blue_b">
              6. Privacidad y Datos
            </h2>
            <p>
              La información cargada por los usuarios (ventas, clientes,
              productos, etc.) es privada y no será compartida con terceros,
              salvo obligación legal.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-blue_b">
              7. Limitación de Responsabilidad
            </h2>
            <p>
              Si bien hacemos nuestro mejor esfuerzo para garantizar la
              disponibilidad y correcto funcionamiento del sistema, no nos
              responsabilizamos por pérdidas económicas, interrupciones del
              servicio, errores de software o mal uso por parte del usuario. El
              uso del sistema es bajo su propio riesgo.
            </p>
          </section>

          <section className="mb-8 ">
            <h2 className="text-xl font-semibold mb-4 text-blue_b">
              8. Modificaciones
            </h2>
            <p>
              Nos reservamos el derecho de actualizar estos Términos y
              Condiciones en cualquier momento. Los cambios serán notificados
              dentro del sistema o a través de los medios de contacto
              proporcionados. El uso continuo del software implica la aceptación
              de las modificaciones.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-blue_b">
              9. Contacto
            </h2>
            <p>
              Si tiene preguntas, sugerencias o necesita soporte, puede
              comunicarse a través de WhatsApp al{" "}
              <strong>+54 9 261 307 7147</strong> o por correo electrónico a{" "}
              <strong>universalweb94@gmail.com</strong>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default TermsAndConditionsPage;
