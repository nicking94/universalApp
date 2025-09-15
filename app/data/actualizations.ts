import { db } from "../database/db";

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
  {
    id: 10,
    title: `Versión 1.4.9 - Actualización`,
    message:
      "- Agregada la opción de incluir o no el IVA en los precios al crear un producto.\n- Se aregó un campo de RECARGO a cada producto al hacer ventas",
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
      !deletedIds.includes(actualization.id)
  );
};
