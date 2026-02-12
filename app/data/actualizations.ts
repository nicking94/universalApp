import { db } from "@/app/database/db";

export type Actualization = {
  id: number;
  title: string;
  message: string;
  date?: string;
};

export const systemActualizations: Actualization[] = [
  // {
  //   id: 1,
  //   title: `Versión 1.4.1`,
  //   message:
  //     "- Agregado sistema de notificaciones.\n- Ordenadas alfabéticamente las tablas de clientes y proveedores\n- Los filtros de meses ahora se actualizan automáticamente acorde al mes actual.\n- Corrección de errores.\n- Mejoras en el rendimiento.",
  //   date: new Date().toISOString(),
  // },
  // {
  //   id: 2,
  //   title: `Versión 1.4.2`,
  //   message:
  //     "- Agregado nuevo selector de filtros y ordenamiento en la sección de productos\n- Corrección de errores.",
  //   date: new Date().toISOString(),
  // },
  // {
  //   id: 3,
  //   title: `Versión 1.4.3`,
  //   message:
  //     "- Cambiado el nombre de FIADOS a CUENTAS CORRIENTES\n- Agregado el campo TEMPORADA\n- Mejoras visuales.",
  //   date: new Date().toISOString(),
  // },
  // {
  //   id: 4,
  //   title: `Versión 1.4.4`,
  //   message: "- Se agregó el método de pago CHEQUE\n- Correciones varias.",
  //   date: new Date().toISOString(),
  // },
  // {
  //   id: 5,
  //   title: `Versión 1.4.5`,
  //   message:
  //     "- Se agregó la posibilidad de DEVOLVER productos y un historial de devoluciones. podés verlo en la sección de PRODUCTOS\n- Correciones visuales",
  //   date: new Date().toISOString(),
  // },
  // {
  //   id: 6,
  //   title: `Versión 1.4.6`,
  //   message:
  //     "Ya no se pueden crear, editar o eliminar productos desde TODOS LOS RUBROS. Solo servirá a modo de información para administrar los reportes de todos los rubros. si tu negocio solo gestiona un solo rubro, no se ve afectado por la actualizacion\n- Correciones visuales y mejoras varias",
  //   date: new Date().toISOString(),
  // },
  {
    id: 7,
    title: `FORMA PARTE DE NUESTRO PROGRAMA DE REFERIDOS`,
    message:
      "Si conoces a alguien que tenga un negocio, recomendá Universal App y por cada cliente que se sume te damos $15.000!\n- Consultá al soporte técnico para saber más... (Link en el menú del sistema)",
    date: new Date().toISOString(),
  },

  // {
  //   id: 9,
  //   title: `Versión 1.4.7 - Actualización`,
  //   message:
  //     "- Modificada la opción de talles en el rubro INDUMENTARIA. Ahora se pueden crear talles personalizados\n- Se arregló un error en el filtro de marca y color del rubro INDUMENTARIA\n- Mejoras en el rendimiento",
  //   date: new Date().toISOString(),
  // },
  // {
  //   id: 10,
  //   title: `Versión 1.4.9 - Actualización`,
  //   message:
  //     "- Agregada la opción de incluir o no el IVA en los precios al crear un producto.\n- Se aregó un campo de RECARGO a cada producto al hacer ventas",
  //   date: new Date().toISOString(),
  // },
  // {
  //   id: 11,
  //   title: `Versión 1.5 - Mejoras`,
  //   message:
  //     "- Ahora podes seleccionar un cliente en las ventas. Así podrás ver su historial de compras desde el módulo de CLIENTES. Se agregaron también nuevos campos al registrar a un cliente (cuit/dni, email y dirección)\n- Mejoras en las etiquetas de códigos de barras. Agregado un selector para poder quitar el precio del producto en la etiqueta",
  //   date: new Date().toISOString(),
  // },
  // {
  //   id: 12,
  //   title: `Versión 1.5.1 - Actualización`,
  //   message:
  //     "- Ahora podés exportar en PDF las cuentas corrientes de cada cliente, Además podrás generar reportes individuales con el detalle completo de ventas, pagos y saldos pendientes\n- 📊 Agregada la opción de STOCK MINIMO por producto. Cuando el stock esté por debajo del nivel mínimo, verás una alerta visual en la tabla de productos para reponer a tiempo",
  //   date: new Date().toISOString(),
  // },
  // {
  //   id: 13,
  //   title: `Versión 1.5.2 - Mejoras`,
  //   message:
  //     "- Ahora podés agregar un concepto a la venta y visualizarlo en el listado de ventas. Mejoras en el rendimiento",
  //   date: new Date().toISOString(),
  // },
  // {
  //   id: 13,
  //   title: `Versión 1.5.3 - Actualización`,
  //   message:
  //     "- Agregado el módulo para crear promociones\n-Agregada la actualización automática cuando hay una nueva versión de la aplicación disponible\n- Mejoras visuales y en el rendimiento",
  //   date: new Date().toISOString(),
  // },
  // {
  //   id: 14,
  //   title: `Versión 1.5.4 - Actualización`,
  //   message:
  //     "- ¡Mejoramos el diseño de la aplicación para una mejor experiencia de usuario!\n- Nuevas funcionalidades:\n Calcular el vuelto automaticamente\n Mostrar la hora en la tabla de los detalles del dia en la caja diaria\n- Mejoras el rendimiento",
  //   date: new Date().toISOString(),
  // },
  // {
  //   id: 15,
  //   title: `Versión 1.5.5 - Actualización`,
  //   message:
  //     "- Añadimos el módulo de ACTUALIZACIÓN DE PRECIOS. Ahora vas a poder actualizar los precios de tus productos de una forma mucho mas ágil y rápida ahorrandote tiempo y esfuerzo\n- Añadimos un módulo de LISTAS DE PRECIOS en las que vas a poder crear listas, asignarle el precio a cada producto en cada lista, y usar esas listas a la hora de hacer una venta\n- Añadimos la opcion de importar Excel de productos para cargar productos por primera vez a traves de archivos Excel\n- Nueva funcionalidad:\n Edición de venta en la caja diaria actual. Si por algún motivo necesitas editar la venta, ahora podés hacerlo. Se modificará automáticamente el stock, y los cálculos en la caja diaria",
  //   date: new Date().toISOString(),
  // },
  // {
  //   id: 16,
  //   title: `Versión 1.5.6 - Actualización`,
  //   message:
  //     "¡Terminamos el año con una nueva actualización!\n\n- Añadimos el método de pago CRÉDITO EN CUOTAS y su respectivo módulo de CRÉDITOS para que puedas gestionar cada cuota.\n- Movimos cuentas corrientes a un nuevo módulo llamado COBRANZAS donde encontrarás tambien los créditos\n- ¡Hacemos mas fácil el respaldo de tus datos! Ahora cada vez que cierres la caja diaria, se te preguntará si deseas hacer una copia de seguridad. Recomendamos una copia diaria\n- mejoras en el rendimiento y corrección de errores",
  //   date: new Date().toISOString(),
  // },
  // {
  //   id: 17,
  //   title: `Versión 1.5.7 - Mejora`,
  //   message:
  //     "¡¿Calculas el precio de venta de un producto manualmente?!\n\n- Añadimos el campo PORCENTAJE DE GANANCIA al crear o editar un producto. Ahora solo tendrás que ingresar el costo y el porcentaje de ganancia deseado, y el sistema calculará automáticamente el precio de venta",
  //   date: new Date().toISOString(),
  // },
    {
    id: 18,
    title: `Versión 1.5.8 - Mejora`,
    message:
      "- Añadimos la funcionalidad de eliminar movimientos en la caja diaria\n- Añadimos el número de la venta en la tabla de ventas para identificarlas de mejor forma\n- Agrandamos el tamaño de la fuente en el ticket de venta para mejor legibilidad",
    date: new Date().toISOString(),
  },
];

export const getUnshownActualizations = async (): Promise<Actualization[]> => {
  const [existingNotifications, deletedActualizations] = await Promise.all([
    db.notifications.where("type").equals("system").toArray(),
    db.deletedActualizations.toArray(),
  ]);

  const shownIds = existingNotifications.map((n) => n.actualizationId || 0);
  const deletedIds = deletedActualizations.map((d) => d.actualizationId);

  return systemActualizations.filter(
    (actualization) =>
      !shownIds.includes(actualization.id) &&
      !deletedIds.includes(actualization.id),
  );
};
