export type Theme = {
  id: number;
  value: string;
};

export type User = {
  id: number;
  username?: string;
  password?: string;
  logo?: string;
};

export type AuthData = {
  username: string;
  password: string;
};
export type SortField =
  | "name"
  | "expiration"
  | "stock"
  | "costPrice"
  | "price"
  | "category"
  | "brand"
  | "size"
  | "color"
  | "location";

export type SortDirection = "asc" | "desc";

export type ButtonProps = {
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode;
  px?: string;
  py?: string;
  width?: string;
  minwidth?: string;
  height?: string;
  text?: string;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  type?: "button" | "submit" | "reset";
  colorText?: string;
  colorBg?: string;
  colorBgHover?: string;
  colorTextHover?: string;
  disabled?: boolean;
  hotkey?: string;
  title?: string;
};

export type NavbarProps = {
  theme: string;
  handleTheme: () => void;
  handleCloseSession: () => void;
};
export type SidebarProps = {
  items?: Array<{
    label: string;
    href: string;
    icon?: React.ReactNode;
    target?: string;
  }>;
};
export type MenuItemProps = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};
export type SidebarContextProps = {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
};
export type NotificationProps = {
  isOpen: boolean;
  message: string;
  type: "success" | "error" | "info";
};

export type ModalProps = {
  onConfirm?: () => void;
  onClose: () => void;
  isOpen: boolean;
  title?: string;
  children?: React.ReactNode;
  bgColor?: string;
  buttons?: React.ReactNode;
  minheight?: string;
};

export type InputProps = {
  width?: string;
  label?: string;
  colorLabel?: string;
  type?: string;
  name?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  border?: string;
  readOnly?: boolean;
  className?: string;
  accept?: string;
  ref?: React.Ref<HTMLInputElement>;
  autoFocus?: boolean;
  step?: string;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  required?: boolean;
  disabled?: boolean;
  textPosition?: string;
};
export type UserMenuProps = {
  theme: string;
  handleTheme: () => void;
  handleCloseSession: () => void;
};

export type ProductTableProps = {
  products: Product[];
  onAdd: (product: Product) => void;
  onDelete: (id: number) => void;
  onEdit: (product: Product) => void;
};
export type Rubro = "Todos los rubros" | "comercio" | "indumentaria" | "";

export type Product = {
  id: number;
  name: string;
  stock: number;
  costPrice: number;
  price: number;
  expiration?: string;
  quantity: number;
  unit:
    | "A"
    | "Bulto"
    | "Cajón"
    | "Caja"
    | "Ciento"
    | "Cm"
    | "Docena"
    | "Gr"
    | "Kg"
    | "L"
    | "M"
    | "M²"
    | "M³"
    | "Ml"
    | "Mm"
    | "Pulg"
    | "Ton"
    | "Unid."
    | "V"
    | "W";
  barcode?: string;
  description?: string;
  category?: string;
  brand?: string;
  color?: string;
  size?: string;
  rubro: Rubro;
  discount?: number;
  basePrice?: number;
  lot?: string;
  location?: string;
  customCategory?: string;
  customCategories?: {
    name: string;
    rubro: Rubro;
  }[];
  season?: string;
};
export type ProductDisplayInfo = {
  name: string;
  size?: string;
  color?: string;
  rubro?: Rubro;
  lot?: string;
};

export type UnitOption = {
  value: Product["unit"];
  label: string;
  convertible?: boolean;
};

export type ProductCardProps = {
  product: {
    id: number;
    name: string;
    description: string;
    price: number;
  };
  onDelete: (id: number) => void;
};
export type SearchBarProps = {
  onSearch: (query: string) => void;
};

export type Sale = {
  id: number;
  products: Product[];
  paymentMethods: PaymentSplit[];
  total: number;
  date: string;
  barcode?: string;
  manualAmount?: number;
  manualProfitPercentage?: number;
  credit?: boolean;
  paid?: boolean;
  customerName?: string;
  customerPhone?: string;
  customerId?: string;
  discount?: number;
  deposit?: number;
  fromBudget?: boolean;
  budgetId?: string;
  chequeInfo?: {
    amount: number;
    status: "pendiente" | "cobrado";
    date: string;
  };
};

export type SaleItem = {
  productId: number;
  productName: string;
  quantity: number;
  unit: Product["unit"];
  price: number;
  size?: string;
  color?: string;
  discount?: number;
  basePrice?: number;
  notes?: string;
  description?: string;
  rubro?: Rubro;
  fromBudget?: boolean;
  budgetId?: string;
};

export type PaginationProps = {
  text?: string;
  text2?: string;
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
};
export type Option = {
  value: string;
  label: string;
};

export type ProductOption = {
  value: number;
  label: string;
  product: Product;
  isDisabled?: boolean;
};

export type PaymentMethod =
  | "EFECTIVO"
  | "TRANSFERENCIA"
  | "TARJETA"
  | "CHEQUE"
  | "MIXTO";

export type PaymentSplit = {
  method: PaymentMethod;
  amount: number;
  isDeposit?: boolean;
  paymentMethod?: "EFECTIVO" | "TRANSFERENCIA" | "TARJETA" | "CHEQUE" | "MIXTO";
};

export type MovementType = "INGRESO" | "EGRESO";

export type DailyCashMovement = {
  id: number;
  isDeposit?: boolean;
  originalAmount?: number;
  isBudgetGroup?: boolean;
  subMovements?: DailyCashMovement[];
  method?: PaymentMethod;
  amount: number;
  manualAmount?: number;
  discount?: number;
  manualProfitPercentage?: number;
  description: string;
  type: "INGRESO" | "EGRESO";
  date: string;
  paymentMethod?: "EFECTIVO" | "TRANSFERENCIA" | "TARJETA" | "CHEQUE" | "MIXTO";
  productId?: number;
  productName?: string;
  costPrice?: number;
  sellPrice?: number;
  quantity?: number;
  profit?: number;
  rubro?: Rubro;
  unit?:
    | "Unid."
    | "Gr"
    | "Kg"
    | "Ml"
    | "L"
    | "Bulto"
    | "Caja"
    | "Cajón"
    | "Mm"
    | "Cm"
    | "M"
    | "M²"
    | "M³"
    | "Pulg"
    | "Docena"
    | "Ciento"
    | "Ton"
    | "V"
    | "A"
    | "W";
  isCreditPayment?: boolean;
  originalSaleId?: number;
  supplierId?: number;
  supplierName?: string;
  combinedPaymentMethods?: PaymentSplit[];
  items?: SaleItem[];
  size?: string;
  color?: string;
  manualProfit?: number;
  productsProfit?: number;
  profitPercentage?: number;
  budgetId?: string;
  fromBudget?: boolean;
};

export type DailyCash = {
  id: number;
  date: string;
  initialAmount: number;
  movements: DailyCashMovement[];
  closed: boolean;
  closingAmount?: number;
  closingDate?: string;
  closingDifference?: number;
  cashIncome?: number;
  cashExpense?: number;
  otherIncome?: number;
  totalIncome?: number;
  totalCashIncome?: number;
  totalExpense?: number;
  totalProfit?: number;
  comments?: string;
  openedBy?: string;
  closedBy?: string;
};

export interface CreditSale extends Sale {
  credit: boolean;
  customerName: string;
  customerPhone?: string;
  customerId?: string;
  paid?: boolean;
  chequeInfo?: {
    amount: number;
    status: "pendiente" | "cobrado";
    date: string;
  };
}
export type ProductReturn = {
  id: number;
  productId: number;
  productName: string;
  reason: string;
  date: string;
  stockAdded: number;
  amount: number;
  profit: number;
  rubro: Rubro;
};

export interface Payment {
  id: number;
  saleId: number;
  amount: number;
  date: string;
  saleDate: string;
  method: PaymentMethod;
  checkNumber?: string;
  checkDate?: string;
  checkBank?: string;
  checkStatus?: "pendiente" | "cobrado" | "rechazado";
  checkDescription?: string;
  customerId?: string;
  customerName?: string;
}
export type Customer = {
  id: string;
  name: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  rubro?: Rubro;
  notes?: string;
  isTemporary?: boolean;
};

export type SupplierContact = {
  name: string;
  phone?: string;
};

export type Supplier = {
  id: number;
  companyName: string;
  contacts: SupplierContact[];
  lastVisit?: string;
  nextVisit?: string;
  createdAt: string;
  updatedAt: string;
  productIds?: number[];
  rubro?: Rubro;
};
export type SupplierProduct = {
  supplierId: number;
  productId: number;
};
export type DatepickerProps = {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  error?: string | null;
  isClearable?: boolean;
  label?: string;
  placeholderText?: string;
};
export type TicketProps = {
  items: { nombre: string; cantidad: number; precio: number; unit?: string }[];
  total: number;
  fecha: string;
  paymentMethods?: { method: string; amount: number }[];
  isCredit?: boolean;
};
export type ProductFilter = {
  field: keyof Product;
  value: string | number;
};

export type ProductFilters = ProductFilter[];

export type SortConfig = {
  field: keyof Product;
  direction: "asc" | "desc";
};
export type CategoryOption = {
  value: {
    name: string;
    rubro: Rubro;
    isLegacy?: boolean;
  };
  label: string;
};
export type CustomCategory = {
  id?: number;
  name: string;
  rubro: Rubro;
};
export type GlobalCategory = {
  name: string;
  rubro: Rubro;
};

export type ClothingSizeOption = {
  value: string;
  label: string;
};
export type NotificationType = {
  id?: number;
  title: string;
  message: string;
  date?: string;
  read: number;
  type?: "system" | "update" | "alert" | "message";
  link?: string;
  version?: string;
  actualizationId?: number;
  isDeleted?: boolean;
};

export type GroupedOption = {
  label: string;
  options: ClothingSizeOption & {
    groupType: string;
  };
};
export type FilterOption = {
  value: string;
  label: string;
  groupType: keyof ProductFilters;
  name?: string;
  rubro?: Rubro;
};

export type GroupedFilterOption = {
  label: string;
  options: FilterOption[];
};
export type MonthOption = {
  value: number;
  label: string;
};

export interface SerialPortRequestOptions {
  filters: SerialPortFilter[];
}

export interface SerialPortFilter {
  usbVendorId?: number;
  usbProductId?: number;
}

export interface SerialPort {
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
  open: (options: SerialOptions) => Promise<void>;
  close: () => Promise<void>;
}

export interface SerialOptions {
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: string;
  bufferSize?: number;
  flowControl?: string;
}
export interface BusinessData {
  id?: number;
  name: string;
  address: string;
  phone: string;
  cuit: string;
}

export type UserPreferences = {
  id?: number;
  userId?: number;
  acceptedTerms: boolean;
  acceptedTermsDate?: string;
  itemsPerPage?: number;
};
export type DailyData = {
  date: string;
  ingresos: number;
  egresos: number;
  ganancia: number;
};

export type MonthlyData = {
  month: string;
  ingresos: number;
  egresos: number;
  ganancia: number;
};

export interface Note {
  id?: number;
  customerId?: string;
  budgetId?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}
export interface CustomerNotesProps {
  customerName: string;
  customerId: string | null;
  isOpen: boolean;
  onClose: () => void;
}
export type Budget = {
  id: string;
  date: string;
  name?: string;
  customerName: string;
  customerPhone?: string;
  customerId?: string;
  items: SaleItem[];
  total: number;
  deposit: string;
  remaining: number;
  createdAt: string;
  updatedAt: string;
  expirationDate?: string;
  notes?: string;
  status?: "pendiente" | "aprobado" | "rechazado" | "cobrado";
  rubro?: Rubro;
  convertedToSale?: boolean;
};
export type ChequeFilter = "todos" | "pendiente" | "cobrado";
